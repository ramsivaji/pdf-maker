# Super lightweight static server mapped natively to Railway's dynamic PORT
FROM nginx:alpine
COPY . /usr/share/nginx/html
# Update nginx start command to listen on Railway's $PORT
CMD /bin/bash -c "echo -e 'server {\n    listen '\${PORT}';\n    location / {\n        root /usr/share/nginx/html;\n        index index.html;\n    }\n}' > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
