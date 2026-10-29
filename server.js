// Local server: run with `node server.js`, then open http://localhost:3000
// Reads AI_API_KEY from a .env file and reuses api/generate.js. Needs Node 18+.
const http = require('http');
const fs = require('fs');
const path = require('path');

try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/).forEach(l => {
    const m = l.match(/^\s*(\w+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch (e) {
  console.log('No .env file found. AI calls will use the fallback lines.');
}

const handler = require('./api/generate.js');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.ico': 'image/x-icon' };

http.createServer((req, res) => {
  if (req.url.startsWith('/api/generate')) {
    let b = '';
    req.on('data', c => { b += c; });
    req.on('end', () => {
      try { req.body = b ? JSON.parse(b) : {}; } catch (e) { req.body = {}; }
      res.status = c => { res.statusCode = c; return res; };
      res.json = o => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
      handler(req, res);
    });
    return;
  }

  let p = req.url.split('?')[0];
  if (p === '/') p = '/index.html';
  const f = path.join(__dirname, path.normalize(p));
  const base = path.basename(f);
  // Never serve the key file, dotfiles, or the server itself
  if (!f.startsWith(__dirname) || base.startsWith('.') || base === 'server.js') {
    res.statusCode = 404;
    return res.end('Not found');
  }
  fs.readFile(f, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream');
    res.end(data);
  });
}).listen(3000, () => console.log('Rizzorante running at http://localhost:3000'));
