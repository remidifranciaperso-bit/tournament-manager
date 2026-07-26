import os

DEPLOY_TARGET = os.environ.get("DEPLOY_TARGET", "platform")
DATABASE_URL = os.environ.get("DATABASE_URL", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.environ.get("JWT_EXPIRE_HOURS", "168"))

ENGINE_V2_URL = os.environ.get(
    "ENGINE_V2_URL", "https://tournament-manager-engine-v2.onrender.com"
).rstrip("/")

PLATFORM_DATA_DIR = os.environ.get("PLATFORM_DATA_DIR", "/data/platform")
LOGO_SUBDIR = "logos"
UPLOADS_SUBDIR = "uploads"
