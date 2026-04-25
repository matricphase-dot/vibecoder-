# backend/src/schemas/file_plan.py
from pydantic import BaseModel
from typing import List, Optional

class FunctionExport(BaseModel):
    name: str
    signature: str
    description: str
    return_type: Optional[str] = None

class FilePlanEntry(BaseModel):
    path: str
    purpose: str
    exports: List[FunctionExport] = []
    imports: List[str] = []

class FilePlan(BaseModel):
    files: List[FilePlanEntry]
