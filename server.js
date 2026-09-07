// Minimal static file server. The site itself is fully static (index.html + CSS + JS),
// so this only exists for hosts that expect a Node process (Railway, Render, Fly, etc.).
// On a static host (GitHub Pages, Netlify, Cloudflare Pages) this file is not used at all.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// Only these files are ever served. Everything else (server.js, package.json, .git/,
// README, CLAUDE.md …) is treated as not found.
const PUBLIC_FILES = new Set([
  "/index.html",
  "/style.css",
  "/script.js",
  "/data.js",
  "/favicon.svg",
  "/apple-touch-icon.png",
  "/og-image.png",
  "/robots.txt",
  "/sitemap.xml",
]);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer((req, res) => {
  let reqPath;
  try {
    reqPath = decodeURIComponent(req.url.split("?")[0]);
  } catch {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }
  if (reqPath === "/") reqPath = "/index.html";

  if (!PUBLIC_FILES.has(reqPath)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  fs.readFile(path.join(ROOT, reqPath), (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(reqPath);
    const isHtml = ext === ".html";
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      // HTML must always be fresh so a new deploy is picked up; assets can be cached briefly.
      "Cache-Control": isHtml ? "no-cache" : "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Serving on port ${PORT}`);
});
