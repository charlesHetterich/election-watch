# Use Node.js 20.x LTS Alpine image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache bash

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Generate TypeScript types for Polkadot-API
RUN npx papi add dot -n polkadot && npx papi

# Expose application port (adjust as necessary)
EXPOSE 3000

# Command to run the application
CMD ["npm", "run", "start"]
