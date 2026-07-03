FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PDF_CONVERTER=libreoffice \
    HOME=/tmp

# LibreOffice Impress (conversion PPTX -> PDF sans interface graphique)
# + polices : DejaVu / Liberation pour le texte, Noto Color Emoji pour les
# pictogrammes 🏆 🥈 ❌ utilisés dans les templates.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libreoffice-impress \
        libreoffice-core \
        fonts-dejavu \
        fonts-liberation \
        fonts-noto \
        fonts-noto-color-emoji \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Polices custom des templates (Grindy Brush, TSL Sans) : indispensables
# pour un rendu PDF fidèle des titres. fontconfig les associe par nom de
# famille, exactement comme le fait PowerPoint.
COPY fonts/ /usr/share/fonts/truetype/tournament/
RUN fc-cache -f -v > /dev/null

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Streamlit doit pouvoir écrire ses fichiers de config / d'exports.
RUN mkdir -p /app/exports \
    && chmod -R 777 /app/exports /tmp

EXPOSE 8501

# $PORT est fourni par la plupart des hébergeurs (Render, Railway...).
# Valeur par défaut 8501 en local.
CMD streamlit run app/ui.py \
    --server.port=${PORT:-8501} \
    --server.address=0.0.0.0 \
    --server.headless=true \
    --browser.gatherUsageStats=false
