"""
Run the FastAPI backend server
"""
import os
import uvicorn
from app.main import app

# Export app for Vercel
# Vercel will use this as the WSGI/ASGI application
__all__ = ["app"]

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=os.getenv("DEBUG", "false").lower() == "true",
        log_level="info"
    )
