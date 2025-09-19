# Use Node.js LTS image
FROM node:18

# Create working directory
WORKDIR /app

# Copy package.json and lock file first (for caching)
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy the rest of the app
COPY . .

# backend port
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
