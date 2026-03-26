import argparse
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Sequence

from core.database import db_manager
from services.monetization import MonetizationService


logger = logging.getLogger(__name__)


def parse_as_of(raw_value: str | None) -> datetime | None:
    if raw_value is None:
        return None

    normalized_value = raw_value.strip()
    if normalized_value.endswith("Z"):
        normalized_value = f"{normalized_value[:-1]}+00:00"

    parsed_value = datetime.fromisoformat(normalized_value)
    if parsed_value.tzinfo is None:
        return parsed_value.replace(tzinfo=timezone.utc)

    return parsed_value.astimezone(timezone.utc)


async def run_expirations(as_of: datetime | None = None) -> dict[str, object]:
    await db_manager.ensure_initialized()
    if db_manager.async_session_maker is None:
        raise RuntimeError("Database session maker is not initialized")

    try:
        async with db_manager.async_session_maker() as session:
            return await MonetizationService(session).expire_due_entities(as_of=as_of)
    finally:
        await db_manager.close_db()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run listing and subscription expiration logic on demand")
    parser.add_argument(
        "--as-of",
        dest="as_of",
        help="UTC timestamp used to simulate expiration processing, for example 2026-03-26T09:00:00+00:00",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        help="Logging level for command execution",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    logging.basicConfig(level=getattr(logging, args.log_level), format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

    try:
        summary = asyncio.run(run_expirations(as_of=parse_as_of(args.as_of)))
    except Exception:
        logger.exception("Manual expiration command failed")
        return 1

    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
