from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    entra_tenant_id: str
    entra_api_client_id: str
    entra_required_scope: str

    @property
    def entra_issuer(self) -> str:
        return (
            "https://login.microsoftonline.com/"
            f"{self.entra_tenant_id}/v2.0"
        )

    @property
    def entra_oidc_configuration_url(self) -> str:
        return f"{self.entra_issuer}/.well-known/openid-configuration"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
