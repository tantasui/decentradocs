import httpx
from typing import Optional
from ..config import get_settings


class WalrusService:
    """Service for interacting with Walrus storage"""

    def __init__(self):
        self.settings = get_settings()
        self.publisher_url = self.settings.walrus_publisher_url
        self.aggregator_url = self.settings.walrus_aggregator_url
        self.epochs = self.settings.walrus_epochs

    async def upload_blob(self, content: bytes) -> dict:
        """
        Upload content to Walrus storage

        Args:
            content: File content as bytes

        Returns:
            dict with blob_id and other metadata
        """
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                # Upload to Walrus
                response = await client.put(
                    f"{self.publisher_url}/v1/blobs",
                    content=content,
                    params={"epochs": self.epochs},
                    headers={"Content-Type": "application/octet-stream"}
                )
                response.raise_for_status()
                result = response.json()

                # Handle different response formats
                if "newlyCreated" in result:
                    blob_data = result["newlyCreated"]["blobObject"]
                    return {
                        "blob_id": blob_data["blobId"],
                        "sui_ref_type": "newlyCreated",
                        "certified_epoch": blob_data.get("certifiedEpoch", 0)
                    }
                elif "alreadyCertified" in result:
                    blob_data = result["alreadyCertified"]["blobObject"]
                    return {
                        "blob_id": blob_data["blobId"],
                        "sui_ref_type": "alreadyCertified",
                        "certified_epoch": blob_data.get("certifiedEpoch", 0)
                    }
                else:
                    raise ValueError(f"Unexpected Walrus response format: {result}")

            except httpx.HTTPError as e:
                error_msg = str(e) if str(e) else f"HTTP {e.response.status_code if hasattr(e, 'response') and e.response else 'Unknown'}: {e.response.text if hasattr(e, 'response') and e.response else 'No response'}"
                raise Exception(f"Failed to upload to Walrus: {error_msg}")
            except Exception as e:
                raise Exception(f"Failed to upload to Walrus: {str(e) or type(e).__name__}")

    async def download_blob(self, blob_id: str) -> bytes:
        """
        Download content from Walrus storage

        Args:
            blob_id: The blob ID to download

        Returns:
            File content as bytes
        """
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.get(
                    f"{self.aggregator_url}/v1/blobs/{blob_id}"
                )
                response.raise_for_status()
                return response.content

            except httpx.HTTPError as e:
                raise Exception(f"Failed to download from Walrus: {str(e)}")

    async def check_blob_status(self, blob_id: str) -> dict:
        """
        Check if a blob exists and its status

        Args:
            blob_id: The blob ID to check

        Returns:
            dict with status information
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.head(
                    f"{self.aggregator_url}/v1/blobs/{blob_id}"
                )
                return {
                    "exists": response.status_code == 200,
                    "status_code": response.status_code
                }
            except httpx.HTTPError:
                return {
                    "exists": False,
                    "status_code": None
                }
