# Stage 1 : build frontend Vite (source -> frontend/dist)
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2 : runtime Python + LibreOffice
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PDF_CONVERTER=libreoffice \
    HOME=/tmp \
    MALLOC_ARENA_MAX=2 \
    SAL_DISABLE_OPENCL=1 \
    RENDER_LOW_MEMORY=1

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
COPY --from=frontend-build /frontend/dist ./frontend/dist

RUN test -f frontend/dist/index.html

RUN mkdir -p /app/exports \
    && chmod -R 777 /app/exports /tmp

EXPOSE 8000

CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --timeout-keep-alive 120"]
