import os

DEPLOY_TARGET = os.environ.get("DEPLOY_TARGET", "platform")
DATABASE_URL = os.environ.get("DATABASE_URL", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.environ.get("JWT_EXPIRE_HOURS", "168"))

ENGINE_V2_URL = os.environ.get(
    "ENGINE_V2_URL", "https://tournament-manager-engine-v2.onrender.com"
).rstrip("/")

LOGO_MAX_BYTES = int(os.environ.get("LOGO_MAX_BYTES", str(2 * 1024 * 1024)))
PDF_MAX_BYTES = int(os.environ.get("PDF_MAX_BYTES", str(20 * 1024 * 1024)))
# Starlette limite par défaut à 1 Mo — insuffisant pour PDF + captures Live.
MULTIPART_MAX_BYTES = int(
    os.environ.get("MULTIPART_MAX_BYTES", str(max(PDF_MAX_BYTES * 2, 30 * 1024 * 1024)))
)

# Phase test : crée admin@padel-test.fr, admin1@… avec profils club distincts.
PLATFORM_SEED_TEST_USERS = os.environ.get("PLATFORM_SEED_TEST_USERS", "").lower() in (
    "1",
    "true",
    "yes",
)
