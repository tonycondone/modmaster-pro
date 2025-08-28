import asyncpg
from typing import Optional
import os
from app.config import settings
from app.utils.logger import logger

# Database connection pool
database: Optional[asyncpg.Pool] = None

async def init_database():
    """Initialize database connection pool."""
    global database
    
    try:
        database = await asyncpg.create_pool(
            host=settings.DATABASE_HOST,
            port=settings.DATABASE_PORT,
            user=settings.DATABASE_USER,
            password=settings.DATABASE_PASSWORD,
            database=settings.DATABASE_NAME,
            min_size=5,
            max_size=20,
            command_timeout=60
        )
        
        logger.info("Database connection pool created successfully")
        
        # Create tables if they don't exist
        await create_tables()
        
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        raise

async def create_tables():
    """Create database tables if they don't exist."""
    try:
        async with database.acquire() as conn:
            # Create scan_results table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS scan_results (
                    id SERIAL PRIMARY KEY,
                    scan_id VARCHAR(255) UNIQUE NOT NULL,
                    user_id VARCHAR(255),
                    vehicle_id VARCHAR(255),
                    timestamp TIMESTAMP NOT NULL,
                    image_url TEXT,
                    parts JSONB,
                    vehicle_info JSONB,
                    processing_time FLOAT DEFAULT 0.0,
                    model_version VARCHAR(50) DEFAULT 'v1.0.0',
                    status VARCHAR(20) DEFAULT 'completed',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create model_performance table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS model_performance (
                    id SERIAL PRIMARY KEY,
                    model_name VARCHAR(100) NOT NULL,
                    model_version VARCHAR(50) NOT NULL,
                    accuracy FLOAT,
                    processing_time FLOAT,
                    total_predictions INTEGER DEFAULT 0,
                    successful_predictions INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create part_detections table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS part_detections (
                    id SERIAL PRIMARY KEY,
                    scan_id VARCHAR(255) NOT NULL,
                    part_name VARCHAR(255) NOT NULL,
                    confidence FLOAT NOT NULL,
                    bounding_box JSONB NOT NULL,
                    part_number VARCHAR(100),
                    category VARCHAR(100),
                    brand VARCHAR(100),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (scan_id) REFERENCES scan_results(scan_id) ON DELETE CASCADE
                )
            """)
            
            # Create indexes
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_scan_results_user_id ON scan_results(user_id);
                CREATE INDEX IF NOT EXISTS idx_scan_results_vehicle_id ON scan_results(vehicle_id);
                CREATE INDEX IF NOT EXISTS idx_scan_results_timestamp ON scan_results(timestamp);
                CREATE INDEX IF NOT EXISTS idx_part_detections_scan_id ON part_detections(scan_id);
                CREATE INDEX IF NOT EXISTS idx_part_detections_part_name ON part_detections(part_name);
            """)
            
        logger.info("Database tables created successfully")
        
    except Exception as e:
        logger.error(f"Failed to create tables: {str(e)}")
        raise

async def close_database():
    """Close database connection pool."""
    global database
    
    if database:
        await database.close()
        logger.info("Database connection pool closed")

async def get_database() -> asyncpg.Pool:
    """Get database connection pool."""
    if not database:
        await init_database()
    return database