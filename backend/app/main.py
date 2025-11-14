from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Optional, List
import logging

from .config import get_settings
from .models.schemas import (
    DocumentUploadResponse,
    QueryRequest,
    QueryResponse,
    UserDocumentsResponse,
    HealthCheckResponse,
    DocumentMetadata,
    SuiTransactionData
)
from .services.walrus_service import WalrusService
from .services.sui_service import SuiService
from .services.rag_service import RAGService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    debug=settings.debug
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
walrus_service = WalrusService()
sui_service = SuiService()
rag_service = RAGService()


@app.get("/", response_model=HealthCheckResponse)
async def root():
    """Root endpoint with health check"""
    return {
        "status": "healthy",
        "services": {
            "walrus": "configured",
            "sui": "configured" if settings.sui_package_id else "not_configured",
            "rag": "ready",
            "openai": "configured" if settings.openai_api_key else "not_configured"
        }
    }


@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "services": {
            "walrus": "online",
            "sui": "online",
            "rag": "online"
        }
    }


@app.post("/upload-document", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    wallet_address: str = Form(...),
    is_public: bool = Form(False)
):
    """
    Upload a document to Walrus, mint NFT on Sui, and process for RAG

    Args:
        file: Document file (PDF, TXT, etc.)
        wallet_address: User's Sui wallet address
        is_public: Whether the document should be public
    """
    try:
        logger.info(f"Uploading document: {file.filename} for wallet: {wallet_address}")

        # Read file content
        file_content = await file.read()

        # Step 1: Upload to Walrus
        logger.info("Uploading to Walrus...")
        try:
            walrus_result = await walrus_service.upload_blob(file_content)
            blob_id = walrus_result["blob_id"]
            logger.info(f"Uploaded to Walrus: {blob_id}")
        except Exception as e:
            error_msg = str(e) if str(e) else f"{type(e).__name__}: {repr(e)}"
            logger.error(f"Walrus upload failed: {error_msg}", exc_info=True)
            raise Exception(f"Failed to upload to Walrus: {error_msg}")

        # Step 2: Prepare Sui transaction data for frontend to sign (if package is configured)
        sui_transaction_data = None
        if settings.sui_package_id:
            logger.info("Preparing Sui transaction data for frontend...")
            sui_transaction_data = {
                "package_id": settings.sui_package_id,
                "module_name": settings.sui_module_name,
                "function_name": "mint_document",
                "arguments": {
                    "name": file.filename,
                    "walrus_blob_id": blob_id,
                    "is_public": is_public
                },
                "gas_budget": 10000000
            }
        else:
            logger.warning("Sui package not configured, skipping NFT minting")

        # Step 3: Process document for RAG
        logger.info("Processing document for RAG...")
        try:
            rag_result = await rag_service.process_document(
                blob_id=blob_id,
                content=file_content,
                filename=file.filename,
                metadata={
                    "owner": wallet_address,
                    "is_public": is_public
                }
            )
            logger.info(f"RAG processing complete: {rag_result['chunks_created']} chunks created")
        except Exception as e:
            error_msg = str(e) if str(e) else f"{type(e).__name__}: {repr(e)}"
            logger.error(f"RAG processing failed: {error_msg}", exc_info=True)
            # Continue even if RAG fails - document is still uploaded to Walrus
            logger.warning("Continuing without RAG processing due to error")

        return DocumentUploadResponse(
            walrus_blob_id=blob_id,
            sui_transaction_digest=None,  # Will be set after user signs transaction
            document_id=None,  # Will be set after transaction completes
            message="Document uploaded to Walrus. Please sign the transaction to mint NFT on Sui.",
            sui_transaction_data=sui_transaction_data
        )

    except Exception as e:
        error_msg = str(e) if str(e) else f"{type(e).__name__}: {repr(e)}"
        logger.error(f"Upload failed: {error_msg}", exc_info=True)
        raise HTTPException(status_code=500, detail=error_msg)


@app.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest):
    """
    Query documents using RAG

    Args:
        request: Query request with question and optional filters
    """
    try:
        logger.info(f"Querying: {request.question}")

        # If wallet address is provided, get user's documents
        document_ids = request.document_ids
        if request.wallet_address and not document_ids:
            try:
                user_docs = sui_service.get_user_documents(request.wallet_address)
                document_ids = [doc["walrus_blob_id"] for doc in user_docs]
                logger.info(f"Found {len(document_ids)} documents for user")
            except Exception as e:
                logger.warning(f"Failed to get user documents: {str(e)}")

        # Query RAG system
        result = await rag_service.query_documents(
            question=request.question,
            document_ids=document_ids
        )

        return QueryResponse(**result)

    except Exception as e:
        logger.error(f"Query failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/documents/{wallet_address}", response_model=UserDocumentsResponse)
async def get_user_documents(wallet_address: str):
    """
    Get all documents owned by a wallet address

    Args:
        wallet_address: Sui wallet address
    """
    try:
        logger.info(f"Getting documents for wallet: {wallet_address}")

        if not settings.sui_package_id:
            return UserDocumentsResponse(
                documents=[],
                total=0
            )

        documents = sui_service.get_user_documents(wallet_address)

        return UserDocumentsResponse(
            documents=[DocumentMetadata(**doc) for doc in documents],
            total=len(documents)
        )

    except Exception as e:
        logger.error(f"Failed to get documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/documents/{wallet_address}/{document_id}")
async def get_document(wallet_address: str, document_id: str):
    """
    Get a specific document's metadata

    Args:
        wallet_address: Sui wallet address
        document_id: Document object ID
    """
    try:
        if not settings.sui_package_id:
            raise HTTPException(status_code=404, detail="Sui not configured")

        document = sui_service.get_document(document_id)

        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Verify ownership (optional, for private documents)
        if not document["is_public"]:
            if not sui_service.verify_ownership(document_id, wallet_address):
                raise HTTPException(status_code=403, detail="Access denied")

        return DocumentMetadata(**document)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/download/{blob_id}")
async def download_document(blob_id: str, wallet_address: Optional[str] = None):
    """
    Download a document from Walrus

    Args:
        blob_id: Walrus blob ID
        wallet_address: Optional wallet address for access control
    """
    try:
        logger.info(f"Downloading blob: {blob_id}")

        # TODO: Add access control based on document ownership
        # For now, allow all downloads

        content = await walrus_service.download_blob(blob_id)

        return StreamingResponse(
            iter([content]),
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename={blob_id}"
            }
        )

    except Exception as e:
        logger.error(f"Download failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/documents/{blob_id}")
async def delete_document(blob_id: str, wallet_address: str):
    """
    Delete a document's RAG embeddings

    Args:
        blob_id: Walrus blob ID
        wallet_address: Wallet address for verification
    """
    try:
        logger.info(f"Deleting document: {blob_id}")

        # TODO: Verify ownership before deletion

        result = rag_service.delete_document_embeddings(blob_id)

        return {
            "message": "Document embeddings deleted",
            "blob_id": blob_id,
            "deleted_chunks": result["deleted_chunks"]
        }

    except Exception as e:
        logger.error(f"Delete failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/complete-upload")
async def complete_upload(
    blob_id: str = Form(...),
    transaction_digest: str = Form(...),
    wallet_address: str = Form(...)
):
    """
    Complete the upload process after Sui transaction is signed
    
    Args:
        blob_id: Walrus blob ID
        transaction_digest: Sui transaction digest
        wallet_address: Wallet address that signed the transaction
    """
    try:
        logger.info(f"Completing upload for blob {blob_id} with transaction {transaction_digest}")
        
        # Optionally verify the transaction and extract document ID
        # For now, we'll just log it
        return {
            "status": "success",
            "message": "Upload completed successfully",
            "blob_id": blob_id,
            "transaction_digest": transaction_digest
        }
    
    except Exception as e:
        logger.error(f"Failed to complete upload: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats/{blob_id}")
async def get_document_stats(blob_id: str):
    """
    Get statistics about a document

    Args:
        blob_id: Walrus blob ID
    """
    try:
        stats = rag_service.get_document_stats(blob_id)
        return stats

    except Exception as e:
        logger.error(f"Failed to get stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
