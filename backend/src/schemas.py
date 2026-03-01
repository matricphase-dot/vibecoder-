from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    name: str
    project_id: str
    url: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectOut(ProjectBase):
    id: int
    created_at: datetime
    user_id: int

    class Config:
        from_attributes = True

class WorkspaceBase(BaseModel):
    name: str

class WorkspaceCreate(WorkspaceBase):
    pass

class WorkspaceOut(WorkspaceBase):
    id: int
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class WorkspaceDetailOut(WorkspaceOut):
    members: List[dict] = []  # We'll populate later

class ProjectOut(ProjectBase):
    id: int
    created_at: datetime
    user_id: int
    workspace_id: Optional[int] = None
