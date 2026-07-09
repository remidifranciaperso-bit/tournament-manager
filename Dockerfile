# Runtime Python + LibreOffice.
# Le frontend est servi depuis frontend/dist (pre-build commité, pas de npm ici).
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PDF_CONVERTER=libreoffice \
    HOME=/tmp

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

COPY fonts/ /usr/share/fonts/truetype/tournament/
RUN fc-cache -f -v > /dev/null

WORKDIR /app

COPY requirements-docker.txt .
RUN pip install --no-cache-dir -r requirements-docker.txt

COPY . .

RUN test -f frontend/dist/index.html

RUN mkdir -p /app/exports \
    && chmod -R 777 /app/exports /tmp

EXPOSE 8000

CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
