from sqlalchemy import Column, Integer, String, DateTime, func
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    event = Column(String(50), nullable=False)  # upload, analysis, delete, login, logout
    project_id = Column(Integer, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())