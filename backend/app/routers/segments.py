from typing import Optional
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.database import get_db
import app.schemas as schemas
import app.models as models
from app.repositories import SegmentRepository
from app.services.csv_service import create_codebook_csv

# We use an empty prefix here because we have two different base paths
router = APIRouter(tags=["Segments"])

def get_seg_repo(db: Session = Depends(get_db)):
    return SegmentRepository(db)

@router.post("/projects/{project_id}/segments")
def create_segment(project_id: int, segment: schemas.SegmentCreate, repo: SegmentRepository = Depends(get_seg_repo)):
    return repo.create(segment)

@router.get("/projects/{project_id}/segments")
def get_segments(project_id: int, document_id: Optional[int] = None, repo: SegmentRepository = Depends(get_seg_repo)):
    segments = repo.get_by_project(project_id, document_id)
    return [{
        "id": seg.id, "document_id": seg.document_id, "code_id": seg.code_id,
        "start_char": seg.start_char, "end_char": seg.end_char, "content": seg.content
    } for seg in segments]

@router.put("/projects/{project_id}/segments/{segment_id}")
def update_segment(project_id: int, segment_id: int, seg_update: schemas.SegmentUpdate, repo: SegmentRepository = Depends(get_seg_repo)):
    segment = repo.update(project_id, segment_id, seg_update)
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    return {"message": "Segment updated"}

@router.delete("/projects/{project_id}/segments/{segment_id}")
def delete_segment(project_id: int, segment_id: int, repo: SegmentRepository = Depends(get_seg_repo)):
    success = repo.delete(project_id, segment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Segment not found")
    return {"message": "Segment deleted successfully"}

@router.get("/codes/{code_id}/segments")
def get_segments_by_code(code_id: int, include_children: bool = False, db: Session = Depends(get_db)):
    # Kept DB injection here for simplicity of the recursive child search
    target_code_ids = [code_id]
    if include_children:
        def get_all_children(current_id):
            children = db.query(models.Code).filter(models.Code.parent_id == current_id).all()
            for child in children:
                target_code_ids.append(child.id)
                get_all_children(child.id)
        get_all_children(code_id)

    segments = db.query(models.Segment).join(models.Document).filter(
        models.Segment.code_id.in_(target_code_ids)
    ).order_by(models.Segment.document_id, models.Segment.start_char).all()

    results = []
    for seg in segments:
        doc_text = seg.document.content
        start = max(0, seg.start_char - 200)
        end = min(len(doc_text), seg.end_char + 200)
        results.append({
            "id": seg.id, "document_id": seg.document_id, "document_filename": seg.document.filename,
            "start_char": seg.start_char, "end_char": seg.end_char, 
            "position_label": f"{seg.document.filename}, pos: {seg.start_char}-{seg.end_char}",
            "context": doc_text[start:end], "highlight_start": seg.start_char - start,
            "highlight_end": seg.end_char - start, "code_name": seg.code.name, "code_color": seg.code.color
        })
    return results


@router.get("/projects/{project_id}/segments/export/csv")
def export_segments_csv(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    output, safe_filename = create_codebook_csv(project)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename*=utf-8''{safe_filename}"}
    )

