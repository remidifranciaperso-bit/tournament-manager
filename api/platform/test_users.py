"""Comptes fictifs pour la phase de test — un utilisateur = une session isolée."""

from sqlalchemy.orm import Session

from api.platform.models import ClubProfile, User
from api.platform.security import hash_password

# Emails valides (format réel) mais domaine fictif réservé aux tests.
TEST_ACCOUNTS: tuple[tuple[str, str, str], ...] = (
    ("admin@padel-test.fr", "admin", "CLUB ADMIN"),
    ("admin1@padel-test.fr", "admin1", "CLUB TEST 1"),
    ("admin2@padel-test.fr", "admin2", "CLUB TEST 2"),
    ("admin3@padel-test.fr", "admin3", "CLUB TEST 3"),
)

DEFAULT_TERRAINS = ["TERRAIN 1", "TERRAIN 2", "TERRAIN 3", "TERRAIN 4"]


def seed_test_users(db: Session) -> int:
    """Crée les comptes de test manquants. Retourne le nombre de comptes créés."""
    created = 0
    for email, password, club_name in TEST_ACCOUNTS:
        existing = db.query(User).filter(User.email == email).one_or_none()
        if existing is not None:
            continue
        user = User(email=email, password_hash=hash_password(password))
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
    return [{"email": email, "password": password} for email, password, _club in TEST_ACCOUNTS]
