from sqlalchemy.orm import Session

import app.models as models

class FolderRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_project(self, project_id: int):
        return self.db.query(models.DocumentFolder).filter(
            models.DocumentFolder.project_id == project_id
        ).order_by(models.DocumentFolder.order_index).all()

    def create(self, project_id: int, name: str,parent_id: int = None):
        new_folder = models.DocumentFolder(name=name, project_id=project_id,parent_id=parent_id)
        self.db.add(new_folder)
        self.db.commit()
        self.db.refresh(new_folder)
        return new_folder

    def reorder(self, project_id: int, folder_items: list):
        for item in folder_items:
            folder = self.db.query(models.DocumentFolder).filter(
                models.DocumentFolder.id == item.id,
                models.DocumentFolder.project_id == project_id
            ).first()
            if folder:
                folder.order_index = item.order_index
        self.db.commit()

    def delete(self, project_id: int, folder_id: int):
        folder = self.db.query(models.DocumentFolder).filter(
            models.DocumentFolder.id == folder_id,
            models.DocumentFolder.project_id == project_id
        ).first()
        if folder:
            self.db.delete(folder)
            self.db.commit()
            return True
        return False
    
    def move(self, project_id: int, folder_id: int, parent_id: int = None):
        folder = self.db.query(models.DocumentFolder).filter(
            models.DocumentFolder.id == folder_id,
            models.DocumentFolder.project_id == project_id
        ).first()
        
        if folder:
            # Prevent a folder from being moved into itself
            if folder_id == parent_id:
                return folder
                
            folder.parent_id = parent_id
            self.db.commit()
            self.db.refresh(folder)
            return folder
        return None
    
    def update_name(self, project_id: int, folder_id: int, new_name: str):
        folder = self.db.query(models.DocumentFolder).filter(
            models.DocumentFolder.id == folder_id,
            models.DocumentFolder.project_id == project_id
        ).first()
        
        if folder:
            folder.name = new_name
            self.db.commit()
            self.db.refresh(folder)
            return folder
        return None