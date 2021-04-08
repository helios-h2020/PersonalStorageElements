FROM alpine:3.9

RUN wget https://github.com/tus/tusd/releases/download/v1.1.0/tusd_linux_amd64.tar.gz

RUN mkdir tusd-data

RUN tar -C tusd-data -xvf tusd_linux_amd64.tar.gz

RUN cp tusd-data/tusd_linux_amd64/tusd /usr/local/bin/tusd

RUN apk add --no-cache ca-certificates jq gcc \
    && addgroup -g 1000 tusd \
    && adduser -u 1000 -G tusd -s /bin/sh -D tusd \
    && mkdir -p /srv/tusd-hooks \
    && mkdir -p /srv/tusd-data \
    && chown tusd:tusd /srv/tusd-data

WORKDIR /srv/tusd-data
EXPOSE 1080
ENTRYPOINT ["tusd"]
CMD ["--hooks-dir","/srv/tusd-hooks"]

USER tusd