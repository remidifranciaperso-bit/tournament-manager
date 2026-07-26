"""Comptes fictifs pour la phase de test — un utilisateur = une session isolée."""

from sqlalchemy.orm import Session

from api.platform.models import ClubProfile, User
from api.platform.security import ROLE_ORGANIZER, ROLE_OWNER, hash_password

# Compte propriétaire plateforme (accès liste utilisateurs + navigation en leur nom).
OWNER_ACCOUNT: tuple[str, str, str] = ("proprietaire@padel-test.fr", "proprietaire", "PLATEFORME")

# Emails valides (format réel) mais domaine fictif réservé aux tests.
TEST_ACCOUNTS: tuple[tuple[str, str, str], ...] = (
    ("admin@padel-test.fr", "admin", "CLUB ADMIN"),
    ("admin1@padel-test.fr", "admin1", "CLUB TEST 1"),
    ("admin2@padel-test.fr", "admin2", "CLUB TEST 2"),
    ("admin3@padel-test.fr", "admin3", "CLUB TEST 3"),
)

DEFAULT_TERRAINS = ["TERRAIN 1", "TERRAIN 2", "TERRAIN 3", "TERRAIN 4"]


def _ensure_owner_account(db: Session) -> bool:
    email, password, club_name = OWNER_ACCOUNT
    existing = db.query(User).filter(User.email == email).one_or_none()
    if existing is not None:
        changed = False
        if existing.role != ROLE_OWNER:
            existing.role = ROLE_OWNER
            changed = True
        if existing.club_profile is None:
            db.add(
                ClubProfile(
                    user_id=existing.id,
                    club=club_name,
                    nb_terrains=4,
                    terrains=DEFAULT_TERRAINS.copy(),
                    terrain_principal="TERRAIN 1",
                )
            )
            changed = True
        if changed:
            db.commit()
        return False

    user = User(email=email, password_hash=hash_password(password), role=ROLE_OWNER)
    db.add(user)
    db.flush()
    db.add(
        ClubProfile(
            user_id=user.id,
            club=club_name,
            nb_terrains=4,
            terrains=DEFAULT_TERRAINS.copy(),
            terrain_principal="TERRAIN 1",
        )
    )
    db.commit()
    return True


def seed_test_users(db: Session) -> int:
    """Crée les comptes de test manquants. Retourne le nombre de comptes créés."""
    created = 1 if _ensure_owner_account(db) else 0
    for email, password, club_name in TEST_ACCOUNTS:
        existing = db.query(User).filter(User.email == email).one_or_none()
        if existing is not None:
            continue
        user = User(email=email, password_hash=hash_password(password), role=ROLE_ORGANIZER)
        db.add(user)
        db.flush()
        db.add(
            ClubProfile(
                user_id=user.id,
                club=club_name,
                nb_terrains=4,
                terrains=DEFAULT_TERRAINS.copy(),
                terrain_principal="TERRAIN 1",
            )
        )
        created += 1
    if created:
        db.commit()
    return created


def test_account_hints() -> list[dict[str, str]]:
    owner_email, owner_password, _club = OWNER_ACCOUNT
    hints = [{"email": owner_email, "password": owner_password}]
    hints.extend({"email": email, "password": password} for email, password, _club in TEST_ACCOUNTS)
    return hints
