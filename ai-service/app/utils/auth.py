from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from loguru import logger

from app.config import settings

api_key_header = APIKeyHeader(name="X-API-Key")

async def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    """Verify API key for internal service authentication."""
    if api_key != settings.API_KEY:
        logger.warning(f"Invalid API key attempt: {api_key[:10]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    return api_key