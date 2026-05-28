from sqlalchemy.orm import Session
from typing import Optional
from sqlalchemy import func
import json
import models

class DocumentRepository:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _deserialize_metadata(metadata_json):
        if not metadata_json:
            return {}

        if isinstance(metadata_json, dict):
            return metadata_json

        try:
            parsed = json.loads(metadata_json)
            return parsed if isinstance(parsed, dict) else {}
        except (TypeError, ValueError):
            return {}

    @staticmethod
    def _serialize_metadata(metadata):
        return json.dumps(metadata or {})

    def get_by_project(self, project_id: int, sort_by: str = "custom", sort_order: str = "asc", metadata_key: Optional[str] = None, metadata_value: Optional[str] = None):
        query = self.db.query(models.Document).filter(models.Document.project_id == project_id)

        if sort_by == "custom":
            query = query.order_by(models.Document.order_index.asc(), func.lower(models.Document.filename).asc())
        elif sort_by == "created_at":
            sort_column = models.Document.created_at
            if sort_order.lower() == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())
        else:
            sort_column = func.lower(models.Document.filename)
            if sort_order.lower() == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())

        documents = query.all()

        if metadata_key:
            normalized_key = metadata_key.strip()
            normalized_value = metadata_value.strip() if isinstance(metadata_value, str) else metadata_value
            filtered_documents = []

            for document in documents:
                metadata = self._deserialize_metadata(getattr(document, "metadata_json", None))
                if normalized_key not in metadata:
                    continue
                if normalized_value not in (None, "") and str(metadata.get(normalized_key, "")).strip() != str(normalized_value).strip():
                    continue
                filtered_documents.append(document)

            return filtered_documents

        return documents

    def get_by_id(self, project_id: int, document_id: int):
        return self.db.query(models.Document).filter(
            models.Document.id == document_id, 
            models.Document.project_id == project_id
        ).first()

    def create(self, project_id: int, filename: str, content: str, file_type: str = "text", metadata: Optional[dict] = None):
        next_order_index = (
            self.db.query(func.coalesce(func.max(models.Document.order_index), -1))
            .filter(models.Document.project_id == project_id)
            .scalar()
        ) + 1

        new_doc = models.Document(
            project_id=project_id,
            filename=filename,
            content=content,
            type=file_type,
            order_index=next_order_index,
            metadata_json=self._serialize_metadata(metadata),
        )
        self.db.add(new_doc)
        self.db.commit()
        self.db.refresh(new_doc)
        return new_doc

    def reorder(self, project_id: int, document_items: list):
        for item in document_items:
            document = self.db.query(models.Document).filter(
                models.Document.id == item.id,
                models.Document.project_id == project_id,
            ).first()
            if document:
                document.order_index = item.order_index
        self.db.commit()

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

    def update_metadata(self, project_id: int, document_id: int, metadata_updates: dict):
        doc = self.get_by_id(project_id, document_id)
        if not doc:
            return None

        current_metadata = self._deserialize_metadata(getattr(doc, "metadata_json", None))

        for key, value in metadata_updates.items():
            normalized_key = str(key).strip()
            if not normalized_key:
                continue

            if value is None or (isinstance(value, str) and not value.strip()):
                current_metadata.pop(normalized_key, None)
            else:
                current_metadata[normalized_key] = str(value).strip()

        doc.metadata_json = self._serialize_metadata(current_metadata)
        self.db.commit()
        self.db.refresh(doc)
        return doc

    def delete(self, project_id: int, document_id: int):
        doc = self.get_by_id(project_id, document_id)
        if doc:
            self.db.delete(doc)
            self.db.commit()
            return True
        return False