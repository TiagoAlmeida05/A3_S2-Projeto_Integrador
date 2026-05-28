from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import schemas
from repositories.code_repo import CodeRepository

router = APIRouter(prefix="/projects/{project_id}/codes", tags=["Codes"])

def get_code_repo(db: Session = Depends(get_db)):
    return CodeRepository(db)

@router.get("/")
def get_project_codes(project_id: int, repo: CodeRepository = Depends(get_code_repo)):
    codes = repo.get_by_project(project_id)
    return [{
        "id": c.id, "name": c.name, "color": c.color, "description": c.description,
        "project_id": c.project_id, "parent_id": c.parent_id, "order_index": c.order_index,
        "frequency": len(c.segments) 
    } for c in codes]

@router.post("/")
def create_code(project_id: int, code: schemas.CodeCreate, repo: CodeRepository = Depends(get_code_repo)):
    return repo.create(project_id, code)

@router.put("/reorder")
def reorder_codes(project_id: int, reorder_request: schemas.CodeReorderRequest, repo: CodeRepository = Depends(get_code_repo)):
    repo.reorder(project_id, reorder_request.codes)
    return {"message": "Codes reordered successfully"}

@router.put("/{code_id}")
def update_code(project_id: int, code_id: int, code_update: schemas.CodeUpdate, repo: CodeRepository = Depends(get_code_repo)):
    code = repo.update(project_id, code_id, code_update)
    if not code:
        raise HTTPException(status_code=404, detail="Code not found")
    return code

@router.delete("/{code_id}")
def delete_code(project_id: int, code_id: int, repo: CodeRepository = Depends(get_code_repo)):
    success = repo.delete(project_id, code_id)
    if not success:
        raise HTTPException(status_code=404, detail="Code not found")
    return {"message": "Code deleted successfully"}

@router.post("/merge")
def merge_codes(project_id: int, merge_req: schemas.CodeMergeRequest, repo: CodeRepository = Depends(get_code_repo)):
    success = repo.merge(project_id, merge_req.source_code_id, merge_req.target_code_id)
    if not success:
        raise HTTPException(status_code=400, detail="Merge failed. Ensure both codes exist.")
    return {"message": "Codes merged successfully"}