# 🌊 Decentralized RAG System

A complete decentralized Retrieval-Augmented Generation (RAG) system combining **Walrus storage**, **Sui blockchain**, and **AI** to create a trustless, permanent document storage and intelligent querying platform.

## 🎯 Overview

This project demonstrates a fully functional decentralized RAG system where:
- 📤 Users upload documents to **Walrus** (decentralized storage)
- ⛓️ Document ownership is recorded as NFTs on **Sui blockchain**
- 🤖 AI-powered querying using **OpenAI + LangChain + ChromaDB**
- 🔐 Wallet-based authentication and access control

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │      │   Backend    │      │   Walrus    │
│   (React)   │─────▶│  (FastAPI)   │─────▶│  Storage    │
│             │      │              │      │             │
└─────────────┘      └──────────────┘      └─────────────┘
       │                     │
       │                     │
       ▼                     ▼
┌─────────────┐      ┌──────────────┐
│ Sui Wallet  │      │ Sui Blockchain│
│             │      │   (pysui)     │
└─────────────┘      └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Document    │
                     │  Registry    │
                     │  (Move)      │
                     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │    RAG       │
                     │  (LangChain) │
                     │  (ChromaDB)  │
                     └──────────────┘
```

## 🚀 Features

### Core Functionality
- ✅ **Document Upload**: Upload PDFs, text files, and more to Walrus
- ✅ **NFT Minting**: Automatic NFT creation on Sui for each document
- ✅ **AI Querying**: Ask questions about your documents with AI-powered answers
- ✅ **Source Citations**: Get exact references from your documents
- ✅ **Wallet Integration**: Connect with Sui wallets for authentication
- ✅ **Access Control**: Private and public document settings

### Technical Features
- 🔄 **Decentralized Storage**: Documents stored on Walrus (no central server)
- ⛓️ **Blockchain Verification**: Ownership tracked on Sui blockchain
- 🎯 **Vector Search**: Efficient similarity search with ChromaDB
- 🧠 **RAG Pipeline**: LangChain-powered retrieval and generation
- 🔒 **Secure**: Wallet-based authentication

## 📦 Tech Stack

### Backend
- **FastAPI**: High-performance Python web framework
- **pysui**: Official Python SDK for Sui blockchain
- **LangChain**: RAG orchestration framework
- **ChromaDB**: Vector database for embeddings
- **OpenAI**: GPT models for text generation
- **httpx**: Async HTTP client for Walrus

### Frontend
- **React**: UI framework
- **Vite**: Build tool and dev server
- **@mysten/dapp-kit**: Sui wallet integration
- **Axios**: HTTP client

### Blockchain & Storage
- **Sui Move**: Smart contract language
- **Walrus**: Decentralized blob storage
- **Sui Network**: Layer 1 blockchain

## 🛠️ Installation

### Prerequisites

- Python 3.8+
- Node.js 16+
- Sui CLI (for contract deployment)
- OpenAI API key

### Quick Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd rag-python
```

2. **Run setup script**
```bash
chmod +x setup.sh
./setup.sh
```

3. **Configure environment**
```bash
# Edit .env file
cp .env.example .env
nano .env
```

Required configuration:
```env
SUI_PACKAGE_ID=0x...          # From contract deployment
SUI_NETWORK=testnet
OPENAI_API_KEY=sk-...         # Your OpenAI API key
WALRUS_PUBLISHER_URL=https://publisher-devnet.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator-devnet.walrus.space
```

### Manual Setup

#### Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### Frontend Setup
```bash
cd frontend
npm install
```

#### Deploy Smart Contract
```bash
cd contracts
sui move build
sui client publish --gas-budget 100000000
# Save the Package ID to your .env file
```

## 🏃 Running the Application

### 1. Start Backend
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python run.py
```
Backend will run on `http://localhost:8000`

### 2. Start Frontend (in new terminal)
```bash
cd frontend
npm run dev
```
Frontend will run on `http://localhost:3000`

### 3. Access the Application
Open your browser and navigate to `http://localhost:3000`

## 📖 Usage Guide

### 1. Connect Wallet
- Click "Connect Wallet" button
- Select your Sui wallet (Sui Wallet, Suiet, etc.)
- Approve the connection

### 2. Upload Documents
- Click "Choose File" and select a document (PDF, TXT, etc.)
- Optionally check "Make document public"
- Click "Upload to Walrus & Sui"
- Wait for:
  - ✅ Upload to Walrus
  - ✅ NFT minting on Sui
  - ✅ RAG processing

### 3. Query Documents
- Type your question in the query box
- Click "Ask AI"
- View AI-generated answer with source citations

### 4. Manage Documents
- View all your documents in the "My Documents" section
- Download documents
- See metadata (upload date, visibility, etc.)

## 🔧 API Endpoints

### Document Operations
- `POST /upload-document` - Upload document to Walrus & Sui
- `GET /documents/{wallet_address}` - Get user's documents
- `GET /download/{blob_id}` - Download document from Walrus

### Query Operations
- `POST /query` - Query documents with AI

### System
- `GET /health` - Health check
- `GET /` - API information

## 📝 Smart Contract

The Sui Move smart contract (`contracts/document_registry/sources/registry.move`) provides:

**Functions:**
- `mint_document()` - Create document NFT
- `transfer_document()` - Transfer ownership
- `set_visibility()` - Change public/private status

**Events:**
- `DocumentMinted` - Emitted when document is created
- `DocumentTransferred` - Emitted on ownership transfer
- `VisibilityChanged` - Emitted when visibility changes

## 🔐 Security Considerations

1. **Private Keys**: Never commit private keys or mnemonics
2. **API Keys**: Keep OpenAI API key secure
3. **Access Control**: Document visibility is enforced on-chain
4. **Wallet Verification**: All operations require wallet signature

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/
```

### Frontend Tests
```bash
cd frontend
npm run test
```

## 🚀 Deployment

### Backend Deployment
- Deploy to any Python-compatible hosting (AWS, GCP, Heroku)
- Set environment variables
- Use gunicorn or uvicorn in production

### Frontend Deployment
```bash
cd frontend
npm run build
# Deploy 'dist' folder to Vercel, Netlify, or any static host
```

### Contract Deployment
```bash
cd contracts/document_registry
sui move build
sui client publish --gas-budget 100000000
```

## 📊 Project Structure

```
rag-python/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── config.py            # Configuration
│   │   ├── models/
│   │   │   └── schemas.py       # Pydantic models
│   │   └── services/
│   │       ├── walrus_service.py    # Walrus integration
│   │       ├── sui_service.py       # Sui blockchain integration
│   │       └── rag_service.py       # RAG system
│   ├── requirements.txt
│   └── run.py
├── contracts/
│   └── document_registry/
│       ├── Move.toml
│       └── sources/
│           └── registry.move    # Smart contract
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main app component
│   │   ├── main.jsx             # Entry point
│   │   ├── config/
│   │   │   └── sui.js           # Sui configuration
│   │   └── components/
│   │       ├── DocumentUpload.jsx
│   │       ├── DocumentList.jsx
│   │       └── QueryInterface.jsx
│   ├── package.json
│   └── vite.config.js
├── .env.example
├── .gitignore
├── setup.sh
└── README.md
```

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 🐛 Troubleshooting

### Backend won't start
- Check Python version: `python --version` (need 3.8+)
- Verify all dependencies: `pip install -r requirements.txt`
- Check .env configuration

### Frontend won't start
- Check Node version: `node --version` (need 16+)
- Clear node_modules: `rm -rf node_modules && npm install`

### Contract deployment fails
- Check Sui CLI: `sui --version`
- Verify wallet has gas: `sui client gas`
- Check network configuration

### Wallet won't connect
- Install Sui Wallet browser extension
- Check network (devnet/testnet/mainnet)
- Try refreshing the page

## 📚 Resources

- [Sui Documentation](https://docs.sui.io)
- [Walrus Documentation](https://docs.walrus.site)
- [LangChain Documentation](https://python.langchain.com)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [pysui Documentation](https://pysui.readthedocs.io)

## 📄 License

MIT License - see LICENSE file for details

## 🎉 Acknowledgments

- Built for the Walrus/Sui Hackathon
- Uses OpenAI GPT models
- Powered by Walrus decentralized storage
- Built on Sui blockchain

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ using Walrus, Sui, and AI**
