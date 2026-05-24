from sqlalchemy.orm import Session
from typing import Optional
import models
import schemas

class SegmentRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, segment_data: schemas.SegmentCreate):
        new_segment = models.Segment(
            document_id=segment_data.document_id,
            code_id=segment_data.code_id,
            start_char=segment_data.start_char,
            end_char=segment_data.end_char,
            content=segment_data.content
        )
        self.db.add(new_segment)
        self.db.commit()
        self.db.refresh(new_segment)
        return new_segment

    def get_by_project(self, project_id: int, document_id: Optional[int] = None):
        query = self.db.query(models.Segment).join(models.Document).filter(
            models.Document.project_id == project_id
        )
        if document_id:
            query = query.filter(models.Segment.document_id == document_id)
        return query.all()

    def update(self, project_id: int, segment_id: int, seg_update: schemas.SegmentUpdate):
        segment = self.db.query(models.Segment).join(models.Document).filter(
            models.Segment.id == segment_id, models.Document.project_id == project_id
        ).first()
        if segment:
            segment.start_char = seg_update.start_char
            segment.end_char = seg_update.end_char
            segment.content = seg_update.content
            self.db.commit()
        return segment

    def delete(self, project_id: int, segment_id: int):
        segment = self.db.query(models.Segment).join(models.Document).filter(
            models.Segment.id == segment_id, models.Document.project_id == project_id
        ).first()
        if segment:
            self.db.delete(segment)
            self.db.commit()
            return True
        return False