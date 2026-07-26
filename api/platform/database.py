from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from api.platform.config import DATABASE_URL

engine = create_engine(DATABASE_URL or "sqlite:////tmp/platform-dev.sqlite", pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def migrate_schema() -> None:
    """Applique les évolutions légères (ex. logos en BDD) sans psql manuel."""
    if not DATABASE_URL:
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE club_profiles ADD COLUMN IF NOT EXISTS logo_data BYTEA"))
        conn.execute(text("ALTER TABLE club_profiles ADD COLUMN IF NOT EXISTS logo_content_type TEXT"))
        conn.execute(text("ALTER TABLE club_profiles DROP COLUMN IF EXISTS logo_path"))


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
