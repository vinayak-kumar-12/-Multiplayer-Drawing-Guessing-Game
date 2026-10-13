import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001'
  : `http://${window.location.hostname}:3001`;

export function useGameSocket() {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [strokes, setStrokes] = useState([]);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [socketId, setSocketId] = useState(null);

  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setSocketId(socket.id);
      setError(null);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
      setError('Cannot connect to game server');
    });

    socket.on('room:state', (updatedRoom) => {
      setRoom(updatedRoom);
    });

    socket.on('draw:stroke', (stroke) => {
      setStrokes((prev) => [...prev, stroke]);
    });

    socket.on('draw:history', (history) => {
      setStrokes(Array.isArray(history) ? history : []);
    });

    socket.on('draw:clear', () => {
      setStrokes([]);
    });

    socket.on('draw:error', (err) => {
      if (err && err.error) setError(err.error);
    });

    socket.on('chat:message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('chat:error', (err) => {
      if (err && err.error) setError(err.error);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback((name, callback) => {
    if (!socketRef.current) return;
    setError(null);
    socketRef.current.emit('room:create', { name }, (res) => {
      if (res && res.error) {
        setError(res.error);
      } else if (res && res.room) {
        setRoom(res.room);
        setStrokes([]);
        setMessages([]);
      }
      if (callback) callback(res);
    });
  }, []);

  const joinRoom = useCallback((roomId, name, callback) => {
    if (!socketRef.current) return;
    setError(null);
    socketRef.current.emit('room:join', { roomId, name }, (res) => {
      if (res && res.error) {
        setError(res.error);
      } else if (res && res.room) {
        setRoom(res.room);
        if (res.strokes) setStrokes(res.strokes);
        setMessages([]);
      }
      if (callback) callback(res);
    });
  }, []);

  const sendStroke = useCallback((stroke) => {
    if (!socketRef.current) return;
    setStrokes((prev) => [...prev, stroke]);
    socketRef.current.emit('draw:stroke', stroke);
  }, []);

  const clearCanvas = useCallback(() => {
    if (!socketRef.current) return;
    setStrokes([]);
    socketRef.current.emit('draw:clear');
  }, []);

  const undoStroke = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('draw:undo');
  }, []);

  const sendMessage = useCallback((text) => {
    if (!socketRef.current) return;
    socketRef.current.emit('chat:send', { text });
  }, []);

  const setDrawer = useCallback((drawerId) => {
    if (!socketRef.current) return;
    socketRef.current.emit('room:setDrawer', { drawerId });
  }, []);

  return {
    socket: socketRef.current,
    socketId,
    isConnected,
    room,
    strokes,
    messages,
    error,
    setError,
    createRoom,
    joinRoom,
    sendStroke,
    clearCanvas,
    undoStroke,
    sendMessage,
    setDrawer
  };
}
