FROM node:18-slim as builder

# Install dependencies
RUN apt-get update && apt-get install -y \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Copy application code
WORKDIR /app
COPY . .

# Install dependencies
RUN npm install nodemon

# Build final image
FROM selenium/standalone-chrome:latest

# Set environment variables for Chrome
ENV CHROME_BIN=/usr/bin/google-chrome
ENV CHROME_FLAGS="--headless --no-sandbox --disable-dev-shm-usage --disable-gpu"

# Copy Node.js from builder
COPY --from=builder /usr/local/bin/node /usr/local/bin/node
COPY --from=builder /usr/local/bin/npm /usr/local/bin/npm
COPY --from=builder /usr/local/lib/node_modules /usr/local/lib/node_modules

# Set environment variables
ENV NODE_PATH=/usr/local/lib/node_modules
ENV PATH=/usr/local/bin:$PATH
ENV PUPPETEER_CHROMIUM_PATH=/usr/bin/google-chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
ENV DISPLAY=:99

# Copy application from builder
WORKDIR /app
COPY --from=builder /app .

# Expose port and start the application
EXPOSE 3000
CMD ["node", "/app/node_modules/nodemon/bin/nodemon.js", "server.js"]
