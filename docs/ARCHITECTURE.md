# 🏗️ System Architecture

## Overview

The Decentralized RAG system is built on three core pillars:
1. **Walrus** - Decentralized storage layer
2. **Sui** - Blockchain layer for ownership and metadata
3. **AI/RAG** - Intelligent document querying

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        USER LAYER                            │
│  Browser + Sui Wallet Extension                              │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER (React)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Document   │  │   Document   │  │    Query     │       │
│  │   Upload    │  │     List     │  │  Interface   │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                   BACKEND LAYER (FastAPI)                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  API Endpoints                       │    │
│  │  /upload-document  /query  /documents               │    │
│  └─────────┬───────────────────────────────────────────┘    │
│            │                                                 │
│  ┌─────────┴────────────────────────────────────────────┐   │
│  │              Service Layer                            │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐       │   │
│  │  │ Walrus   │  │   Sui    │  │     RAG      │       │   │
│  │  │ Service  │  │ Service  │  │   Service    │       │   │
│  │  └────┬─────┘  └────┬─────┘  └──────┬───────┘       │   │
│  └───────┼─────────────┼────────────────┼───────────────┘   │
└──────────┼─────────────┼────────────────┼───────────────────┘
           │             │                │
           ▼             ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   WALRUS     │  │     SUI      │  │   OPENAI +   │
│   STORAGE    │  │  BLOCKCHAIN  │  │   CHROMADB   │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Component Details

### 1. Frontend (React + Vite)

**Technology:**
- React 18 for UI
- Vite for build tooling
- @mysten/dapp-kit for Sui integration
- Axios for HTTP requests

**Key Components:**

#### DocumentUpload.jsx
- Handles file selection and upload
- Sends file to backend with wallet address
- Shows upload progress and results

#### DocumentList.jsx
- Fetches user's documents from Sui
- Displays document metadata
- Provides download links

#### QueryInterface.jsx
- Text input for questions
- Sends queries to RAG system
- Displays AI-generated answers with sources

**Data Flow:**
```
User Action → Component → API Call → Backend → Response → UI Update
```

### 2. Backend (FastAPI)

**Technology:**
- FastAPI for REST API
- Pydantic for data validation
- Async/await for concurrent operations
- CORS middleware for cross-origin requests

**Service Architecture:**

#### Walrus Service (`walrus_service.py`)
**Responsibilities:**
- Upload files to Walrus network
- Download files from Walrus
- Verify blob existence

**Methods:**
- `upload_blob(content: bytes)` → Returns blob_id
- `download_blob(blob_id: str)` → Returns file content
- `check_blob_status(blob_id: str)` → Verifies existence

**Flow:**
```python
File Upload → HTTP PUT → Walrus Publisher → Blob ID
File Download → HTTP GET → Walrus Aggregator → File Content
```

#### Sui Service (`sui_service.py`)
**Responsibilities:**
- Interact with Sui blockchain via pysui
- Mint document NFTs
- Query user's documents
- Verify ownership

**Methods:**
- `mint_document(name, blob_id, is_public)` → Transaction digest
- `get_user_documents(wallet_address)` → List of documents
- `get_document(document_id)` → Document metadata
- `verify_ownership(document_id, wallet)` → Boolean

**Transaction Flow:**
```python
1. Create SyncTransaction
2. Add move_call with parameters
3. Execute transaction
4. Return transaction digest + created object ID
```

#### RAG Service (`rag_service.py`)
**Responsibilities:**
- Process documents for vector search
- Generate embeddings with OpenAI
- Store vectors in ChromaDB
- Query documents with LangChain

**Methods:**
- `process_document(blob_id, content, filename)` → Processing result
- `query_documents(question, document_ids)` → Answer + sources
- `delete_document_embeddings(blob_id)` → Deletion result

**RAG Pipeline:**
```
1. Text Extraction (PDF/TXT)
2. Text Chunking (1000 chars with 200 overlap)
3. Embedding Generation (OpenAI)
4. Vector Storage (ChromaDB)
5. Similarity Search (on query)
6. Context Building
7. LLM Generation (GPT-3.5)
8. Response with Citations
```

### 3. Smart Contract (Sui Move)

**Contract:** `document_registry::registry`

**Data Structure:**
```move
struct DocumentAsset {
    id: UID,
    name: String,
    owner: address,
    walrus_blob_id: String,
    uploaded_at: u64,
    is_public: bool,
}
```

**Functions:**

#### mint_document
```move
public entry fun mint_document(
    name: vector<u8>,
    walrus_blob_id: vector<u8>,
    is_public: bool,
    clock: &Clock,
    ctx: &mut TxContext
)
```
- Creates new DocumentAsset NFT
- Transfers to sender
- Emits DocumentMinted event

#### transfer_document
```move
public entry fun transfer_document(
    document: DocumentAsset,
    recipient: address,
    ctx: &mut TxContext
)
```
- Transfers ownership
- Emits DocumentTransferred event

#### set_visibility
```move
public entry fun set_visibility(
    document: &mut DocumentAsset,
    is_public: bool,
    ctx: &mut TxContext
)
```
- Updates visibility
- Requires ownership
- Emits VisibilityChanged event

### 4. Storage Layer (Walrus)

**Architecture:**
- Publisher nodes: Accept uploads
- Aggregator nodes: Serve downloads
- Blob storage: Erasure-coded chunks

**Endpoints:**
```
PUT  /v1/store → Upload blob
GET  /v1/{blob_id} → Download blob
HEAD /v1/{blob_id} → Check existence
```

**Storage Properties:**
- Decentralized across nodes
- Erasure coding for redundancy
- Epoch-based storage periods
- Content-addressed (blob IDs)

### 5. Vector Database (ChromaDB)

**Architecture:**
- In-memory vector store
- Persistent storage to disk
- Cosine similarity search

**Data Model:**
```python
{
  "text": "chunk content",
  "metadata": {
    "walrus_blob_id": "...",
    "filename": "...",
    "chunk_index": 0,
    "owner": "0x..."
  },
  "embedding": [0.1, 0.2, ...]  # 1536-dim OpenAI embedding
}
```

## Data Flow

### Upload Flow

```
1. User selects file → Frontend
2. FormData creation → API call
3. Backend receives file
4. ┌─ Upload to Walrus → Get blob_id
5. ├─ Mint NFT on Sui → Get tx_digest
6. └─ Process for RAG → Create embeddings
7. Return results → Frontend
8. Update UI → Show success
```

### Query Flow

```
1. User types question → Frontend
2. API call with question + filters
3. Backend receives query
4. ┌─ Get user documents (if wallet provided)
5. ├─ Similarity search in ChromaDB
6. ├─ Retrieve top-k chunks
7. ├─ Build context
8. └─ Generate answer with LLM
9. Return answer + sources → Frontend
10. Display results → User
```

### Document Retrieval Flow

```
1. User requests document list
2. Frontend calls /documents/{wallet}
3. Backend queries Sui blockchain
4. ┌─ Get owned objects of DocumentAsset type
5. ├─ Fetch each object details
6. └─ Extract metadata
7. Return document list → Frontend
8. Display in UI
```

## Security Architecture

### Authentication
- Wallet-based authentication
- No passwords or traditional auth
- Signature verification (future enhancement)

### Authorization
- Document ownership verified on-chain
- Access control via Sui smart contract
- Private documents accessible only to owner

### Data Security
- Files stored on Walrus (decentralized)
- Metadata on Sui (immutable)
- API keys stored in environment variables
- No sensitive data in frontend

## Scalability Considerations

### Backend
- Async operations for concurrency
- Connection pooling for HTTP requests
- Stateless design for horizontal scaling

### Storage
- Walrus handles storage scaling
- ChromaDB can be replaced with Pinecone/Weaviate for production
- Consider sharding for large document collections

### Blockchain
- Sui provides high throughput
- Parallel transaction execution
- Low latency for queries

## Error Handling

### Frontend
- Try-catch blocks around API calls
- User-friendly error messages
- Loading states for async operations

### Backend
- HTTP exceptions with status codes
- Detailed error logging
- Graceful degradation (e.g., Sui optional)

### Smart Contract
- Assert statements for validation
- Event emission for tracking
- No partial state changes

## Monitoring & Logging

### Backend Logging
```python
logger.info("Uploading document")
logger.error(f"Failed: {error}")
```

### Transaction Tracking
- Sui transaction digests
- Walrus blob IDs
- API request/response logging

## Future Enhancements

1. **Signature Verification**: Verify wallet signatures for auth
2. **Indexer Integration**: Query public documents efficiently
3. **Batch Operations**: Upload multiple documents
4. **Advanced RAG**: Multi-query, re-ranking, hybrid search
5. **Caching**: Redis for frequently accessed data
6. **CDN**: Edge caching for downloads
7. **Analytics**: User activity tracking
8. **Access Control Lists**: Granular sharing permissions

## Technology Choices Explained

### Why FastAPI?
- High performance (async)
- Automatic API docs
- Type validation
- Easy to learn

### Why pysui?
- Official Python SDK
- Type-safe
- Good documentation
- Active development

### Why LangChain?
- RAG abstractions
- Easy LLM integration
- Modular design
- Community support

### Why ChromaDB?
- Simple setup
- Good for prototypes
- Embedded mode
- Python-first

### Why React?
- Component reusability
- Large ecosystem
- Good Sui integration
- Developer experience

## Performance Metrics

### Expected Latencies
- Document upload: 3-10 seconds
- NFT minting: 1-3 seconds
- RAG processing: 2-5 seconds
- Query response: 2-4 seconds
- Document list: <1 second

### Bottlenecks
1. Walrus upload (network dependent)
2. OpenAI API (rate limits)
3. Embedding generation (CPU/API)

### Optimization Strategies
1. Parallel processing where possible
2. Caching for repeated queries
3. Batch embedding generation
4. Pre-warming connections

## Deployment Architecture

### Development
```
localhost:8000 (Backend)
localhost:3000 (Frontend)
testnet (Sui)
devnet (Walrus)
```

### Production
```
api.yourdomain.com (Backend on AWS/GCP)
app.yourdomain.com (Frontend on Vercel/Netlify)
mainnet (Sui)
mainnet (Walrus)
```

## Conclusion

This architecture provides:
- ✅ Decentralization (Walrus + Sui)
- ✅ Scalability (stateless backend)
- ✅ Security (on-chain ownership)
- ✅ Performance (async operations)
- ✅ Extensibility (modular design)
