from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime


class DocumentUploadResponse(BaseModel):
    walrus_blob_id: str
    sui_transaction_digest: Optional[str] = None
    document_id: Optional[str] = None
    message: str = "Document uploaded successfully"
    sui_transaction_data: Optional[Dict] = None  # Transaction data for frontend to sign


class SuiTransactionData(BaseModel):
    """Transaction data for frontend to construct and sign"""
    package_id: str
    module_name: str
    function_name: str = "mint_document"
    arguments: Dict  # Arguments needed for the transaction
    gas_budget: Optional[int] = 10000000


class DocumentMetadata(BaseModel):
    id: str
    name: str
    owner: str
    walrus_blob_id: str
    uploaded_at: int
    is_public: bool


class QueryRequest(BaseModel):
    question: str = Field(..., description="Question to ask about documents")
    document_ids: Optional[List[str]] = Field(
        None,
        description="Optional list of document blob IDs to search within"
    )
    wallet_address: Optional[str] = Field(
        None,
        description="Optional wallet address to filter user's documents"
    )


class SourceReference(BaseModel):
    blob_id: str
    excerpt: str
    chunk_index: int


class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceReference]
    question: str


class WalrusUploadResponse(BaseModel):
    blob_id: str
    sui_ref_type: str
    certified_epoch: int


class SuiTransactionResponse(BaseModel):
    transaction_digest: str
    status: str
    document_object_id: Optional[str] = None


class UserDocumentsResponse(BaseModel):
    documents: List[DocumentMetadata]
    total: int


class HealthCheckResponse(BaseModel):
    status: str
    services: dict
