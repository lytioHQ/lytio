from pydantic import BaseModel, Field


class FieldMappingPayload(BaseModel):
    """One user-confirmed (or auto-detected) canonical mapping."""

    canonical_key: str = Field(..., description="Canonical sales field key")
    source_column: str | None = Field(
        None, description="Original Excel column name; null marks the field unavailable"
    )


class SchemaMappingSaveRequest(BaseModel):
    """Persist user-confirmed canonical mappings for a project."""

    mappings: list[FieldMappingPayload] = Field(..., min_length=0)
    version: int = 1
