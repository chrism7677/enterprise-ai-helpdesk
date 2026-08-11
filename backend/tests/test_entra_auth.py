from collections.abc import AsyncGenerator, Mapping
from datetime import datetime, timedelta, timezone
from typing import Any

import pytest
import rsa
from httpx import AsyncClient
from jose import jwk, jwt

from app.auth.entra import (
    EntraOidcKeyProvider,
    EntraTokenValidator,
    InvalidAccessTokenError,
    get_entra_token_validator,
)
from app.main import app

pytestmark = pytest.mark.anyio

TENANT_ID = "35aec465-2e0e-4877-8f10-e8d341af772c"
API_CLIENT_ID = "aa87e07e-dda0-4fce-aed8-0a7a04eb253d"
REQUIRED_SCOPE = "access_as_user"
ISSUER = f"https://login.microsoftonline.com/{TENANT_ID}/v2.0"
KEY_ID = "test-signing-key"


class StaticKeyProvider:
    def __init__(self, signing_key: Mapping[str, Any]) -> None:
        self._signing_key = signing_key

    async def get_signing_key(self, kid: str) -> Mapping[str, Any]:
        if kid != KEY_ID:
            raise InvalidAccessTokenError
        return self._signing_key


@pytest.fixture(scope="module")
def signing_keys() -> tuple[bytes, dict[str, Any]]:
    public_key, private_key = rsa.newkeys(2048)
    public_jwk = jwk.construct(
        public_key.save_pkcs1(), algorithm="RS256"
    ).to_dict()
    public_jwk.update({"kid": KEY_ID, "use": "sig", "alg": "RS256"})
    return private_key.save_pkcs1(), public_jwk


@pytest.fixture
def token_validator(
    signing_keys: tuple[bytes, dict[str, Any]],
) -> EntraTokenValidator:
    _, public_jwk = signing_keys
    return EntraTokenValidator(
        tenant_id=TENANT_ID,
        api_client_id=API_CLIENT_ID,
        required_scope=REQUIRED_SCOPE,
        issuer=ISSUER,
        key_provider=StaticKeyProvider(public_jwk),
    )


@pytest.fixture
async def auth_client(
    client: AsyncClient,
    token_validator: EntraTokenValidator,
) -> AsyncGenerator[AsyncClient, None]:
    async def override_token_validator() -> EntraTokenValidator:
        return token_validator

    app.dependency_overrides[get_entra_token_validator] = (
        override_token_validator
    )
    yield client


def make_token(
    private_key: bytes,
    *,
    algorithm: str = "RS256",
    omit_scope_claim: bool = False,
    **claim_overrides: Any,
) -> str:
    now = datetime.now(timezone.utc)
    claims: dict[str, Any] = {
        "sub": "pairwise-subject-id",
        "oid": "11111111-2222-3333-4444-555555555555",
        "tid": TENANT_ID,
        "name": "Test User",
        "preferred_username": "test.user@example.com",
        "scp": "profile access_as_user tickets.read",
        "iss": ISSUER,
        "aud": API_CLIENT_ID,
        "iat": now,
        "nbf": now - timedelta(seconds=5),
        "exp": now + timedelta(minutes=5),
    }
    claims.update(claim_overrides)
    if omit_scope_claim:
        claims.pop("scp")
    return jwt.encode(
        claims,
        private_key,
        algorithm=algorithm,
        headers={"kid": KEY_ID},
    )


async def test_missing_bearer_token_returns_401(
    auth_client: AsyncClient,
) -> None:
    response = await auth_client.get("/auth/validate")

    assert response.status_code == 401
    assert response.json() == {
        "detail": "Authentication credentials are required"
    }
    assert response.headers["www-authenticate"] == "Bearer"


async def test_malformed_token_returns_401(auth_client: AsyncClient) -> None:
    response = await auth_client.get(
        "/auth/validate",
        headers={"Authorization": "Bearer not-a-jwt"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid authentication credentials"}


async def test_invalid_signature_returns_401(
    auth_client: AsyncClient,
) -> None:
    _, different_private_key = rsa.newkeys(2048)
    token = make_token(different_private_key.save_pkcs1())

    response = await auth_client.get(
        "/auth/validate",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid authentication credentials"}


async def test_disallowed_signing_algorithm_returns_401(
    auth_client: AsyncClient,
) -> None:
    token = make_token(
        b"test-only-hmac-secret-with-sufficient-length",
        algorithm="HS256",
    )

    response = await auth_client.get(
        "/auth/validate",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid authentication credentials"}


@pytest.mark.parametrize(
    "claim_overrides",
    [
        {"iss": "https://login.microsoftonline.com/wrong-tenant/v2.0"},
        {"aud": f"api://{API_CLIENT_ID}/access_as_user"},
        {"exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        {"nbf": datetime.now(timezone.utc) + timedelta(minutes=5)},
        {"tid": "00000000-0000-0000-0000-000000000000"},
    ],
    ids=[
        "wrong-issuer",
        "wrong-audience",
        "expired",
        "not-yet-valid",
        "wrong-tenant",
    ],
)
async def test_invalid_token_claims_return_401(
    auth_client: AsyncClient,
    signing_keys: tuple[bytes, dict[str, Any]],
    claim_overrides: dict[str, Any],
) -> None:
    private_key, _ = signing_keys
    token = make_token(private_key, **claim_overrides)

    response = await auth_client.get(
        "/auth/validate",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid authentication credentials"}


@pytest.mark.parametrize("omit_scope_claim", [False, True])
async def test_missing_required_scope_returns_403(
    auth_client: AsyncClient,
    signing_keys: tuple[bytes, dict[str, Any]],
    omit_scope_claim: bool,
) -> None:
    private_key, _ = signing_keys
    token = make_token(
        private_key,
        omit_scope_claim=omit_scope_claim,
        scp="profile tickets.read",
    )

    response = await auth_client.get(
        "/auth/validate",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "The access token does not grant the required scope"
    }


async def test_valid_token_returns_minimal_validated_identity(
    auth_client: AsyncClient,
    signing_keys: tuple[bytes, dict[str, Any]],
) -> None:
    private_key, _ = signing_keys
    token = make_token(private_key)

    response = await auth_client.get(
        "/auth/validate",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "sub": "pairwise-subject-id",
        "oid": "11111111-2222-3333-4444-555555555555",
        "tid": TENANT_ID,
    }


async def test_oidc_key_provider_uses_discovery_and_selects_key_by_kid(
    signing_keys: tuple[bytes, dict[str, Any]],
) -> None:
    _, public_jwk = signing_keys
    configuration_url = f"{ISSUER}/.well-known/openid-configuration"
    jwks_uri = "https://login.microsoftonline.com/test/discovery/v2.0/keys"
    requested_urls: list[str] = []

    async def fetch_json(url: str) -> Mapping[str, Any]:
        requested_urls.append(url)
        if url == configuration_url:
            return {"issuer": ISSUER, "jwks_uri": jwks_uri}
        if url == jwks_uri:
            return {"keys": [public_jwk]}
        raise AssertionError(f"Unexpected URL: {url}")

    provider = EntraOidcKeyProvider(
        configuration_url=configuration_url,
        expected_issuer=ISSUER,
        fetch_json=fetch_json,
    )

    assert await provider.get_signing_key(KEY_ID) == public_jwk
    assert await provider.get_signing_key(KEY_ID) == public_jwk
    assert requested_urls == [configuration_url, jwks_uri]
