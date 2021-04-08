'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var https = require('https');
var socketIO = require('socket.io');
var fs = require("fs");
var options = {
        key: fs.readFileSync('/app/certs/key.pem'),
        cert: fs.readFileSync('/app/certs/cert.pem')
};

var fileServer = new(nodeStatic.Server)();
var app = https.createServer(options,function(req, res) {
  fileServer.serve(req, res);
}).listen(1794);

console.log('Starting...')

var io = socketIO.listen(app);
io.sockets.on('connection', function(socket) {

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    console.log(array.join(' '));
    socket.emit('log', array);
  }

  socket.on('message', function(message) {
    log('Client said:', message);

    let currentRoom = Object.keys(socket.rooms).filter(room => room != socket.id)[0];
    socket.to(currentRoom).emit('message', message);
  });

  socket.on('create or join', function(room) {
    log('Received request to create or join room ' + room);

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = 0;
    if (clientsInRoom && clientsInRoom.sockets) {
      numClients = Object.keys(clientsInRoom.sockets).length;
    }

    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 0) {
      socket.join(room);
      log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);

    } else if (numClients === 1) {
      log('Client ID ' + socket.id + ' joined room ' + room);
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
      io.sockets.in(room).emit('ready');
    } else { // max two clients
      socket.emit('full', room);
    }
  });

  socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('bye', function(){
    console.log('received bye');

  });

});
