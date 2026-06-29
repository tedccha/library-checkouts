FROM mcr.microsoft.com/playwright:v1.40.1-focal

# Install Node.js (Playwright image doesn't include it)
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Start app
CMD ["npm", "start"]
