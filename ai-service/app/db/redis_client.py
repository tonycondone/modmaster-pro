import redis.asyncio as redis
from typing import Optional, Any
import json
from app.config import settings
from app.utils.logger import logger

# Redis client
redis_client: Optional[redis.Redis] = None

async def init_redis():
    """Initialize Redis connection."""
    global redis_client
    
    try:
        redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD,
            db=settings.REDIS_DB,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True
        )
        
        # Test connection
        await redis_client.ping()
        logger.info("Redis connection established successfully")
        
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {str(e)}")
        # Continue without Redis (optional dependency)
        redis_client = None

async def close_redis():
    """Close Redis connection."""
    global redis_client
    
    if redis_client:
        await redis_client.close()
        logger.info("Redis connection closed")

async def get_redis() -> Optional[redis.Redis]:
    """Get Redis client."""
    return redis_client

async def cache_set(key: str, value: Any, expire: int = 3600) -> bool:
    """
    Set value in cache.
    
    Args:
        key: Cache key
        value: Value to cache
        expire: Expiration time in seconds
        
    Returns:
        True if successful, False otherwise
    """
    try:
        if not redis_client:
            return False
        
        # Serialize value to JSON
        if isinstance(value, (dict, list)):
            serialized_value = json.dumps(value)
        else:
            serialized_value = str(value)
        
        await redis_client.setex(key, expire, serialized_value)
        return True
        
    except Exception as e:
        logger.error(f"Failed to set cache key {key}: {str(e)}")
        return False

async def cache_get(key: str) -> Optional[Any]:
    """
    Get value from cache.
    
    Args:
        key: Cache key
        
    Returns:
        Cached value or None if not found
    """
    try:
        if not redis_client:
            return None
        
        value = await redis_client.get(key)
        if value is None:
            return None
        
        # Try to deserialize JSON
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
        
    except Exception as e:
        logger.error(f"Failed to get cache key {key}: {str(e)}")
        return None

async def cache_delete(key: str) -> bool:
    """
    Delete value from cache.
    
    Args:
        key: Cache key
        
    Returns:
        True if successful, False otherwise
    """
    try:
        if not redis_client:
            return False
        
        result = await redis_client.delete(key)
        return result > 0
        
    except Exception as e:
        logger.error(f"Failed to delete cache key {key}: {str(e)}")
        return False

async def cache_exists(key: str) -> bool:
    """
    Check if key exists in cache.
    
    Args:
        key: Cache key
        
    Returns:
        True if key exists, False otherwise
    """
    try:
        if not redis_client:
            return False
        
        return await redis_client.exists(key) > 0
        
    except Exception as e:
        logger.error(f"Failed to check cache key {key}: {str(e)}")
        return False

async def cache_clear_pattern(pattern: str) -> int:
    """
    Clear cache keys matching pattern.
    
    Args:
        pattern: Redis pattern (e.g., "user:*")
        
    Returns:
        Number of keys deleted
    """
    try:
        if not redis_client:
            return 0
        
        keys = await redis_client.keys(pattern)
        if keys:
            return await redis_client.delete(*keys)
        return 0
        
    except Exception as e:
        logger.error(f"Failed to clear cache pattern {pattern}: {str(e)}")
        return 0

async def cache_increment(key: str, amount: int = 1) -> Optional[int]:
    """
    Increment counter in cache.
    
    Args:
        key: Cache key
        amount: Amount to increment
        
    Returns:
        New value or None if failed
    """
    try:
        if not redis_client:
            return None
        
        return await redis_client.incrby(key, amount)
        
    except Exception as e:
        logger.error(f"Failed to increment cache key {key}: {str(e)}")
        return None

async def cache_expire(key: str, seconds: int) -> bool:
    """
    Set expiration time for cache key.
    
    Args:
        key: Cache key
        seconds: Expiration time in seconds
        
    Returns:
        True if successful, False otherwise
    """
    try:
        if not redis_client:
            return False
        
        return await redis_client.expire(key, seconds)
        
    except Exception as e:
        logger.error(f"Failed to set expiration for cache key {key}: {str(e)}")
        return False