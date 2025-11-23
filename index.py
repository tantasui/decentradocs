"""
Vercel serverless function entry point for FastAPI
"""
import sys
import os

# Add backend directory to Python path
# Get the absolute path to the backend directory
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(current_dir, 'backend')
backend_path = os.path.abspath(backend_path)
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Import the FastAPI app
from app.main import app

# Export for Vercel
__all__ = ["app"]

