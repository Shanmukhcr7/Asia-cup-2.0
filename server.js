const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve frontend
app.use(express.static("public"));

// ---------- HLS Proxy for TataPlay ----------
const streamMap = {
  "/stream/master_664.m3u8": "https://tataplay.slivcdn.com/hls/live/2020591/TEN3HD/master_664.m3u8",
  "/stream/master_900.m3u8": "https://tataplay.slivcdn.com/hls/live/2020591/TEN3HD/master_900.m3u8",
  "/stream/master_2000.m3u8": "https://tataplay.slivcdn.com/hls/live/2020591/TEN3HD/master_2000.m3u8",
  "/stream/master_3500.m3u8": "https://tataplay.slivcdn.com/hls/live/2020591/TEN3HD/master_3500.m3u8",
};

app.use(
  "/stream",
  createProxyMiddleware({
    target: "https://tataplay.slivcdn.com",
    changeOrigin: true,
    router: streamMap,
    onProxyReq: (proxyReq) => {
      proxyReq.setHeader("Referer", "https://tataplay.slivcdn.com/");
      proxyReq.setHeader(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36"
      );
    },
    onProxyRes: (proxyRes) => {
      proxyRes.headers["Access-Control-Allow-Origin"] = "*";
      proxyRes.headers["Cache-Control"] = "public, max-age=10";
    },
    onError: (err, req, res) => {
      console.error("Proxy error:", err.message);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Unable to fetch stream");
    },
  })
);

// ---------- WebSocket Viewer Count ----------
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

// ---------- Start Server ----------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
