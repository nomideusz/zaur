FROM nginx:1.31-alpine

COPY infra/auth/auth-admin.nginx.conf /etc/nginx/conf.d/default.conf
