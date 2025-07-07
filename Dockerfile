FROM node:18-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    unzip \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Download and extract Chrome
RUN wget https://storage.googleapis.com/chrome-for-testing-public/138.0.7204.92/linux64/chrome-linux64.zip \
    && unzip -o chrome-linux64.zip \
    && rm chrome-linux64.zip

# Copy application code
WORKDIR /app
COPY . .

# Install dependencies
RUN npm install

# Expose port and start the application
EXPOSE 3000
CMD ["node", "server.js"]



# Copy application code
COPY . .

# Install dependencies
RUN npm install

# Expose port and start the application
EXPOSE 3000
CMD ["node", "server.js"]
