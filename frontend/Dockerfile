# Build stage
FROM node:24-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# The build will use the environment variables provided by Railway at build-time
RUN npm run build

# Production stage
FROM nginx:alpine
# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html
# Add custom Nginx config for React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port (Railway provides $PORT)
EXPOSE 80

# Start Nginx
CMD /bin/bash -c "envsubst '\\$PORT' < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf.in && mv /etc/nginx/conf.d/default.conf.in /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
