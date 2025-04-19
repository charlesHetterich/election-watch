# Use Node.js 20.x LTS Alpine image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache bash

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm i polkadot-api
RUN npx papi add dot -n polkadot && npx papi

RUN npm install

# Copy the rest of the application
COPY . .

# Command to run the application
RUN npm i -D tsx
CMD ["npx", "tsx", "src/index.ts"]


