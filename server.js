const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static frontend
app.use(express.static(path.join(__dirname, "public")));

// Proxy TataPlay HLS streams
app.use(
  "/stream",
  createProxyMiddleware({
    target: "https://tataplay.slivcdn.com",
    changeOrigin: true,
    pathRewrite: {
      "^/stream/(.*)": "/hls/live/2020591/TEN3HD/$1", // rewrite 360p, 480p, 720p, 1080p
    },
    onProxyReq: (proxyReq, req, res) => {
      // Mimic browser headers
      proxyReq.setHeader("Origin", "https://tataplay.com");
      proxyReq.setHeader(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
      );
    },
    onProxyRes: (proxyRes, req, res) => {
      // Allow cross-origin
      proxyRes.headers["Access-Control-Allow-Origin"] = "*";
      proxyRes.headers["Cache-Control"] = "public, max-age=10";

      // Log common errors
      if (proxyRes.statusCode === 403) {
        console.error("🚫 TataPlay 403 Forbidden:", req.url);
      }
      if (proxyRes.statusCode === 404) {
        console.error("❌ TataPlay 404 Not Found:", req.url);
      }
    },
    onError: (err, req, res) => {
      console.error("🔥 Proxy error:", err.message);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Proxy Error: Unable to fetch TataPlay stream");
    },
  })
);

// WebSocket: Track live viewers
let viewers = 0;

wss.on("connection", (ws) => {
  viewers++;
  broadcastViewers();

  ws.on("close", () => {
    viewers--;
    broadcastViewers();
  });
});

function broadcastViewers() {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ viewers }));
    }
  });
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
