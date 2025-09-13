const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve frontend
app.use(express.static("public"));

// ================= HLS Proxy for TataPlay =================
// Official HLS URLs
const streams = {
  "master_664.m3u8": "https://tataplay.slivcdn.com/hls/live/2020591/TEN3HD/master_664.m3u8",
  "master_900.m3u8": "https://tataplay.slivcdn.com/hls/live/2020591/TEN3HD/master_900.m3u8",
  "master_2000.m3u8": "https://tataplay.slivcdn.com/hls/live/2020591/TEN3HD/master_2000.m3u8",
  "master_3500.m3u8": "https://tataplay.slivcdn.com/hls/live/2020591/TEN3HD/master_3500.m3u8"
};

// Proxy each HLS request
app.use(
  "/stream",
  createProxyMiddleware({
    target: "https://tataplay.slivcdn.com",
    changeOrigin: true,
    pathRewrite: (path) => {
      const file = path.replace("/stream/", "");
      if (streams[file]) return streams[file].replace("https://tataplay.slivcdn.com", "");
      return path;
    },
    onProxyReq: (proxyReq) => {
      // Mimic browser headers
      proxyReq.setHeader("Referer", "https://tataplay.slivcdn.com/");
      proxyReq.setHeader(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36"
      );
    },
    onProxyRes: (proxyRes) => {
      // Allow HLS.js in the browser
      proxyRes.headers["Access-Control-Allow-Origin"] = "*";
      proxyRes.headers["Cache-Control"] = "public, max-age=10";
    },
    onError: (err, req, res) => {
      console.error("🔥 Proxy error:", err.message);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Proxy Error: Unable to fetch TataPlay stream");
    },
  })
);

// ================= WebSocket Viewer Count =================
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

// ================= Start Server =================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
