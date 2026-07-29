FROM nginx:1.27-alpine

# Static site — no build step, just the files served by nginx.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY site/ /usr/share/nginx/html/

EXPOSE 80
