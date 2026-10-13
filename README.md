# Multiplayer Pictionary Game

A real-time multiplayer drawing and guessing game inspired by Skribbl.io, built with React, Vite, Node.js, Express, and Socket.IO.

---

## 1. Project Overview & Architecture

The application is a browser-based, server-authoritative multiplayer drawing and guessing game. It provides shared rooms with synchronized canvas drawing, real-time presence, role delegation, and room chat.

### High-Level Architecture

```
                              ┌─────────────────────────────────────────┐
                              │           React + Vite Frontend         │
                              │  (Lobby, Toolbar, Canvas, Players, Chat)│
                              └────────────────────┬────────────────────┘
                                                   │
                                          Socket.IO WebSockets
                                          (Port 3001 ⇆ 5173)
                                                   │
                              ┌────────────────────▼────────────────────┐
                              │            Node.js / Express            │
                              │  - Room Management (In-Memory Map)      │
                              │  - Drawing Validation & Ordering (seq)  │
                              │  - Rate Limiting & Role Authorization   │
                              │  - Canvas History & Late-Joiner Replay  │
                              └─────────────────────────────────────────┘
```

---

## 2. Implemented Features (Step 1 Foundation)

### A. Room Lifecycle & URL Sharing
- **Room Creation**: Users enter a display name to generate a unique 6-character room code (e.g., `4PD5AF`).
- **Shareable Links**: Direct room access via query parameters (`?room=4PD5AF`). A dedicated **Copy Invite Link** button provides one-click URL sharing.
- **Dynamic Presence**: Real-time tracking of connected participants, identifying the host (👑) and the active drawer (✏️).
- **Host Role Delegation**: The room host can assign the drawer role to any player using the **Make Drawer** action.
- **Graceful Disconnection**: The server detects disconnected players and alerts the room. If the host leaves, host status is automatically transferred to the next participant.

### B. Synchronized HTML Canvas
- **Normalized Coordinates**: Pointer coordinates are normalized to `[0.0, 1.0]` relative to canvas bounds. This prevents stroke distortion across varying screen resolutions, DPI scaling, and browser window dimensions.
- **Full Drawing Toolset**:
  - **Pen**: Color palette with 15 preset swatches plus a custom color picker.
  - **Eraser**: Cleans strokes with background-matching color.
  - **Brush Size**: Slider adjusting stroke thickness from 2px to 40px.
  - **Undo**: Server tracks stroke history; undo removes the drawer's most recent stroke across all connected screens.
  - **Clear**: Atomically clears the canvas across all connected players.
- **Late Joiner Reconstruction**: When a player joins a room with an ongoing drawing, the server dispatches the full ordered stroke history (`draw:history`), reconstructing the current canvas immediately.

### C. Server-Side Security & Validation
- **Drawer-Only Authorization**: Only the socket matching `currentDrawerId` is permitted to emit strokes, clears, or undos. Drawing attempts by other players are rejected with an error message.
- **Payload Constraints**: Points per stroke are capped at 1,000 to prevent payload flooding; coordinates outside `[-0.2, 1.2]` are discarded.
- **Rate Limiting**: Sliding window rate limiters enforce maximum thresholds on drawing packets (120/sec) and chat messages (5/2sec) per socket.

### D. Real-Time Chat
- Auto-scrolling room chat supporting player messages and system broadcasts (player joins, leaves, drawer role transitions).

---

## 3. Technology Stack

- **Frontend**:
  - React 18
  - Vite
  - Socket.IO Client
  - HTML Canvas API
  - Plain CSS (responsive grid layout, no external CSS frameworks)
- **Backend**:
  - Node.js (tested on Node v25 / v18+)
  - Express.js
  - Socket.IO (CommonJS)
  - In-memory room and stroke state
- **Development & Tooling**:
  - `concurrently` (runs frontend and backend concurrently from the root directory)
  - `nodemon` (hot reloading on backend file changes)

---

## 4. Repository Structure

```
d:/PROJECT@/
├── package.json                    Root scripts for installation, execution, and testing
├── README.md                       Complete project documentation
├── test_multiplayer.cjs            Automated 3-player socket verification test script
├── backend/
│   ├── package.json                Backend dependencies (express, socket.io, cors, nodemon)
│   └── server.js                   Express & Socket.IO server (validation, state, rooms)
└── frontend/
    ├── package.json                Frontend dependencies (react, react-dom, socket.io-client, vite)
    ├── vite.config.js              Vite dev configuration
    ├── index.html                  Application HTML mount point
    └── src/
        ├── main.jsx                React application entry point
        ├── App.jsx                 Main game view (lobby, room topbar, canvas, players, chat)
        ├── style.css               Clean, responsive styling with no comments
        ├── components/
        │   ├── DrawingCanvas.jsx   HTML Canvas component tracking pointer events
        │   ├── DrawingToolbar.jsx  Tools for pen, eraser, colors, brush size, undo, and clear
        │   ├── PlayerList.jsx      Player list displaying scores, roles, and drawer delegation
        │   ├── GameChat.jsx        Chat component with auto-scroll and system messages
        │   └── WordPicker.jsx      Turn selection modal (prepared for Step 2)
        ├── hooks/
        │   └── useGameSocket.js    Custom Socket.IO hook managing real-time room state
        └── utils/
            └── canvasReplay.js     Canvas rendering and stroke history replay utility
```

---

## 5. Prerequisites & Installation

### Prerequisites
- Node.js v18.0.0 or higher
- npm v9.0.0 or higher

### Installation
Install all dependencies across the root, backend, and frontend with a single command:

```bash
npm run install:all
```

Or install each workspace individually:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

---

## 6. Running the Application

To start both the backend server and frontend development server with a single command:

```bash
npm run dev
```

When started:
- **Frontend URL**: `http://localhost:5173`
- **Backend Server**: `http://localhost:3001`

---

## 7. Verification & Testing

### Automated Multiplayer Test
Run the automated multi-session test script to verify room creation, stroke broadcasting, drawer authorization, and late-joiner recovery:

```bash
npm run test:multiplayer
```

This test executes the following automated checks:
1. **Session 1 (Alice)** connects and creates a new room.
2. **Session 2 (Bob)** joins using the room code.
3. Alice transmits a drawing stroke; Bob receives the stroke with sequence ID `1`.
4. Bob attempts an unauthorized stroke; the server rejects the attempt with `"Only the authorized drawer can draw"`.
5. **Session 3 (Charlie)** joins late; Charlie receives `draw:history` and reconstructs the existing canvas.

### Manual Multi-Browser Testing Instructions

1. Start the project with `npm run dev`.
2. Open **Browser 1** (e.g., Chrome) and navigate to `http://localhost:5173`.
3. Enter display name "Alice" and click **Create New Room**.
4. Click **Copy Invite Link** at the top of the room.
5. Open **Browser 2** (e.g., Incognito window) and paste the invite link (e.g., `http://localhost:5173/?room=XYZ`).
6. Enter display name "Bob" and click **Join Room**.
7. Open **Browser 3** (e.g., Edge or a separate profile) and navigate to the same invite link.
8. Enter display name "Charlie" and click **Join Room**.
9. In Browser 1 (Alice, Host/Drawer), select different colors and brush sizes and draw on the canvas. Observe strokes appearing simultaneously in Browsers 2 and 3.
10. Test **Undo** and **Clear** in Browser 1.
11. Observe that Bob and Charlie have view-only canvases and cannot draw while Alice is the active drawer.
12. In Alice's player list, click **Make Drawer** next to Bob to transfer drawing privileges.
13. Send chat messages across all three browsers to verify live messaging.

---

## 8. Technical Architecture Details

- **Coordinate Normalization**: Coordinates are recorded as ratios (`x = clientX / canvasWidth`, `y = clientY / canvasHeight`). This ensures cross-device consistency regardless of viewport size.
- **Ordered Stroke Sequencing**: Each approved stroke is assigned an incremental sequence identifier (`seq`) by the server before broadcast, ensuring consistent rendering order across all clients.
- **Canvas History & Snapshotting**: The server retains the active stroke array. When a client connects or reloads, the full array is sent so the canvas is replayed deterministically without missing strokes.

---

## 9. Known Limitations & Roadmap

### Current Limitations
- In-memory state: Room sessions and drawings reset if the Node.js process restarts.
- Step 1 Scope: Turn countdown timers, automated word selection, and automatic score calculations upon correct guesses are scheduled for Step 2.

### Development Roadmap
- **Step 1 (Completed)**: Foundation, room management, live synchronized canvas, full drawing tools, security validation, and chat.
- **Step 2 (Next)**: Server-authoritative turn flow (word selection from 3 choices, countdown timer, round progression), secret word privacy, progressive letter hints, guess interception in chat, and speed-based scoring.
- **Step 3**: Reconnection recovery (30-second token grace period), drawer disconnect handling, rate-limiting stress testing, and capacity documentation.
