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
  let pc = peerConnections[id]
  if(pc) return pc

  peerConnections[id] = pc = new RTCPeerConnection(pcConfig);

  const video = document.createElement('video')
  video.autoplay = true
  video.id = id

  videos.append(video)

  function onRemoveTrack({track})
  {
    console.log('Remove track', track)

    const {srcObject} = video

    if(srcObject.getVideoTracks().length)
      // An `audio` track was removed, restore event handler
      return srcObject.addEventListener('removetrack', onRemoveTrack, {once: true})

    // Video track removed, replace stream with another with only `audio` tracks
    video.srcObject = new MediaStream(srcObject.getAudioTracks());
  }

  // Add current stream
  const {srcObject: stream} = localVideo
  for(const track of stream.getTracks())
    if(audioChk.checked && track.kind === 'audio'
    || videoChk.checked && track.kind === 'video')
      pc.addTrack(track, stream);

  pc.addEventListener('icecandidate', function({candidate}) {
    console.log('icecandidate event: ', candidate);

    if (!candidate) return console.log('End of candidates.');

    sendMessage(id, candidate);
  });
  pc.addEventListener("negotiationneeded", setLocalAndSendMessage.bind(pc, id, null));
  pc.addEventListener('track', function(event) {
    console.log('Remote track added', event);

    const [stream] = event.streams

    const {srcObject} = video
    video.srcObject = stream;

    if(event.track.kind !== 'video') return

    // Prevent to register event multiple times
    if(srcObject) srcObject.removeEventListener('removetrack', onRemoveTrack)

    stream.addEventListener('removetrack', onRemoveTrack, {once: true})
  });

  return pc
}

function onDisconnect(reason)
{
  console.log('disconnect', reason)

  for(const id of Object.keys(peerConnections)) closePeer(id)
}

function onMessage(message, id) {
  console.log('Client received message:', message, id);

  if (message === 'bye') return closePeer(id)

  if (message.type === 'offer') {
    const pc = createPeerConnection(id)

    return pc.setRemoteDescription(message)
    .then(pc.createAnswer.bind(pc))
    .then(setLocalAndSendMessage.bind(pc, id))
  }

  const pc = peerConnections[id]
  if(!pc) return console.error('Received message from unknown peer', id)

  if (message.type === 'answer') {
    console.log("received answer", message);

    return pc.setRemoteDescription(message)
  }

  if (message.candidate)
    return pc.addIceCandidate(message);

  console.warn('Received unknown message', message, id)
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


const audioChk = document.querySelector('#audioChk');
const videoChk = document.querySelector('#videoChk');

const params = new URLSearchParams(window.location.search)

audioChk.checked = !params.has('audio') || (params.get('audio') !== 'false' && params.get('audio') !== '0')
videoChk.checked = !params.has('video') || (params.get('video') !== 'false' && params.get('video') !== '0')


audioChk.addEventListener('change', function()
{
  if(this.checked)
  {
    const {srcObject: stream} = localVideo
    const tracks = stream.getAudioTracks()

    for(const pc of Object.values(peerConnections))
      for(const track of tracks) pc.addTrack(track, stream);
  }
  else
    for(const pc of Object.values(peerConnections))
      for(const sender of pc.getSenders())
        if(sender.track?.kind === 'audio') pc.removeTrack(sender);
});
videoChk.addEventListener('change', function()
{
  if(this.checked)
  {
    const {srcObject: stream} = localVideo
    const tracks = stream.getVideoTracks()

    for(const pc of Object.values(peerConnections))
      for(const track of tracks) pc.addTrack(track, stream);
  }
  else
    for(const pc of Object.values(peerConnections))
      for(const sender of pc.getSenders())
        if(sender.track?.kind === 'video') pc.removeTrack(sender);
});


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

  socket.on('disconnect', onDisconnect);

  socket.on('full', function(room) {
    console.log('Room ' + room + ' is full');
  });

  socket.on('join', function (id) {
    console.log('Sending offer to peer', id);

    createPeerConnection(id)
  });

  socket.on('joined', function(room) {
    console.log('joined:', room);
  });

  // This client receives a message
  socket.on('message', onMessage)
})

window.addEventListener('beforeunload', function() {
  for(const id of Object.keys(peerConnections)) sendMessage(id, 'bye');
})
