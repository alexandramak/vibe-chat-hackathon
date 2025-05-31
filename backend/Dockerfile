# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Development stage
FROM node:18-alpine AS development

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Set environment variables
ENV NODE_ENV=development

# Expose ports
EXPOSE 3000 3001

# Start development server
CMD ["npm", "run", "dev"]

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/src ./src

# Create logs directory
RUN mkdir -p logs

# Set environment variables
ENV NODE_ENV=production

# Expose ports
EXPOSE 3000 3001

# Start production server
CMD ["npm", "start"] 