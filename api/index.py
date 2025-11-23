"""
Vercel serverless function entry point for FastAPI
Vercel automatically detects Python files in the api/ directory
"""
import sys
import os

# Add backend directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.abspath(os.path.join(current_dir, '..', 'backend'))

# Ensure backend is in path
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Import the FastAPI app
from app.main import app

# Export for Vercel
__all__ = ["app"]

