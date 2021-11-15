# PersonalStorageElements

This repository contains the code used to build the different containers that runs on the Personal Storage to extend the Helios capabalities present in the mobile phones.



## Elements
### Signaling Server:
This server is needed for the WebRTC video calls functionality provided by the Media Streaming Module. Signaling is the process of coordinating communication, in order for a WebRTC application to set up a 'call'. This basically consists of exchanging a series of SDP messages (Session Control Messages, Error messages, Media metadata, Network conditions, etc).

The signaling server is based on the Google's Codelabs Node.js implementation (https://codelabs.developers.google.com/codelabs/webrtc-web/#6).

### Coturn Server:
In order to establish the WebRTC Video call between two peers it is necessary to deploy a TURN and STUN servers. The STUN server is usedby the peers to know their public IP Address. The TURN Server is a VoIP media traffic NAT traversal server and gateway.

Both servers are deployed in the same container using the Coturn project (https://github.com/coturn/coturn) which is a free open source implementation of TURN and STUN Server.

### Media Streaming Engine:
This part of the personal storage is in charge of the live streaming functionality provided by the Media Streaming module. It is composed of two containers and a Docker volume attached to booth of them. 

The first container (Media Streaming Engine Transcoder) recieves the RTMP video from the mobile phones and then the content is transcoded and divided into different video chunks and HLS playlists. These chunks and playlists are stored in the Docker volume.

The second container (Media Streaming Engine Cache) contains a web server to make the videos available to the rest of the users trough HTTP.the video to different qualities and then generates the HLS playlist and the video fragments. 


### tus Server:
This tus server is used by the file transmission functionality provided by the Media Streaming module. This server is used to upload the content from the sender peer and also allows the reciever to download the content via HTTP. Tus is a protocol based on HTTP for resumable file uploads. Resumable means that an upload can be interrupted at any moment and can be resumed without re-uploading the previous data again. An interruption may happen willingly, if the user wants to pause, or by accident in case of an network issue or server outage.

The server is implemented using the tusd especification, tusd is the official reference implementation of the tus resumable upload protocol (https://github.com/tus/tusd).

## Deploy the containers:
To facilitate the deployment of the containers, a docker-compose file is included in the root o the repository. Execute the following command in the root of the repository (note: see first the configuration of the certificates adnd coturn server):

```
docker-compose up -d
```

Another way to deploy the containers is using docker run like:

### 1. LIVE STREAMING 

#### 1.1 Media Transcoder

- Pull the image from repository: `docker pull heliosh2020/media-transcoder:v2.0`

- Run the container: `sudo docker run -d -v cache-content:/opt/data/ -p 1935:1935 --name media-transcoder heliosh2020/media-transcoder:v2.0`
	
#### 1.2. Media Cache

- Pull the image from repository: `docker pull heliosh2020/media-cache:v2.0`

- Run the container: `sudo docker run -d -v cache-content:/opt/data/ -p 800:800 --name media-cache heliosh2020/media-cache:v2.0`
	
### 2. MEDIA SIGNALING

- Pull the image from repository: `docker pull heliosh2020/media-signaling:v2.2`

- Run the container: `sudo docker run -d -v $(pwd)/certs:/app/certs/ -p 11794:11794 --name media-signaling heliosh2020/media-signaling:v2.2`
	
/* If the certificates created for this image are expired, you can replace them with your own certificate or create a self-signed new one using openssl:
`openssl req -newkey rsa:2048 -x509 -sha256 -days 3650 -nodes -out cert.pem -keyout key.pem`

### 3. P2P MEDIASTREAM

- Pull the image from repository: `docker pull heliosh2020/p2p-mediastream:latest`

You will need to create a 'config.json' file like:

```
{
  "servers": [{
      "server": {
        "port": 49199,
        "host": "0.0.0.0"
      },
      "websockets": {
        "path": "/*",
        "maxPayloadLength": 65536,
        "idleTimeout": 240,
        "compression": 1,
        "maxConnections": 0
      }
    }
  ],

  "tracker": {
    "maxOffers": 20,
    "announceInterval": 120
  }
}
```

- Run the container: `docker run -d -p 49199:49199 -v "$(pwd)"/config.json:/app/config.json:ro heliosh2020/p2p-mediastream`

### 4. TUS 

- Create a docker volume: `docker volume create helios-tus`

- Run the container from the oficial tusproject/tusd image: `sudo docker run -d -p 1080:1080 --mount 'type=volume,src=helios-tus,dst=/srv/data/' tusproject/tusd "tusd --hooks-dir /srv/tusd-hooks"`

### 5. COTURN

- Source DockerHub repository: https://hub.docker.com/r/zolochevska/turn-server/

- Source GitHub repository: https://github.com/coturn/coturn

- Run the container: `sudo docker run -d -p 3478:3478 -p 3478:3478/udp --restart=always zolochevska/turn-server username password realm`

- If you don't have a domain in your host, 'realm' parameter will be your public IP.

### Configuration of the certificates: 
Some of the containers need HTTPS connectivity, to provide this, it is necessary to create or use a valid TLS certificate (if you don't have one, you can create your own certificate with LetsEncrypt - https://letsencrypt.org/es/getting-started/). After create the certificates (`cert.pem` and `key.pem`), these should be copied to the `certs` forlder in the root of the repository.

### Configuration of the Coturn server:
For the coturn server, an specific configuration should be loaded for each specific case. The configuration file it is present in `helios-video-call/helios-coturn-server/turnserver.conf`. Here it is necessary to change some values: 

* listening-ip
* realm

This TURN server should be protected with a user:password pair. This information is configured in `helios-video-call/helios-coturn-server/users.conf`.
