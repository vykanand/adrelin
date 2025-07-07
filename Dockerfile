# Use Node.js 18 as the base image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install system dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxss1 \
    libgtk-3-0 \
    libxshmfence1 \
    libglu1 \
    chromium \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN groupadd -r node && useradd -r -g node node

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci

# Copy application code
COPY . .

# Change ownership of the app directory
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Expose port 3000
EXPOSE 3000

# Start command
CMD ["npm", "start"]
