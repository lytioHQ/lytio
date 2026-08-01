from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from app.core.database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    industry = Column(String(50), nullable=False, default="sales")
    language = Column(String(10), nullable=False, default="zh")
    original_filename = Column(String(500), nullable=True)
    saved_filename = Column(String(500), nullable=True)
    status = Column(String(20), nullable=False, default="draft")
    latest_summary = Column(String(5000), nullable=True)
    latest_result_json = Column(String(20000), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_opened_at = Column(DateTime(timezone=True), server_default=func.now())