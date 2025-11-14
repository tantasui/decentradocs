#!/bin/bash

echo "🚀 Setting up Decentralized RAG System..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Setup backend
echo ""
echo "📦 Setting up backend..."
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

echo "✅ Backend dependencies installed"

cd ..

# Setup frontend
echo ""
echo "📦 Setting up frontend..."
cd frontend

# Install npm dependencies
npm install

echo "✅ Frontend dependencies installed"

cd ..

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Deploy Sui Move contract: cd contracts && sh deploy.sh"
echo "3. Update SUI_PACKAGE_ID in .env"
echo "4. Start backend: cd backend && source venv/bin/activate && python run.py"
echo "5. Start frontend (in new terminal): cd frontend && npm run dev"
echo ""
echo "Happy hacking! 🎉"
