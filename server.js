const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const cors = require('cors'); 

const app = express();
const server = http.createServer(app);

// Use the cors middleware
app.use(cors());

const io = socketIo(server, {
  cors: {
    /* Change this to your webpage(s) url, You should set multiple origins if you have to run multiple webpages */
    origin: ["https://localhost:9999", "http://localhost:62123", "http://localhost:62124"],  
    methods: ["GET", "POST"]
  }
});

 
// Serve the signaling processg
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  /*
  1. Join the room and emit the signal
  reference : https://developer.mozilla.org/ko/docs/Web/API/WebRTC_API/Signaling_and_video_calling
  */
  socket.on('join', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);

    //socket.to(roomId).emit('userJoined', socket.id);
  });

  socket.on('signal', (data) => {
    const { room, message } = data;
    console.log(`Received signal from ${socket.id} to ${room}: ${message}`);
    socket.to(room).emit('signal', message, socket.id); // Send answer to the offerer
  });
/*
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId); // 지정된 방에 참여
    console.log(`User ${socket.id} joined room ${roomId}`);

    // 해당 방의 다른 사용자들에게 새로 입장한 사용자 알리기
    socket.to(roomId).emit('userJoined', socket.id);
  })

  // Handle answer from one client and send it to the other client
  socket.on('answer', (answer, roomId) => {
    console.log('Sending answer to the client who made the offer');
    socket.to(roomId).emit('answer', answer, socket.id); // Send answer to the offerer
  });

  // Handle ICE candidate
  socket.on('iceCandidate', (candidate, roomId) => {
    console.log('Sending ICE candidate to other clients in room', roomId);
    socket.to(roomId).emit('iceCandidate', candidate, socket.id); // Send ICE candidate to all other clients in the room
  });
*/
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

/* TODO : Change this to your signaling server's url */
server.listen(9999, '0.0.0.0', () => { //localhost:9999에서 돌아가는 코드
  console.log('Signaling server running at http:localhost and above:9999'); 
});
