def clean_text(txt):
    if txt is None:
        return ""

    txt = str(txt).strip()

    while "  " in txt:
        txt = txt.replace("  ", " ")

    return txt


def normalize_firstname(prenom):
    prenom = clean_text(prenom)
    return prenom.title()


def normalize_lastname(nom):
    nom = clean_text(nom)
    return nom.upper()


def full_name(prenom, nom):
    return f"{normalize_firstname(prenom)} {normalize_lastname(nom)}"