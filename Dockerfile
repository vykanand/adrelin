FROM selenium/standalone-chrome:latest

# Install Node.js and npm
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Create and set working directory
WORKDIR /app

# Copy application code
COPY . .

# Install dependencies
RUN npm install

# Expose port and start the application
EXPOSE 3000
CMD ["node", "server.js"]
