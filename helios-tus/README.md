# Helios TUS Server

Implemented with https://github.com/tus/tusd.

## Deployment
On a first step, it is necessary to create a Docker volume (```helios-tus```) to store the uploaded files.

To use TLS connections, this container should be deployed behind a reverse proxy (For example, Nginx). The entrypoint of the container is overwritten because of this, the tusd server should start with the -behind-proxy flag.

    docker run -d -p 1080:1080 --mount 'type=volume,src=helios-tus,dst=/srv/data/' tusproject/tusd "tusd -behind-proxy --hooks-dir /srv/tusd-hooks"