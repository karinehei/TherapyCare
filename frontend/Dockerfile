FROM node:20-slim

WORKDIR /app

COPY package*.json ./
# Prefer deterministic installs when lockfile exists, but allow dev builds without it.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

# Default: vite dev (override with VITE_MODE=build for production build + serve)
CMD ["npm", "run", "dev"]
