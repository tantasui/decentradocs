import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Sui Configuration
    sui_package_id: str = os.getenv("SUI_PACKAGE_ID", "")
    sui_network: str = os.getenv("SUI_NETWORK", "testnet")
    sui_module_name: str = "registry"

    # Walrus Configuration
    walrus_publisher_url: str = os.getenv(
        "WALRUS_PUBLISHER_URL",
        "https://publisher-devnet.walrus.space"
    )
    walrus_aggregator_url: str = os.getenv(
        "WALRUS_AGGREGATOR_URL",
        "https://aggregator-devnet.walrus.space"
    )
    walrus_epochs: int = 5  # Number of epochs to store

    # OpenAI Configuration
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")

    # ChromaDB Configuration
    chroma_persist_directory: str = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")

    # Application Configuration
    app_name: str = "Decentralized RAG System"
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    cors_origins: list = ["http://localhost:3000", "http://localhost:3002", "http://localhost:5173"]

    # RAG Configuration
    chunk_size: int = 1000
    chunk_overlap: int = 200
    similarity_top_k: int = 5
    llm_temperature: float = 0.1

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
