FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies and build React app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package.json and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy the built React app
COPY --from=build /app/dist ./dist

# Copy the backend server files
COPY server/ ./server/

# Ensure uploads directory exists
RUN mkdir -p /app/uploads

EXPOSE 8080

CMD ["node", "server/server.js"]
