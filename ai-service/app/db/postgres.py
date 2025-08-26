import databases
from loguru import logger

from app.config import settings

# Create database connection
database = databases.Database(settings.DATABASE_URL)

async def connect():
    """Connect to PostgreSQL database."""
    try:
        await database.connect()
        logger.info("Connected to PostgreSQL database")
    except Exception as e:
        logger.error(f"Failed to connect to PostgreSQL: {e}")
        raise

async def disconnect():
    """Disconnect from PostgreSQL database."""
    try:
        await database.disconnect()
        logger.info("Disconnected from PostgreSQL database")
    except Exception as e:
        logger.error(f"Error disconnecting from PostgreSQL: {e}")
        raise