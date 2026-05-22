from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import schemas
import models
from repositories.memo_repo import MemoRepository

router = APIRouter(tags=["Memos"])

def get_memo_repo(db: Session = Depends(get_db)):
    return MemoRepository(db)

@router.get("/projects/{project_id}/memos", response_model=List[schemas.MemoResponse])
def list_memos(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    project_name = project.name if project else f"Project {project_id}"

    codes = db.query(models.Code).filter(models.Code.project_id == project_id).all()
    code_dict = {c.id: c.name for c in codes}

    segments = db.query(models.Segment).join(models.Document).filter(models.Document.project_id == project_id).all()
    segment_dict = {
        s.id: f'"{s.content[:30]}..."' if len(s.content) > 30 else f'"{s.content}"' 
        for s in segments
    }

    memos = []
    # Project memos
    for m in db.query(models.Memo).filter(models.Memo.target_type == "project", models.Memo.target_id == project_id).all():
        setattr(m, "target_name", project_name)
        memos.append(m)

    # Code memos
    if code_dict:
        for m in db.query(models.Memo).filter(models.Memo.target_type == "code", models.Memo.target_id.in_(code_dict.keys())).all():
            setattr(m, "target_name", code_dict.get(m.target_id, "Unknown Code"))
            memos.append(m)

    # Segment memos
    if segment_dict:
        for m in db.query(models.Memo).filter(models.Memo.target_type == "segment", models.Memo.target_id.in_(segment_dict.keys())).all():
            setattr(m, "target_name", segment_dict.get(m.target_id, "Unknown Segment"))
            memos.append(m)

    return memos

@router.post("/memos", response_model=schemas.MemoResponse)
def create_memo(memo: schemas.MemoCreate, repo: MemoRepository = Depends(get_memo_repo)):
    return repo.create(memo)

@router.put("/memos/{memo_id}", response_model=schemas.MemoResponse)
def update_memo(memo_id: int, memo: schemas.MemoUpdate, repo: MemoRepository = Depends(get_memo_repo)):
    updated = repo.update(memo_id, memo.text)
    if not updated:
        raise HTTPException(status_code=404, detail="Memo not found")
    return updated

@router.delete("/memos/{memo_id}")
def delete_memo(memo_id: int, repo: MemoRepository = Depends(get_memo_repo)):
    success = repo.delete(memo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Memo not found")
    return {"message": "Memo deleted successfully"}