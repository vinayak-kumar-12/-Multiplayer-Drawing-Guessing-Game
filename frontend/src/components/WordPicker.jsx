import React from 'react';

export default function WordPicker({ words, onSelectWord, isOpen }) {
  if (!isOpen || !words || words.length === 0) return null;

  return (
    <div className="word-picker-overlay">
      <div className="word-picker-modal">
        <h3>Choose a word to draw</h3>
        <div className="word-buttons">
          {words.map((w) => (
            <button
              key={w}
              type="button"
              className="word-choice-btn"
              onClick={() => onSelectWord(w)}
            >
              {w}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
