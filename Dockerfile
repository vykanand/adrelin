FROM node:18-slim

# Install unzip
RUN apt-get update && apt-get install -y unzip

# Create and set working directory
WORKDIR /app

# Copy application code
COPY . .

# Extract node_modules.zip with force flag
RUN unzip -o -q node_modules.zip && rm node_modules.zip

# Extract Puppeteer package (supports both zip and tgz)
RUN if [ -f "puppeteer-21.5.2.zip" ]; then \
    unzip -o -q puppeteer-21.5.2.zip && rm puppeteer-21.5.2.zip; \
  elif [ -f "puppeteer-21.5.2.tgz" ]; then \
    tar -xzf puppeteer-21.5.2.tgz && rm puppeteer-21.5.2.tgz; \
  fi

# Set correct permissions
RUN chmod +x server.js

# Expose port and start the application
EXPOSE 3000
CMD ["node", "server.js"]
