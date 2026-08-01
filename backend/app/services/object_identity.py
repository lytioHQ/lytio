"""Deterministic stable IDs for Business Objects.

Generates short fingerprints from object type + title + key fields.
The same input always produces the same ID — supporting future
lifecycle tracking, comparison, and trend analysis.
"""

import hashlib

PREFIXES = {
    "Metric": "metric",
    "Insight": "insight",
    "Risk": "risk",
    "Recommendation": "recommendation",
}


def make_id(obj_type: str, title: str, extra: str = "") -> str:
    """Generate a deterministic, stable fingerprint.

    Example:
        make_id("Risk", "Revenue decline", "high") -> "risk_3af81d2a"
    """
    prefix = PREFIXES.get(obj_type, obj_type.lower())
    seed = f"{obj_type}:{title}:{extra}".encode("utf-8")
    digest = hashlib.md5(seed).hexdigest()[:7]
    return f"{prefix}_{digest}"


def assign_ids_to_result(result):
    """Assign stable IDs to all objects in an AnalysisResult.

    Only assigns IDs to objects that don't already have one.
    Objects from AI JSON won't have IDs; historical objects keep theirs.
    """
    for i, obj in enumerate(result.metrics):
        if not obj.id:
            obj.id = make_id("Metric", obj.name, f"{obj.value}_{i}")

    for i, obj in enumerate(result.insights):
        if not obj.id:
            obj.id = make_id("Insight", obj.title, f"{obj.confidence}_{i}")

    for i, obj in enumerate(result.risks):
        if not obj.id:
            obj.id = make_id("Risk", obj.title, f"{obj.severity}_{i}")

    for i, obj in enumerate(result.recommendations):
        if not obj.id:
            obj.id = make_id("Recommendation", obj.title, f"{obj.priority}_{i}")

    return result