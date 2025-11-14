# 🚀 Quick Start Guide

Get your Decentralized RAG system running in 10 minutes!

## Prerequisites Check

```bash
# Check Python version (need 3.8+)
python3 --version

# Check Node.js version (need 16+)
node --version

# Check Sui CLI (for contract deployment)
sui --version
```

## Step 1: Setup (2 minutes)

```bash
# Clone and setup
git clone <repository-url>
cd rag-python

# Run automated setup
chmod +x setup.sh
./setup.sh
```

## Step 2: Configure (2 minutes)

```bash
# Copy environment file
cp .env.example .env

# Edit configuration
nano .env
```

**Minimum required:**
```env
OPENAI_API_KEY=sk-...  # Get from https://platform.openai.com
SUI_NETWORK=testnet
```

**Optional (for full functionality):**
```env
SUI_PACKAGE_ID=0x...  # From deploying the smart contract
```

## Step 3: Deploy Smart Contract (Optional, 3 minutes)

```bash
# Navigate to contracts
cd contracts/document_registry

# Build contract
sui move build

# Deploy to testnet
sui client publish --gas-budget 100000000

# Copy the Package ID from output and add to .env
# Example: 0x1234...
```

Update `.env`:
```env
SUI_PACKAGE_ID=0x1234abcd...  # Your deployed package ID
```

## Step 4: Start Backend (1 minute)

```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
python run.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

Test: http://localhost:8000/health

## Step 5: Start Frontend (1 minute)

```bash
# Terminal 2: Frontend (new terminal)
cd frontend
npm run dev
```

You should see:
```
  VITE ready in 500 ms
  ➜  Local:   http://localhost:3000/
```

## Step 6: Use the App (1 minute)

1. Open http://localhost:3000
2. Click "Connect Wallet"
3. Select your Sui wallet
4. Upload a document
5. Ask questions about it!

## Troubleshooting

### Backend Issues

**Import errors:**
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

**Port already in use:**
```bash
# Change port in backend/run.py
uvicorn.run(app, host="0.0.0.0", port=8001)  # Use 8001
```

### Frontend Issues

**Dependencies error:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Port already in use:**
```bash
# Change port in vite.config.js
server: {
  port: 3001  # Use 3001
}
```

### Wallet Connection Issues

1. Install Sui Wallet extension
2. Create/import wallet
3. Switch to testnet
4. Refresh page

## Next Steps

- 📖 Read the full [README.md](../README.md)
- 🏗️ Check [ARCHITECTURE.md](./ARCHITECTURE.md)
- 🔧 Explore the API at http://localhost:8000/docs

## Common Commands

```bash
# Backend
cd backend && source venv/bin/activate && python run.py

# Frontend
cd frontend && npm run dev

# Build for production
cd frontend && npm run build

# Deploy contract
cd contracts/document_registry && sui client publish --gas-budget 100000000
```

## Getting Help

- Check logs in terminal
- Visit http://localhost:8000/docs for API documentation
- Open browser console (F12) for frontend errors
- Check GitHub issues

Happy building! 🎉
