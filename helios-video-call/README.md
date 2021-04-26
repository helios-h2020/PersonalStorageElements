# Helios

## Deployment

### Signaling server

### TURN/STUN

The image of the coturn server is available in DockerHub, to deploy it just execute the following Docker command:

```sh
docker run -it --network=host --name=coturn \
  -v $(pwd)/coturn_conf:/etc/coturn instrumentisto/coturn -u user:pass
```

This user:pass is needed to protect the TURN server. The clients that are going to use this server should configure the same user:pass pair info.
