from sqlalchemy.orm import Session
from typing import Optional
import models
import schemas

class CodeRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_project(self, project_id: int):
        return self.db.query(models.Code).filter(
            models.Code.project_id == project_id
        ).order_by(models.Code.order_index).all()

    def create(self, project_id: int, code_data: schemas.CodeCreate):
        new_code = models.Code(
            name=code_data.name,
            color=code_data.color,
            description=code_data.description,
            project_id=project_id,
            parent_id=code_data.parent_id
        )
        self.db.add(new_code)
        self.db.commit()
        self.db.refresh(new_code)
        return new_code

    def update(self, project_id: int, code_id: int, update_data: schemas.CodeUpdate):
        code = self.db.query(models.Code).filter(
            models.Code.id == code_id, models.Code.project_id == project_id
        ).first()
        if code:
            if update_data.name is not None: code.name = update_data.name
            if update_data.color is not None: code.color = update_data.color
            self.db.commit()
            self.db.refresh(code)
        return code

    def reorder(self, project_id: int, code_items: list):
        for item in code_items:
            code = self.db.query(models.Code).filter(
                models.Code.id == item.id, models.Code.project_id == project_id
            ).first()
            if code:
                code.parent_id = item.parent_id
                code.order_index = item.order_index
        self.db.commit()

    def delete(self, project_id: int, code_id: int):
        code = self.db.query(models.Code).filter(
            models.Code.id == code_id, models.Code.project_id == project_id
        ).first()
        if code:
            # Delete associated memos
            self.db.query(models.Memo).filter(
                models.Memo.target_type == "code", models.Memo.target_id == code_id
            ).delete()
            
            self.db.delete(code)
            self.db.commit()
            return True
        return False