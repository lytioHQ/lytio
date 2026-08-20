from pydantic import BaseModel, Field


class FieldMappingPayload(BaseModel):
    """One user-confirmed (or auto-detected) canonical mapping."""

    canonical_key: str = Field(..., description="Canonical sales field key")
    source_column: str | None = Field(
        None, description="Original Excel column name; null marks the field unavailable"
    )


class SchemaMappingSaveRequest(BaseModel):
    """Persist user-confirmed canonical mappings for a project."""

    mappings: list[FieldMappingPayload] = Field(
        default_factory=list, min_length=0,
        description="Legacy confirmed mappings; still accepted for backward compatibility",
    )
    actions: list["SchemaActionPayload"] = Field(
        default_factory=list, min_length=0,
        description="M2.13.1 confirm/modify/skip actions (takes precedence over mappings)",
    )
    version: int = 2


class SchemaActionPayload(BaseModel):
    """One user confirmation action for a canonical field (M2.13.1)."""

    canonical_key: str = Field(..., description="Canonical sales field key")
    action: str = Field(..., description="confirm | modify | skip")
    source_column: str | None = Field(
        None, description="Target source column for modify; null marks the field unavailable"
    )
