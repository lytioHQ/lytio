from datetime import datetime
from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    industry: str = "sales"
    language: str = "zh"


class ProjectUpdate(BaseModel):
    title: str | None = None
    status: str | None = None


class ProjectResponse(BaseModel):
    id: int
    owner_id: int
    title: str
    industry: str
    language: str
    original_filename: str | None = None
    saved_filename: str | None = None
    schema_mapping: dict | None = None
    latest_summary: str | None = None
    status: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    last_opened_at: datetime | None = None

    model_config = {"from_attributes": True}
