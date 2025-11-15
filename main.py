import uvicorn
import os

from api import app


def main():
    """Run the FastAPI application"""
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
