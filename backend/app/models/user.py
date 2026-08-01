from datetime import datetime, timedelta, timezone
from sqlalchemy import Column, Integer, String, DateTime, func
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    plan = Column(String(20), nullable=False, default="trial")
    trial_started_at = Column(DateTime(timezone=True), server_default=func.now())
    trial_ends_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.plan == "trial" and self.trial_ends_at is None:
            self.trial_ends_at = (self.trial_started_at or datetime.now(timezone.utc)) + timedelta(days=14)