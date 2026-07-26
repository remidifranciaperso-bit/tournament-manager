from datetime import UTC, datetime, timedelta
from uuid import UUID

import bcrypt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from api.platform.config import JWT_ALGORITHM, JWT_EXPIRE_HOURS, JWT_SECRET
from api.platform.database import get_db
from api.platform.models import User

bearer = HTTPBearer(auto_error=False)

ROLE_OWNER = "owner"
ROLE_ORGANIZER = "organizer"
ACT_AS_HEADER = "X-Platform-Act-As"


def hash_password(password: str) -> str:
    digest = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return digest.decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: UUID) -> str:
    expire = datetime.now(tz=UTC) + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Non authentifié")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = UUID(payload["sub"])
    except (JWTError, ValueError, KeyError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session invalide") from exc

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur introuvable")
    return user


def is_platform_owner(user: User) -> bool:
    return user.role == ROLE_OWNER


def get_acting_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    x_platform_act_as: str | None = Header(default=None, alias=ACT_AS_HEADER),
) -> User:
    if not x_platform_act_as or x_platform_act_as == str(current_user.id):
        return current_user
    if not is_platform_owner(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé au propriétaire de la plateforme",
        )
    try:
        target_id = UUID(x_platform_act_as)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Utilisateur cible invalide") from exc
    target = db.get(User, target_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")
    if is_platform_owner(target):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Impossible d'accéder à ce compte")
    return target


def require_platform_owner(user: User = Depends(get_current_user)) -> User:
    if not is_platform_owner(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé au propriétaire de la plateforme",
        )
    return user
