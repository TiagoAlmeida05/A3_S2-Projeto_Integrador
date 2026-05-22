from sqlalchemy.orm import Session
from typing import Optional
import models

class DocumentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_project(self, project_id: int):
        return self.db.query(models.Document).filter(models.Document.project_id == project_id).all()

    def get_by_id(self, project_id: int, document_id: int):
        return self.db.query(models.Document).filter(
            models.Document.id == document_id, 
            models.Document.project_id == project_id
        ).first()

    def create(self, project_id: int, filename: str, content: str, file_type: str = "text"):
        new_doc = models.Document(
            project_id=project_id,
            filename=filename,
            content=content,
            type=file_type
        )
        self.db.add(new_doc)
        self.db.commit()
        self.db.refresh(new_doc)
        return new_doc

    def update_content(self, project_id: int, document_id: int, content: str):
        doc = self.get_by_id(project_id, document_id)
        if doc:
            doc.content = content
            self.db.commit()
            self.db.refresh(doc)
            return doc
        return None

    def move_to_folder(self, project_id: int, document_id: int, folder_id: Optional[int]):
        doc = self.get_by_id(project_id, document_id)
        if doc:
            doc.folder_id = folder_id
            self.db.commit()
            return doc
        return None

    def delete(self, project_id: int, document_id: int):
        doc = self.get_by_id(project_id, document_id)
        if doc:
            self.db.delete(doc)
            self.db.commit()
            return True
        return False