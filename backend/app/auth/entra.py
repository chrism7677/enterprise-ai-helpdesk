from asyncio import Lock
from collections.abc import Awaitable, Callable, Mapping
from typing import Annotated, Any, Protocol

import httpx
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel, ValidationError

from app.core.config import settings

ALLOWED_SIGNING_ALGORITHMS = ("RS256",)


class InvalidAccessTokenError(Exception):
    """Raised when an access token cannot be authenticated."""


class InsufficientScopeError(Exception):
    """Raised when a valid token lacks the required delegated scope."""


class TokenValidationUnavailableError(Exception):
    """Raised when Entra metadata or signing keys cannot be obtained."""


class EntraTokenClaims(BaseModel):
    sub: str
    oid: str | None = None
    tid: str
    name: str | None = None
    preferred_username: str | None = None
    scp: str = ""

    @property
    def scopes(self) -> frozenset[str]:
        return frozenset(self.scp.split())


class SigningKeyProvider(Protocol):
    async def get_signing_key(self, kid: str) -> Mapping[str, Any]: ...


JsonFetcher = Callable[[str], Awaitable[Mapping[str, Any]]]


async def _fetch_json(url: str) -> Mapping[str, Any]:
    async with httpx.AsyncClient(
        timeout=5.0,
        follow_redirects=True,
    ) as client:
        response = await client.get(url)
        response.raise_for_status()
        payload = response.json()
    if not isinstance(payload, dict):
        raise ValueError("Expected a JSON object")
    return payload


class EntraOidcKeyProvider:
    """Loads and caches tenant signing keys through OIDC discovery."""

    def __init__(
        self,
        configuration_url: str,
        expected_issuer: str,
        fetch_json: JsonFetcher = _fetch_json,
    ) -> None:
        self._configuration_url = configuration_url
        self._expected_issuer = expected_issuer
        self._fetch_json = fetch_json
        self._jwks_uri: str | None = None
        self._keys: tuple[Mapping[str, Any], ...] | None = None
        self._lock = Lock()

    async def get_signing_key(self, kid: str) -> Mapping[str, Any]:
        try:
            async with self._lock:
                if self._jwks_uri is None:
                    await self._load_configuration()
                if self._keys is None:
                    await self._load_keys()

                key = self._find_key(kid)
                if key is None:
                    # Refresh once so Microsoft key rollover does not require a
                    # process restart.
                    await self._load_keys()
                    key = self._find_key(kid)
        except (httpx.HTTPError, TypeError, ValueError) as error:
            raise TokenValidationUnavailableError from error

        if key is None:
            raise InvalidAccessTokenError
        return key

    async def _load_configuration(self) -> None:
        metadata = await self._fetch_json(self._configuration_url)
        if metadata.get("issuer") != self._expected_issuer:
            raise ValueError("OIDC metadata returned an unexpected issuer")

        jwks_uri = metadata.get("jwks_uri")
        if not isinstance(jwks_uri, str) or not jwks_uri:
            raise ValueError("OIDC metadata did not include a JWKS URI")
        self._jwks_uri = jwks_uri

    async def _load_keys(self) -> None:
        if self._jwks_uri is None:
            raise ValueError("OIDC configuration has not been loaded")

        jwks = await self._fetch_json(self._jwks_uri)
        keys = jwks.get("keys")
        if not isinstance(keys, list):
            raise ValueError("JWKS did not include a key list")
        self._keys = tuple(key for key in keys if isinstance(key, dict))

    def _find_key(self, kid: str) -> Mapping[str, Any] | None:
        for key in self._keys or ():
            if (
                key.get("kid") == kid
                and key.get("kty") == "RSA"
                and key.get("use", "sig") == "sig"
                and key.get("alg", "RS256") == "RS256"
            ):
                return key
        return None


class EntraTokenValidator:
    def __init__(
        self,
        *,
        tenant_id: str,
        api_client_id: str,
        required_scope: str,
        issuer: str,
        key_provider: SigningKeyProvider,
    ) -> None:
        self._tenant_id = tenant_id
        self._api_client_id = api_client_id
        self._required_scope = required_scope
        self._issuer = issuer
        self._key_provider = key_provider

    async def validate_access_token(self, token: str) -> EntraTokenClaims:
        try:
            header = jwt.get_unverified_header(token)
            algorithm = header.get("alg")
            kid = header.get("kid")
            if algorithm not in ALLOWED_SIGNING_ALGORITHMS:
                raise InvalidAccessTokenError
            if not isinstance(kid, str) or not kid:
                raise InvalidAccessTokenError

            signing_key = await self._key_provider.get_signing_key(kid)
            decoded_claims = jwt.decode(
                token,
                signing_key,
                algorithms=list(ALLOWED_SIGNING_ALGORITHMS),
                audience=self._api_client_id,
                issuer=self._issuer,
                options={
                    "require_aud": True,
                    "require_exp": True,
                    "require_iss": True,
                },
            )
            claims = EntraTokenClaims.model_validate(decoded_claims)
        except TokenValidationUnavailableError:
            raise
        except (JWTError, ValidationError, InvalidAccessTokenError) as error:
            raise InvalidAccessTokenError from error

        if claims.tid != self._tenant_id:
            raise InvalidAccessTokenError
        if self._required_scope not in claims.scopes:
            raise InsufficientScopeError
        return claims


_key_provider = EntraOidcKeyProvider(
    configuration_url=settings.entra_oidc_configuration_url,
    expected_issuer=settings.entra_issuer,
)
_token_validator = EntraTokenValidator(
    tenant_id=settings.entra_tenant_id,
    api_client_id=settings.entra_api_client_id,
    required_scope=settings.entra_required_scope,
    issuer=settings.entra_issuer,
    key_provider=_key_provider,
)


async def get_entra_token_validator() -> EntraTokenValidator:
    return _token_validator


bearer_scheme = HTTPBearer(auto_error=False)
BearerCredentials = Annotated[
    HTTPAuthorizationCredentials | None,
    Security(bearer_scheme),
]
TokenValidator = Annotated[
    EntraTokenValidator,
    Depends(get_entra_token_validator),
]


async def get_validated_entra_claims(
    credentials: BearerCredentials,
    validator: TokenValidator,
) -> EntraTokenClaims:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials are required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        return await validator.validate_access_token(credentials.credentials)
    except InsufficientScopeError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The access token does not grant the required scope",
        ) from None
    except InvalidAccessTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    except TokenValidationUnavailableError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is temporarily unavailable",
        ) from None


ValidatedEntraClaims = Annotated[
    EntraTokenClaims,
    Depends(get_validated_entra_claims),
]
