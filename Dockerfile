FROM node:20-bookworm

# Install system libraries required for headless browser automation (cloakbrowser/Chromium)
RUN apt-get update && apt-get install -y \
  ca-certificates \
  libglib2.0-0 \
  libx11-6 \
  libxrandr2 \
  libxinerama1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxss1 \
  libxtst6 \
  libnss3 \
  libgconf-2-4 \
  libappindicator1 \
  libindicator7 \
  libdrm2 \
  libgbm1 \
  libasound2 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libpangocairo-1.0-0 \
  libpango-1.0-0 \
  libcairo2 \
  libxcb1 \
  libxkbcommon0 \
  libfreetype6 \
  libfontconfig1 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Start app
CMD ["npm", "start"]
