# Use Node.js as the base image
FROM node:18

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React app for production
RUN npm run build

# Use a lightweight web server to serve the build files
FROM nginx:alpine
COPY --from=0 /app/build /usr/share/nginx/html

# Expose the default port for Nginx
EXPOSE 3000

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
