const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const rooms = new Map();
const userRateLimits = new Map();

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function checkRateLimit(socketId, type, limit, windowMs) {
  const key = `${socketId}:${type}`;
  const now = Date.now();
  const record = userRateLimits.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
    userRateLimits.set(key, record);
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  userRateLimits.set(key, record);
  return true;
}

function getSafeRoomPayload(room) {
  return {
    roomId: room.id,
    hostId: room.hostId,
    currentDrawerId: room.currentDrawerId,
    players: Array.from(room.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      isHost: p.id === room.hostId,
      isDrawer: p.id === room.currentDrawerId
    }))
  };
}

io.on('connection', (socket) => {
  let currentRoomId = null;

  socket.on('room:create', ({ name }, callback) => {
    const cleanName = (typeof name === 'string' ? name.trim() : '').slice(0, 20);
    if (!cleanName) {
      if (typeof callback === 'function') callback({ error: 'Display name is required' });
      return;
    }

    let roomId = generateRoomId();
    while (rooms.has(roomId)) {
      roomId = generateRoomId();
    }

    const room = {
      id: roomId,
      hostId: socket.id,
      currentDrawerId: socket.id,
      players: new Map(),
      strokes: [],
      nextSeq: 1,
      createdAt: Date.now()
    };

    room.players.set(socket.id, {
      id: socket.id,
      name: cleanName,
      score: 0
    });

    rooms.set(roomId, room);
    currentRoomId = roomId;
    socket.join(roomId);

    const safeRoom = getSafeRoomPayload(room);
    if (typeof callback === 'function') {
      callback({ success: true, room: safeRoom });
    }

    io.to(roomId).emit('room:state', safeRoom);
  });

  socket.on('room:join', ({ roomId, name }, callback) => {
    const cleanRoomId = (typeof roomId === 'string' ? roomId.trim().toUpperCase() : '');
    const cleanName = (typeof name === 'string' ? name.trim() : '').slice(0, 20);

    if (!cleanName) {
      if (typeof callback === 'function') callback({ error: 'Display name is required' });
      return;
    }

    const room = rooms.get(cleanRoomId);
    if (!room) {
      if (typeof callback === 'function') callback({ error: 'Room does not exist' });
      return;
    }

    room.players.set(socket.id, {
      id: socket.id,
      name: cleanName,
      score: 0
    });

    currentRoomId = cleanRoomId;
    socket.join(cleanRoomId);

    const safeRoom = getSafeRoomPayload(room);
    if (typeof callback === 'function') {
      callback({ success: true, room: safeRoom, strokes: room.strokes });
    }

    io.to(cleanRoomId).emit('room:state', safeRoom);
    socket.emit('draw:history', room.strokes);

    io.to(cleanRoomId).emit('chat:message', {
      id: `${Date.now()}-${Math.random()}`,
      sender: 'System',
      text: `${cleanName} joined the room`,
      system: true
    });
  });

  socket.on('room:setDrawer', ({ drawerId }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.hostId !== socket.id) return;
    if (!room.players.has(drawerId)) return;

    room.currentDrawerId = drawerId;
    io.to(currentRoomId).emit('room:state', getSafeRoomPayload(room));
    io.to(currentRoomId).emit('chat:message', {
      id: `${Date.now()}-${Math.random()}`,
      sender: 'System',
      text: `${room.players.get(drawerId).name} is now the drawer`,
      system: true
    });
  });

  socket.on('draw:stroke', (stroke) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    if (room.currentDrawerId !== socket.id) {
      socket.emit('draw:error', { error: 'Only the authorized drawer can draw' });
      return;
    }

    if (!checkRateLimit(socket.id, 'draw', 120, 1000)) {
      return;
    }

    if (!stroke || typeof stroke !== 'object') return;
    const { tool, color, size, points } = stroke;

    if (tool !== 'pen' && tool !== 'eraser') return;
    if (typeof color !== 'string' || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) return;
    if (typeof size !== 'number' || size < 1 || size > 60) return;
    if (!Array.isArray(points) || points.length === 0 || points.length > 1000) return;

    const validatedPoints = [];
    for (const pt of points) {
      if (typeof pt.x !== 'number' || typeof pt.y !== 'number') return;
      if (pt.x < -0.2 || pt.x > 1.2 || pt.y < -0.2 || pt.y > 1.2) return;
      validatedPoints.push({
        x: Math.max(0, Math.min(1, Number(pt.x.toFixed(4)))),
        y: Math.max(0, Math.min(1, Number(pt.y.toFixed(4))))
      });
    }

    const validatedStroke = {
      id: room.nextSeq++,
      tool,
      color: tool === 'eraser' ? '#FFFFFF' : color,
      size,
      points: validatedPoints
    };

    room.strokes.push(validatedStroke);
    socket.to(currentRoomId).emit('draw:stroke', validatedStroke);
  });

  socket.on('draw:clear', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    if (room.currentDrawerId !== socket.id) {
      socket.emit('draw:error', { error: 'Only the authorized drawer can clear' });
      return;
    }

    room.strokes = [];
    io.to(currentRoomId).emit('draw:clear');
  });

  socket.on('draw:undo', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    if (room.currentDrawerId !== socket.id) {
      socket.emit('draw:error', { error: 'Only the authorized drawer can undo' });
      return;
    }

    if (room.strokes.length > 0) {
      room.strokes.pop();
      io.to(currentRoomId).emit('draw:history', room.strokes);
    }
  });

  socket.on('chat:send', ({ text }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    if (!checkRateLimit(socket.id, 'chat', 5, 2000)) {
      socket.emit('chat:error', { error: 'You are chatting too fast' });
      return;
    }

    const cleanText = (typeof text === 'string' ? text.trim() : '').slice(0, 150);
    if (!cleanText) return;

    io.to(currentRoomId).emit('chat:message', {
      id: `${Date.now()}-${Math.random()}`,
      sender: player.name,
      senderId: player.id,
      text: cleanText,
      system: false
    });
  });

  socket.on('disconnect', () => {
    userRateLimits.delete(`${socket.id}:draw`);
    userRateLimits.delete(`${socket.id}:chat`);

    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    const playerName = player ? player.name : 'A player';
    room.players.delete(socket.id);

    if (room.players.size === 0) {
      rooms.delete(currentRoomId);
      return;
    }

    if (room.hostId === socket.id) {
      const nextHostId = room.players.keys().next().value;
      room.hostId = nextHostId;
    }

    if (room.currentDrawerId === socket.id) {
      room.currentDrawerId = room.hostId;
    }

    io.to(currentRoomId).emit('room:state', getSafeRoomPayload(room));
    io.to(currentRoomId).emit('chat:message', {
      id: `${Date.now()}-${Math.random()}`,
      sender: 'System',
      text: `${playerName} left the room`,
      system: true
    });
  });
});

const PORT = process.env.PORT || 3001;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});

