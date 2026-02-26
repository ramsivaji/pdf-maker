# Super lightweight static server mapped natively to Railway's dynamic PORT
FROM nginx:alpine
COPY . /usr/share/nginx/html
# Update nginx start command to listen on Railway's $PORT using envsubst
CMD /bin/sh -c "echo \"server { listen \${PORT}; location / { root /usr/share/nginx/html; index index.html; } }\" > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
