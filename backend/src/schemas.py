from typing import List, Optional
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


from datetime import datetime
from typing import List, Optional, Dict

class ComplianceIssue(BaseModel):
    rule_id: str
    description: str
    impact: str  # 'critical', 'serious', 'moderate', 'minor'
    element: Optional[str] = None
    fix_suggestion: Optional[str] = None
    fixable: bool = False

class ComplianceScanRequest(BaseModel):
    scan_type: str = "both"  # 'accessibility', 'gdpr', 'both'

class ComplianceScanResponse(BaseModel):
    scan_id: int
    project_id: int
    scan_type: str
    issues: List[ComplianceIssue]
    summary: Dict[str, int]
    created_at: datetime

class ActivityLog(BaseModel):
    id: int
    workspace_id: int
    user_id: int
    action: str
    details: dict
    timestamp: datetime

    class Config:
        from_attributes = True


class MarketplaceItemBase(BaseModel):
    name: str
    description: str
    type: str
    content: dict

class MarketplaceItemCreate(MarketplaceItemBase):
    pass

class MarketplaceItem(MarketplaceItemBase):
    id: int
    author_id: int
    downloads: int
    rating: float
    created_at: datetime
    
    class Config:
        from_attributes = True
