from fastapi import FastAPI
import uvicorn

app = FastAPI(title="ModMaster Pro AI Service", version="1.0.0")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "AI Service",
        "version": "1.0.0",
        "timestamp": "2025-09-16T21:00:00Z"
    }

@app.get("/")
async def root():
    return {"message": "ModMaster Pro AI Service is running"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
