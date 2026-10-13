import React, { useState, useEffect, useRef } from 'react';

export default function GameChat({ messages, onSendMessage }) {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  return (
    <div className="game-chat-card">
      <h3 className="section-title">Room Chat</h3>
      <div className="chat-messages-container">
        {messages && messages.map((m) => (
          <div
            key={m.id}
            className={`chat-message ${m.system ? 'system-message' : 'user-message'}`}
          >
            {m.system ? (
              <span className="system-text">📢 {m.text}</span>
            ) : (
              <span>
                <strong className="chat-sender">{m.sender}: </strong>
                <span className="chat-content">{m.text}</span>
              </span>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          placeholder="Type message or guess..."
          maxLength={150}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button type="submit" className="chat-send-btn">
          Send
        </button>
      </form>
    </div>
  );
}
