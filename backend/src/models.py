from sqlalchemy import Float, JSON, create_engine, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

import os
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./users.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    plan = Column(String, default='free')
    trial_start = Column(DateTime, default=datetime.utcnow)
    projects_used = Column(Integer, default=0)
    max_projects = Column(Integer, default=999)
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    projects = relationship("Project", back_populates="owner")

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    project_id = Column(String, unique=True, index=True)  # the folder ID
    url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="projects")

    compliance_scans = relationship("ComplianceScan", back_populates="project", cascade="all, delete-orphan")
Base.metadata.create_all(bind=engine)

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)  # e.g., 'invite', 'remove', 'update_role', 'create_project'
    details = Column(JSON)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    workspace = relationship("Workspace", back_populates="activity_logs")
    user = relationship("User", foreign_keys=[user_id])


class MarketplaceItem(Base):
    __tablename__ = "marketplace_items"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    type = Column(String)  # 'agent', 'template'
    content = Column(JSON)  # For agents: code; for templates: file structure
    author_id = Column(Integer, ForeignKey("users.id"))
    downloads = Column(Integer, default=0)
    rating = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    author = relationship("User", foreign_keys=[author_id])


class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("marketplace_items.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    rating = Column(Integer)  # 1-5
    comment = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    item = relationship("MarketplaceItem", back_populates="reviews")
    user = relationship("User", foreign_keys=[user_id])
