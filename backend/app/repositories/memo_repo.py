from sqlalchemy.orm import Session
from datetime import datetime, timezone

import app.models as models
import app.schemas as schemas

class MemoRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, memo_data: schemas.MemoCreate):
        new_memo = models.Memo(
            text=memo_data.text,
            target_type=memo_data.target_type,
            target_id=memo_data.target_id,
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(new_memo)
        self.db.commit()
        self.db.refresh(new_memo)
        return new_memo

    def update(self, memo_id: int, text: str):
        memo = self.db.query(models.Memo).filter(models.Memo.id == memo_id).first()
        if memo:
            memo.text = text
            self.db.commit()
            self.db.refresh(memo)
        return memo

    def delete(self, memo_id: int):
        memo = self.db.query(models.Memo).filter(models.Memo.id == memo_id).first()
        if memo:
            self.db.delete(memo)
            self.db.commit()
            return True
        return False