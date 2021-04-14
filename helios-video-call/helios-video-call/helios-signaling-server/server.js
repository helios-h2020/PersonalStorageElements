#!/usr/bin/env node

'use strict';

const fs = require("fs");
const https = require('https');
const os = require('os');

const {Server} = require('node-static');
const socketIO = require('socket.io');


const options = {
  cert: fs.readFileSync('certs/cert.pem'),
  key: fs.readFileSync('certs/key.pem')
};

const fileServer = new Server();
const server = https.createServer(options, function(req, res) {
  fileServer.serve(req, res);
}).listen(11794);

console.log('Starting...')

const io = socketIO(server);

io.of(/^\/\w+$/).on('connection', function(socket) {
  console.log('Connection')

  socket.on('disconnect', function(reason)
  {
    console.log('disconnected', socket.id, reason)

    socket.broadcast.emit('message', 'bye', socket.id);
  });

  socket.on('ipaddr', function() {
    for (const iface of os.networkInterfaces())
      for (const {address, family} of iface)
        if (family === 'IPv4' && address !== '127.0.0.1')
          socket.emit('ipaddr', address);
  });

  socket.on('message', function(message, id) {
    console.log('Client said:', message, id);

    socket.to(id).emit('message', message, socket.id);
  });

  const {name, sockets: {size}} = socket.nsp

  console.log('Received request to create or join room ' + name);
  console.log('Room ' + name + ' now has ' + size + ' client(s)');

  if (size === 1) {
    console.log('Client ID ' + socket.id + ' created room ' + name);
    return socket.emit('created', name, socket.id);
  }

  if (size <= 4) {
    socket.broadcast.emit('join', socket.id);

    console.log('Client ID ' + socket.id + ' joined room ' + name);
    return socket.emit('joined', name);
  }

  // max four clients
  socket.emit('full', name);
  socket.disconnect()
});
