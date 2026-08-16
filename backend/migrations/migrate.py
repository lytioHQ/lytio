"""M2.11 Phase B migration runner.

Applies idempotent ``backend/migrations/*.sql`` files to Postgres in filename
order. This runner is deliberately separate from ``init_db()`` so schema
changes never execute automatically on deploy.

Safety gate: production migrations must only run after a verified database
backup/snapshot. Set ``DB_BACKUP_CONFIRMED=true`` only after that backup exists.
"""

import asyncio
import os
import pathlib
import sys

MIGRATIONS_DIR = pathlib.Path(__file__).resolve().parent


def _normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    if url.startswith("postgresql://"):
        return url
    raise ValueError("DATABASE_URL must be a postgres:// or postgresql:// connection string")


async def _run() -> int:
    url = os.getenv("DATABASE_URL")
    if not url:
        print("DATABASE_URL is not set.")
        return 2

    confirmed = os.getenv("DB_BACKUP_CONFIRMED", "").strip().lower() in {"1", "true", "yes"}
    if not confirmed:
        print("BACKUP REQUIRED BEFORE MIGRATION")
        print("Refusing to run migrations without a verified production DB backup/snapshot.")
        print("Set DB_BACKUP_CONFIRMED=true only after that backup has been confirmed.")
        return 3

    import asyncpg

    conn = await asyncpg.connect(_normalize_database_url(url))
    try:
        for sql_file in sorted(MIGRATIONS_DIR.glob("*.sql")):
            sql = sql_file.read_text(encoding="utf-8")
            statements = [part.strip() for part in sql.split(";") if part.strip()]
            for statement in statements:
                await conn.execute(statement)
            print(f"applied {sql_file.name} ({len(statements)} statements)")
    finally:
        await conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(_run()))
