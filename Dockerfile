# TODO! decouple this from app dependencies

# Use Node.js 20.x LTS Alpine image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache bash python3 py3-pip

# Install python dependencies
RUN python3 -m venv /venv
ENV PATH="/venv/bin:$PATH"
RUN pip install huggingface_hub vastai

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm i polkadot-api
RUN npx papi add dot -n polkadot && npx papi

RUN npm install

# Copy the rest of the application [todo! be better here]
COPY . .

# Command to run the application
RUN npm i -D tsx
CMD ["npx", "tsx", "src/index.ts"]
