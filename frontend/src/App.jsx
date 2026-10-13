import React, { useState, useEffect } from 'react';
import { useGameSocket } from './hooks/useGameSocket.js';
import DrawingCanvas from './components/DrawingCanvas.jsx';
import DrawingToolbar from './components/DrawingToolbar.jsx';
import PlayerList from './components/PlayerList.jsx';
import GameChat from './components/GameChat.jsx';

export default function App() {
  const {
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
  } = useGameSocket();

  const [displayName, setDisplayName] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(6);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get('room');
    if (urlRoom) {
      setRoomIdInput(urlRoom.toUpperCase());
    }
  }, []);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please enter your display name');
      return;
    }
    createRoom(displayName.trim(), (res) => {
      if (res && res.room) {
        window.history.replaceState(null, '', `?room=${res.room.roomId}`);
      }
    });
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please enter your display name');
      return;
    }
    if (!roomIdInput.trim()) {
      setError('Please enter a room code');
      return;
    }
    joinRoom(roomIdInput.trim(), displayName.trim(), (res) => {
      if (res && res.room) {
        window.history.replaceState(null, '', `?room=${res.room.roomId}`);
      }
    });
  };

  const handleCopyLink = () => {
    if (!room) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${room.roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  const handleLeaveRoom = () => {
    window.location.href = window.location.pathname;
  };

  const isDrawer = Boolean(room && room.currentDrawerId === socketId);
  const isHost = Boolean(room && room.hostId === socketId);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand">
          <span className="logo-icon">🎨</span>
          <h1>Multiplayer Pictionary</h1>
        </div>
        <div className="header-meta">
          <div className={`connection-pill ${isConnected ? 'online' : 'offline'}`}>
            <span className="dot" />
            <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
          </div>
        </div>
      </header>

      {error && (
        <div className="global-error-bar">
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {!room ? (
        <main className="lobby-view">
          <div className="lobby-card">
            <h2>Welcome to Pictionary</h2>
            <p className="lobby-subtitle">Draw and guess in real time with friends</p>

            <div className="form-group">
              <label htmlFor="name-input">Your Display Name</label>
              <input
                id="name-input"
                type="text"
                placeholder="e.g. Alex, Maya"
                maxLength={20}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="lobby-actions">
              <div className="action-box">
                <h3>Host a Game</h3>
                <p>Create a fresh room and invite friends via a shareable link.</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCreate}
                  disabled={!isConnected}
                >
                  Create New Room
                </button>
              </div>

              <div className="divider-or">OR</div>

              <div className="action-box">
                <h3>Join a Game</h3>
                <div className="join-input-row">
                  <input
                    type="text"
                    placeholder="Enter 6-char code"
                    maxLength={10}
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleJoin}
                    disabled={!isConnected}
                  >
                    Join Room
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="room-view">
          <div className="room-topbar">
            <div className="room-info-pill">
              <span className="label">Room Code:</span>
              <span className="room-code-tag">{room.roomId}</span>
              <button
                type="button"
                className="copy-link-btn"
                onClick={handleCopyLink}
              >
                {copyFeedback ? '✓ Copied!' : '🔗 Copy Invite Link'}
              </button>
            </div>

            <div className="drawer-status-pill">
              {isDrawer ? (
                <span className="status-you-draw">✏️ You are drawing right now!</span>
              ) : (
                <span className="status-other-draw">
                  👀 {room.players?.find((p) => p.isDrawer)?.name || 'Someone'} is drawing
                </span>
              )}
            </div>

            <button type="button" className="leave-btn" onClick={handleLeaveRoom}>
              Exit Room
            </button>
          </div>

          <div className="game-layout-grid">
            <aside className="left-panel">
              <PlayerList
                players={room.players}
                currentUserId={socketId}
                isHost={isHost}
                onSetDrawer={setDrawer}
              />
            </aside>

            <section className="center-panel">
              <DrawingToolbar
                tool={tool}
                setTool={setTool}
                color={color}
                setColor={setColor}
                brushSize={brushSize}
                setBrushSize={setBrushSize}
                onUndo={undoStroke}
                onClear={clearCanvas}
                isDrawer={isDrawer}
              />
              <DrawingCanvas
                strokes={strokes}
                onSendStroke={sendStroke}
                tool={tool}
                color={color}
                brushSize={brushSize}
                isDrawer={isDrawer}
              />
            </section>

            <aside className="right-panel">
              <GameChat
                messages={messages}
                onSendMessage={sendMessage}
              />
            </aside>
          </div>
        </main>
      )}
    </div>
  );
}
