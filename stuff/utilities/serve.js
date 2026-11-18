#!/usr/bin/env node

/**
 * High-Performance Local Static Server
 * Zero dependencies — uses native Node.js HTTP, FS, Path, and Child Process.
 * Features automatic port-selection, MIME resolution, and browser launching.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '../..');
const INITIAL_PORT = parseInt(process.env.PORT, 10) || 3000;
const MAX_PORT_ATTEMPTS = 10;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function openBrowser(url) {
  const platform = process.platform;
  let cmd = '';

  if (platform === 'darwin') {
    cmd = `open "${url}"`;
  } else if (platform === 'win32') {
    cmd = `start "" "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }

  exec(cmd, (err) => {
    if (err) {
      console.log(`  \x1b[33mℹ Please open manually:\x1b[0m \x1b[4m${url}\x1b[0m`);
    }
  });
}

function createServer(port, attempt = 0) {
  if (attempt >= MAX_PORT_ATTEMPTS) {
    console.error(`\x1b[31m✖ Error: Could not find an open port after ${MAX_PORT_ATTEMPTS} attempts.\x1b[0m`);
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') {
      reqPath = '/index.html';
    }

    const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(ROOT_DIR, safePath);

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // Fallback to index.html for client-side routing if applicable
        filePath = path.join(ROOT_DIR, 'index.html');
      }

      fs.readFile(filePath, (readErr, content) => {
        if (readErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('500 Internal Server Error');
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(content);
      });
    });
  });

  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`\x1b[33m⚠ Port ${port} is currently in use. Trying port ${port + 1}...\x1b[0m`);
      createServer(port + 1, attempt + 1);
    } else {
      console.error(`\x1b[31m✖ Server Error:\x1b[0m`, err);
      process.exit(1);
    }
  });

  server.once('listening', () => {
    const url = `http://localhost:${port}`;
    console.log('\n\x1b[1m\x1b[36m===================================================\x1b[0m');
    console.log('\x1b[1m\x1b[32m   🚀 PORTFOLIO APPLICATION RUNNING SUCCESSFULLY!   \x1b[0m');
    console.log('\x1b[1m\x1b[36m===================================================\x1b[0m');
    console.log(`\n  \x1b[1mLocal URL:\x1b[0m    \x1b[36m\x1b[4m${url}\x1b[0m`);
    console.log(`  \x1b[1mServing Dir:\x1b[0m  \x1b[90m${ROOT_DIR}\x1b[0m`);
    console.log(`  \x1b[1mStatus:\x1b[0m       \x1b[32mActive (Press Ctrl+C to stop)\x1b[0m\n`);

    if (process.env.NO_OPEN !== 'true') {
      console.log(`  \x1b[32m✔ Launching browser automatically...\x1b[0m\n`);
      openBrowser(url);
    }
  });

  server.listen(port);
}

// Start server
createServer(INITIAL_PORT);
