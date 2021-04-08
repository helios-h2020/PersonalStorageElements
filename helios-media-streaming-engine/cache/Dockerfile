FROM nginx:stable-alpine

EXPOSE 800

RUN apk update && apk add --no-cache

RUN mkdir -p /opt/data

WORKDIR app/

RUN mkdir /opt/data/hls && chmod a+rwx /opt/data/hls

# Add NGINX config.
ADD nginx.conf /etc/nginx/nginx.conf
ADD nginx_template.conf /

COPY . /app

ENTRYPOINT [ "/app/entrypoint.sh" ]