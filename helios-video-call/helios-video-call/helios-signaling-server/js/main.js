'use strict';

const pcConfig = {
  'iceServers': [
	  // {'url': 'stun:stun.l.google.com:19302'},
    { "urls":"stun:builder.helios-social.eu:3478" },
    {
      "urls": "turns:builder.helios-social.eu:5349",
      "username": "pepe",
      "credential": "pepito"
    }
  ]
};


function closePeer(id)
{
  peerConnections[id]?.close();

  delete peerConnections[id]

  const video = document.getElementById(id)
  video?.parentElement.removeChild(video)
}

function createPeerConnection(id) {
  const video = document.createElement('video')
  video.autoplay = true
  video.id = id

  videos.append(video)

  const pc = new RTCPeerConnection(pcConfig);

  pc.addStream(localVideo.srcObject);

  pc.addEventListener('icecandidate', function(event) {
    console.log('icecandidate event: ', event);

    if (!event.candidate) return console.log('End of candidates.');

    sendMessage(id, {
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  });

  pc.addEventListener('track', function(event) {
    console.log('Remote stream added', event);

    video.srcObject = event.streams[0];
  });

  return pc
}

function sendMessage(id, message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message, id);
}

function setLocalAndSendMessage(id, sessionDescription)
{
  return this.setLocalDescription(sessionDescription)
  .then(() => sendMessage(id, this.localDescription))
}


const localVideo = document.querySelector('#localVideo');
const videos = document.querySelector('#videos');

const peerConnections = {}

let socket


navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true
})
.then(function(stream) {
  console.log('Adding local stream.');

  localVideo.srcObject = stream;

  const room = prompt('Enter room name:');
  console.log('Attempted to create or join room', room);

  const manager = new io.Manager();

  socket = manager.socket(`/${room}`)

  socket.on('created', function(room) {
    console.log('Created room ' + room);
  });

  socket.on('disconnect', function(reason)
  {
    console.log('disconnect', reason)

    for(const id of Object.keys(peerConnections)) closePeer(id)
  });

  socket.on('full', function(room) {
    console.log('Room ' + room + ' is full');
  });

  socket.on('join', function (id) {
    console.log('Sending offer to peer', id);

    const pc = createPeerConnection(id)

    peerConnections[id] = pc

    return setLocalAndSendMessage.call(pc, id)
  });

  socket.on('joined', function(room) {
    console.log('joined:', room);
  });

  // This client receives a message
  socket.on('message', function(message, id) {
    console.log('Client received message:', message, id);

    if (message.type === 'offer') {
      const pc = createPeerConnection(id)

      peerConnections[id] = pc

      return pc.setRemoteDescription(message)
      .then(pc.createAnswer.bind(pc))
      .then(setLocalAndSendMessage.bind(pc, id))
    }

    const pc = peerConnections[id]
    if(!pc) return console.error('Received message from unknown peer', id)

    if (message.type === 'answer') {
      console.log("received answer");

      return pc.setRemoteDescription(message)
    }

    if (message.type === 'candidate') {
      var candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate
      });

      return pc.addIceCandidate(candidate);
    }

    if (message === 'bye') return closePeer(id)

    console.warn('Received unknown message', message, id)
  })
})

window.addEventListener('beforeunload', function() {
  for(const id of Object.keys(peerConnections)) sendMessage(id, 'bye');
})
