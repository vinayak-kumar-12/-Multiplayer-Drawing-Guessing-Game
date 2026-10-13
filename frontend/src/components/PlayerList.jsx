import React from 'react';

export default function PlayerList({ players, currentUserId, isHost, onSetDrawer }) {
  return (
    <div className="player-list-card">
      <h3 className="section-title">Players ({players ? players.length : 0})</h3>
      <div className="players-container">
        {players && players.map((p, idx) => {
          const isYou = p.id === currentUserId;
          return (
            <div key={p.id} className={`player-item ${p.isDrawer ? 'active-drawer' : ''}`}>
              <div className="player-rank">#{idx + 1}</div>
              <div className="player-info">
                <div className="player-name-row">
                  <span className="player-name">
                    {p.name} {isYou ? '(You)' : ''}
                  </span>
                  <div className="badges">
                    {p.isHost && <span className="badge host-badge">👑 Host</span>}
                    {p.isDrawer && <span className="badge drawer-badge">✏️ Drawer</span>}
                  </div>
                </div>
                <div className="player-score">{p.score} points</div>
              </div>
              {isHost && !p.isDrawer && (
                <button
                  type="button"
                  className="make-drawer-btn"
                  onClick={() => onSetDrawer(p.id)}
                  title="Make this player the drawer"
                >
                  Make Drawer
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
