const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static frontend (index.html)
app.use(express.static("public"));

// Proxy TataPlay links to bypass CORS
app.use(
  "/stream",
  createProxyMiddleware({
    target: "https://tataplay.slivcdn.com",
    changeOrigin: true,
    pathRewrite: {
      "^/stream": "/hls/live/2020591/TEN3HD",
    },
    secure: true,
  })
);

// Track live connected users
let viewers = 0;

wss.on("connection", (ws) => {
  viewers++;
  broadcastViewers();

  // Send initial viewers count to the new client
  ws.send(JSON.stringify({ viewers }));

  ws.on("close", () => {
    viewers--;
    broadcastViewers();
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
  });
});

// Broadcast viewers count to all connected clients
function broadcastViewers() {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ viewers }));
    }
  });
}

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
