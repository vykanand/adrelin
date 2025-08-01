FROM node:18-slim as builder

# Install Chrome and unzip
RUN DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy all application files
COPY . .

# Ensure node_modules is copied correctly
COPY node_modules ./node_modules

# Debug: Verify node_modules structure
RUN echo "=== Verifying node_modules ===" && \
    echo "1. Check node_modules directory:" && \
    ls -la node_modules/ && \
    echo "\n2. Check puppeteer package:" && \
    ls -la node_modules/puppeteer && \
    echo "\n3. Check puppeteer package.json:" && \
    cat node_modules/puppeteer/package.json | grep version

# Copy application files
COPY . .

# Build final image
FROM selenium/standalone-chrome:latest

# Set timezone environment variable
ENV TZ=Asia/Kolkata

# Set environment variables for Chrome
ENV CHROME_BIN=/usr/bin/google-chrome
ENV CHROME_FLAGS="--headless --no-sandbox --disable-dev-shm-usage --disable-gpu"

# Copy Node.js installation from builder
COPY --from=builder /usr/local /usr/local

# Set working directory and copy application
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
ENV DISPLAY=:99

# Copy application from builder
WORKDIR /app
COPY --from=builder /app/ .

# Debug: Verify node_modules in final image
RUN echo "=== Verifying node_modules in final image ===" && \
    echo "1. Check node_modules directory:" && \
    ls -la node_modules/ && \
    echo "\n2. Check puppeteer package:" && \
    ls -la node_modules/puppeteer && \
    echo "\n3. Check puppeteer package.json:" && \
    cat node_modules/puppeteer/package.json | grep version

# Expose port and start the application
EXPOSE 3000
CMD ["node", "server.js"]