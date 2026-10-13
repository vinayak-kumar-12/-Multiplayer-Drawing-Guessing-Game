import React from 'react';

const PALETTE = [
  '#000000', '#555555', '#FFFFFF',
  '#E53935', '#D81B60', '#8E24AA',
  '#3949AB', '#1E88E5', '#00ACC1',
  '#43A047', '#7CB342', '#FDD835',
  '#FB8C00', '#6D4C41', '#FF4081'
];

export default function DrawingToolbar({
  tool,
  setTool,
  color,
  setColor,
  brushSize,
  setBrushSize,
  onUndo,
  onClear,
  isDrawer
}) {
  if (!isDrawer) {
    return (
      <div className="drawing-toolbar disabled-banner">
        <span>You are currently guessing. Only the active drawer can draw.</span>
      </div>
    );
  }

  return (
    <div className="drawing-toolbar">
      <div className="toolbar-group">
        <button
          type="button"
          className={`tool-btn ${tool === 'pen' ? 'active' : ''}`}
          onClick={() => setTool('pen')}
        >
          ✏️ Pen
        </button>
        <button
          type="button"
          className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
          onClick={() => setTool('eraser')}
        >
          🧹 Eraser
        </button>
      </div>

      <div className="toolbar-group colors-group">
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            className={`color-swatch ${color === c && tool === 'pen' ? 'selected' : ''}`}
            style={{ backgroundColor: c }}
            onClick={() => {
              setColor(c);
              setTool('pen');
            }}
          />
        ))}
        <input
          type="color"
          className="color-picker-input"
          value={color}
          onChange={(e) => {
            setColor(e.target.value);
            setTool('pen');
          }}
        />
      </div>

      <div className="toolbar-group size-group">
        <span className="size-label">Size: {brushSize}px</span>
        <input
          type="range"
          min="2"
          max="40"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
        />
      </div>

      <div className="toolbar-group action-group">
        <button type="button" className="action-btn" onClick={onUndo}>
          ↩️ Undo
        </button>
        <button type="button" className="action-btn clear-btn" onClick={onClear}>
          🗑️ Clear
        </button>
      </div>
    </div>
  );
}
