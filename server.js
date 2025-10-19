// server.js
// Node/Express + ws WebSocket server to serve static site and broadcast live viewer count.
// Install: npm i express ws

const express = require("express");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from current directory (make sure index.html sits here)
app.use(express.static(path.join(__dirname, "/")));

// Fallback route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Create HTTP server then attach ws
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Track connected clients
let viewers = 0;

function broadcastViewerCount() {
  const payload = JSON.stringify({ type: "viewerCount", count: viewers });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

wss.on("connection", function connection(ws, req) {
  // Increase count
  viewers++;
  broadcastViewerCount();

  // Optionally keep a heartbeat for stale connections
  ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));

  // You can store client metadata here if desired
  ws.on("message", (msg) => {
    // For future extensibility; not used now
    try {
      const d = JSON.parse(msg);
      // handle actions...
    } catch (e) {
      // ignore
    }
  });

  ws.on("close", () => {
    viewers = Math.max(0, viewers - 1);
    broadcastViewerCount();
  });

  ws.on("error", () => {
    // In case of error, close connection
    try { ws.terminate(); } catch (e) {}
  });
});

// Basic heartbeat to drop dead connections
const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(() => {});
  });
}, 30000);

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  clearInterval(interval);
  server.close(() => process.exit(0));
});
