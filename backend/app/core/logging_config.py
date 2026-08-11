"""Structured JSON logging for production.

Logs: login, upload, analysis, delete, errors.
Never logs business data, file contents, or PII beyond user_id.
"""

import json
import logging
import sys
from datetime import datetime, timezone


class StructuredFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "event": getattr(record, "event", record.msg),
            "user_id": getattr(record, "user_id", None),
            "project_id": getattr(record, "project_id", None),
        }
        if record.exc_info and record.exc_info[1]:
            payload["error"] = str(record.exc_info[1])
        return json.dumps(payload, ensure_ascii=False)


def setup_logging():
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredFormatter())
    root = logging.getLogger("lytio")
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.INFO)
    return root


logger = setup_logging()