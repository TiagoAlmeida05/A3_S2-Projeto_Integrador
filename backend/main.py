from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine

from routers import projects, documents, codes, segments, folders, memos, audio
from refi_service import export_refi_xml, import_refi_xml


models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="jUPiter QDA API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "SQLAlchemy Backend is running with Clean Architecture!"}

# --- ATTACH ALL ROUTERS ---
app.include_router(projects.router)
app.include_router(documents.router)
app.include_router(codes.router)
app.include_router(segments.router)
app.include_router(folders.router)
app.include_router(memos.router)
app.include_router(audio.router)


