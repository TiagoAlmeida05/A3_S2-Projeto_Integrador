from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime

# Project Schemas

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    local_path: Optional[str] = None

class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    local_path: Optional[str] = None
    document_count: Optional[int] = 0 
    code_count: Optional[int] = 0
    last_accessed: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProjectUpdate(BaseModel):
    name: str
    description: Optional[str] = None
    local_path: Optional[str] = None

# Code Schemas

class CodeCreate(BaseModel):
    name: str
    color: str = "#FFFFFF"
    parent_id: Optional[int] = None

class CodeUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    parent_id: Optional[int] = None

class CodeReorderItem(BaseModel):
    id: int
    parent_id: Optional[int] = None
    order_index: int

class CodeReorderRequest(BaseModel):
    codes: List[CodeReorderItem]


# Segment Schemas 

class SegmentCreate(BaseModel):
    document_id: int
    code_id: int
    start_char: int
    end_char: int
    content: str


class SegmentUpdate(BaseModel):
    start_char: int
    end_char: int
    content: str


# Memo Schemas

class MemoBase(BaseModel):
    text: str
    target_type: str
    target_id: int

class MemoCreate(MemoBase):
    pass

class MemoUpdate(BaseModel):
    text: Optional[str] = None

class MemoResponse(MemoBase):
    id: int
    created_at: datetime
    target_name: Optional[str] = None  

    class Config:
        from_attributes = True

# Document and Folder Schemas

class FolderCreate(BaseModel):
    name: str

class FolderReorderItem(BaseModel):
    id: int
    order_index: int

class FolderReorderRequest(BaseModel):
    folders: List[FolderReorderItem]

class DocumentUpdateContent(BaseModel):
    content: str

class DocumentRename(BaseModel):
    filename: str

class DocumentCreateText(BaseModel):
    name: str
    content: str


class DocumentReorderItem(BaseModel):
    id: int
    order_index: int


class DocumentReorderRequest(BaseModel):
    documents: List[DocumentReorderItem]


class DocumentMetadataUpdate(BaseModel):
    metadata: Dict[str, Optional[str]]
