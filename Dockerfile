FROM node:18-slim as builder

# Install Chrome and unzip
RUN apt-get update && apt-get install -y \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy application and node_modules.zip
COPY . .
COPY node_modules.zip .

# Create node_modules directory if it doesn't exist
RUN mkdir -p node_modules

# Unzip pre-downloaded node_modules into node_modules directory
RUN unzip node_modules.zip -d node_modules

# All dependencies are already in the node_modules.zip

# Build final image
FROM selenium/standalone-chrome:latest

# Set environment variables for Chrome
ENV CHROME_BIN=/usr/bin/google-chrome
ENV CHROME_FLAGS="--headless --no-sandbox --disable-dev-shm-usage --disable-gpu"

# Copy Node.js installation from builder
COPY --from=builder /usr/local /usr/local

# Set working directory and copy application
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

# Install remaining packages
WORKDIR /app
COPY package.json .
RUN npm install
ENV DISPLAY=:99

# Copy application from builder
WORKDIR /app
COPY --from=builder /app .

# Expose port and start the application
EXPOSE 3000
CMD ["node", "client.js"]
