from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import os
import time

from app.database import get_db
from app.repositories.document_repo import DocumentRepository
from app.transcribe_service import transcribe_service

router = APIRouter(
    prefix="/projects/{project_id}/audio",
    tags=["audio"]
)

@router.post("/transcribe")
async def transcribe_audio(
    project_id: int, 
    language: str = "auto",
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    allowed_extensions = (".wav", ".mp3", ".m4a", ".webm", ".ogg", ".mpeg")
    if not file.filename.lower().endswith(allowed_extensions):
        raise HTTPException(
            status_code=400, 
            detail="Unsupported audio format. Please provide a standard audio container."
        )
        
    try:
        # Convert front-end "auto" label to standard Python None type
        whisper_lang = None if language == "auto" else language

        # 🌟 FIXED: Passing whisper_lang through to your service execution block
        transcribed_text = await transcribe_service.transcribe_audio_file(file, language=whisper_lang)
        
        if not transcribed_text:
            transcribed_text = "[Empty or un-decodable local audio captured]"

        base_name, _ = os.path.splitext(file.filename)
        document_filename = f"Transcript - {base_name}.txt"
        
        repo = DocumentRepository(db)
        
        existing_doc = repo.get_by_filename(project_id, document_filename)
        if existing_doc:
            document_filename = f"Transcript - {base_name}_{int(time.time())}.txt"

        new_doc = repo.create(
            project_id=project_id,
            filename=document_filename,
            content=transcribed_text,
            file_type="text"
        )
        
        return {
            "id": new_doc.id,
            "project_id": new_doc.project_id,
            "filename": new_doc.filename,
            "content": new_doc.content,
            "type": new_doc.type,
            "folder_id": getattr(new_doc, 'folder_id', None)
        }

    except Exception as e:
        print(f"CRITICAL BACKEND ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Local offline transcription failed: {str(e)}")