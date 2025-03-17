from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from . import models
from .database import engine
from .routers import edit, user, auth, history, segment
from dotenv import load_dotenv
load_dotenv()
import os
from fastapi.responses import FileResponse
import mimetypes

models.Base.metadata.create_all(bind=engine)

mimetypes.add_type("video/mp4", ".mp4")

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

origins = [
    "http://localhost:5173",
    "https://localhost:3000",
    "http://localhost:3000",
    "http://localhost",
    "https://localhost",
    "http://localhost:8000",
    "https://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/test-video")
async def get_video():
    video_path = f"static/6c9e4f49-9db3-4bf7-ad79-674f1b3a8c0a.mp4"
    
    if not os.path.exists(video_path):
        return {"error": "File not found", "path_checked": video_path}

    return FileResponse(video_path, media_type="video/mp4")

app.include_router(user.router)
app.include_router(auth.router)
app.include_router(edit.router)
app.include_router(segment.router)
app.include_router(history.router)