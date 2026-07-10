# Runtime Python. Manager preview : sans LibreOffice (PDF via Engine prod).
# Engine prod (main) : avec LibreOffice.
# Détection : docker-profiles/preview.marker présent sur feature/manager.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PDF_CONVERTER=libreoffice \
    HOME=/tmp

COPY docker-profiles/ /tmp/docker-profiles/
COPY requirements-docker.txt requirements-preview.txt /tmp/requirements/

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        fonts-dejavu \
        fonts-liberation \
        fonts-noto \
        fonts-noto-color-emoji \
    && if [ ! -f /tmp/docker-profiles/preview.marker ]; then \
         apt-get install -y --no-install-recommends \
           libreoffice-impress \
           libreoffice-core; \
       fi \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY fonts/ /usr/share/fonts/truetype/tournament/
RUN fc-cache -f -v > /dev/null || true

WORKDIR /app

RUN if [ -f /tmp/docker-profiles/preview.marker ]; then \
      pip install --no-cache-dir -r /tmp/requirements/requirements-preview.txt; \
    else \
      pip install --no-cache-dir -r /tmp/requirements/requirements-docker.txt; \
    fi

COPY . .

RUN test -f frontend/dist/index.html

RUN mkdir -p /app/exports \
    && chmod -R 777 /app/exports /tmp

EXPOSE 8000

CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
