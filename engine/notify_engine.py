import os
import smtplib
from email.mime.application import MIMEApplication
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OWNER_EMAIL = os.environ.get(
    "OWNER_EMAIL",
    "remi.difrancia.perso@gmail.com",
)
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")


def _resume_lignes(resume: dict) -> list[tuple[str, str]]:
    return [
        ("Club organisateur", resume.get("club", "—")),
        ("Date", resume.get("date", "—")),
        ("Horaires", resume.get("heures", "—")),
        ("Type", resume.get("type", "—")),
        ("Nombre d'équipes", str(resume.get("nb_equipes", "—"))),
        ("Déroulement", resume.get("mode", "—")),
        ("Jours", str(resume.get("jours", "—"))),
        ("Terrains", str(resume.get("terrains", "—"))),
        ("Durée des matchs", resume.get("duree_match", "—")),
    ]


def generer_image_resume(resume: dict) -> bytes:
    lignes = _resume_lignes(resume)
    ligne_h = 44
    pad_x = 28
    pad_y = 36
    width = 720
    height = pad_y * 2 + 52 + len(lignes) * ligne_h

    img = Image.new("RGB", (width, height), "#0a1219")
    draw = ImageDraw.Draw(img)

    try:
        title_font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            22,
        )
        label_font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            14,
        )
        value_font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            15,
        )
    except OSError:
        title_font = ImageFont.load_default()
        label_font = ImageFont.load_default()
        value_font = ImageFont.load_default()

    draw.rounded_rectangle(
        (12, 12, width - 12, height - 12),
        radius=18,
        outline="#6b8f3a",
        width=2,
    )
    draw.text(
        (pad_x, pad_y),
        "Résumé du tournoi",
        fill="#d4ff4a",
        font=title_font,
    )

    y = pad_y + 52
    for i, (label, value) in enumerate(lignes):
        if i % 2 == 0:
            draw.rectangle(
                (pad_x - 8, y - 6, width - pad_x + 8, y + ligne_h - 10),
                fill="#142018",
            )
        draw.text((pad_x, y), label.upper(), fill="#8a9aa8", font=label_font)
        valeur = str(value)
        bbox = draw.textbbox((0, 0), valeur, font=value_font)
        text_w = bbox[2] - bbox[0]
        draw.text(
            (width - pad_x - text_w, y),
            valeur,
            fill="#d4ff4a",
            font=value_font,
        )
        y += ligne_h

    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


def _corps_texte(resume: dict) -> str:
    lignes = [
        "Un tournoi vient d'être généré sur Padel Tournament Engine.",
        "",
        *[
            f"{label} : {value}"
            for label, value in _resume_lignes(resume)
        ],
        "",
        f"PDF : {resume.get('pdf_filename', 'tournoi.pdf')}",
    ]
    return "\n".join(lignes)


def envoyer_notification_proprietaire(
    pdf_path: Path,
    resume: dict,
) -> None:
    if not SMTP_USER or not SMTP_PASSWORD:
        print("Notify: SMTP non configuré — envoi ignoré.")
        return

    if not pdf_path.exists():
        print(f"Notify: PDF introuvable ({pdf_path})")
        return

    club = resume.get("club", "Tournoi")
    date = resume.get("date", "")
    sujet = f"[PTE] Tournoi généré — {club} — {date}"

    message = MIMEMultipart()
    message["Subject"] = sujet
    message["From"] = SMTP_USER
    message["To"] = OWNER_EMAIL
    message.attach(MIMEText(_corps_texte(resume), "plain", "utf-8"))

    png_bytes = generer_image_resume(resume)
    image = MIMEImage(png_bytes, _subtype="png")
    image.add_header("Content-Disposition", "attachment", filename="resume-tournoi.png")
    message.attach(image)

    pdf_bytes = pdf_path.read_bytes()
    pdf_part = MIMEApplication(pdf_bytes, _subtype="pdf")
    pdf_name = resume.get("pdf_filename", pdf_path.name)
    pdf_part.add_header("Content-Disposition", "attachment", filename=pdf_name)
    message.attach(pdf_part)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as smtp:
        smtp.starttls()
        smtp.login(SMTP_USER, SMTP_PASSWORD)
        smtp.sendmail(SMTP_USER, [OWNER_EMAIL], message.as_string())

    print(f"Notify: email envoyé à {OWNER_EMAIL} ({pdf_name})")
