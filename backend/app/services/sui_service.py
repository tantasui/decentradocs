from pysui import SyncClient, SuiConfig
from pysui.sui.sui_txn import SyncTransaction
from pysui.sui.sui_types.scalars import ObjectID, SuiString
from pysui.sui.sui_types.address import SuiAddress
from typing import List, Optional, Dict
from ..config import get_settings


class SuiService:
    """Service for interacting with Sui blockchain using pysui"""

    def __init__(self):
        self.settings = get_settings()
        self.package_id = self.settings.sui_package_id
        self.module_name = self.settings.sui_module_name
        self._client = None

    def _get_client(self) -> SyncClient:
        """Initialize Sui client based on network configuration (lazy initialization)"""
        if self._client is None:
            try:
                if self.settings.sui_network == "mainnet":
                    config = SuiConfig.default_config()
                elif self.settings.sui_network == "testnet":
                    # Try sui_base_config first, fallback to default if suibase not configured
                    try:
                        config = SuiConfig.sui_base_config()
                    except (FileNotFoundError, OSError):
                        config = SuiConfig.default_config()
                elif self.settings.sui_network == "devnet":
                    config = SuiConfig.default_config()
                else:
                    config = SuiConfig.default_config()

                self._client = SyncClient(config)
            except Exception as e:
                raise Exception(f"Failed to initialize Sui client: {str(e)}. Please ensure Sui is properly configured.")
        return self._client

    def mint_document(
        self,
        name: str,
        walrus_blob_id: str,
        is_public: bool,
        signer_address: Optional[str] = None
    ) -> Dict:
        """
        Mint a document NFT on Sui blockchain

        Args:
            name: Document name
            walrus_blob_id: Blob ID from Walrus storage
            is_public: Whether document is public
            signer_address: Address of the signer (optional)

        Returns:
            dict with transaction digest and document object ID
        """
        try:
            # Create transaction
            txn = SyncTransaction(client=self._get_client(), compress_inputs=True)

            # Add move call to mint document
            txn.move_call(
                target=f"{self.package_id}::{self.module_name}::mint_document",
                arguments=[
                    SuiString(name),
                    SuiString(walrus_blob_id),
                    is_public,
                    ObjectID("0x6"),  # Clock object
                ],
            )

            # Execute transaction
            result = txn.execute(gas_budget="10000000")

            if result.is_ok():
                tx_result = result.result_data

                # Extract created object ID (document NFT)
                document_id = None
                if hasattr(tx_result, 'effects') and tx_result.effects:
                    created_objects = tx_result.effects.created
                    if created_objects and len(created_objects) > 0:
                        document_id = str(created_objects[0].reference.object_id)

                return {
                    "transaction_digest": tx_result.digest,
                    "status": "success",
                    "document_object_id": document_id
                }
            else:
                raise Exception(f"Transaction failed: {result.result_string}")

        except Exception as e:
            raise Exception(f"Failed to mint document on Sui: {str(e)}")

    def get_user_documents(self, wallet_address: str) -> List[Dict]:
        """
        Get all documents owned by a wallet address

        Args:
            wallet_address: Sui wallet address

        Returns:
            List of document metadata
        """
        try:
            # Query owned objects of DocumentAsset type
            result = self._get_client().get_objects(
                owner=SuiAddress(wallet_address),
                object_type=f"{self.package_id}::{self.module_name}::DocumentAsset"
            )

            documents = []
            if result.is_ok() and result.result_data:
                for obj in result.result_data.data:
                    # Get full object details
                    obj_result = self._get_client().get_object(obj.object_id)

                    if obj_result.is_ok() and obj_result.result_data:
                        obj_data = obj_result.result_data

                        if hasattr(obj_data, 'content') and obj_data.content:
                            fields = obj_data.content.fields
                            documents.append({
                                "id": str(obj.object_id),
                                "name": fields.get("name", ""),
                                "owner": fields.get("owner", ""),
                                "walrus_blob_id": fields.get("walrus_blob_id", ""),
                                "uploaded_at": fields.get("uploaded_at", 0),
                                "is_public": fields.get("is_public", False),
                            })

            return documents

        except Exception as e:
            raise Exception(f"Failed to get user documents: {str(e)}")

    def get_document(self, document_id: str) -> Optional[Dict]:
        """
        Get a specific document by its object ID

        Args:
            document_id: Sui object ID of the document

        Returns:
            Document metadata or None
        """
        try:
            result = self._get_client().get_object(ObjectID(document_id))

            if result.is_ok() and result.result_data:
                obj_data = result.result_data

                if hasattr(obj_data, 'content') and obj_data.content:
                    fields = obj_data.content.fields
                    return {
                        "id": document_id,
                        "name": fields.get("name", ""),
                        "owner": fields.get("owner", ""),
                        "walrus_blob_id": fields.get("walrus_blob_id", ""),
                        "uploaded_at": fields.get("uploaded_at", 0),
                        "is_public": fields.get("is_public", False),
                    }

            return None

        except Exception as e:
            raise Exception(f"Failed to get document: {str(e)}")

    def verify_ownership(self, document_id: str, wallet_address: str) -> bool:
        """
        Verify if a wallet owns a specific document

        Args:
            document_id: Document object ID
            wallet_address: Wallet address to verify

        Returns:
            True if wallet owns the document
        """
        try:
            document = self.get_document(document_id)
            if document:
                return document["owner"].lower() == wallet_address.lower()
            return False

        except Exception:
            return False

    def get_public_documents(self) -> List[Dict]:
        """
        Get all public documents (note: this requires indexing in production)

        Returns:
            List of public document metadata
        """
        # Note: In production, you'd want to use an indexer service
        # For now, this is a placeholder
        # You could use Sui's indexer or build your own
        raise NotImplementedError(
            "Public document querying requires an indexer service"
        )
