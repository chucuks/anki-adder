import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';

const PORT = parseInt(process.env.PORT || '3005', 10);
const PUBLIC_DIR = path.join(__dirname, '../public');
const MAX_REDIRECTS = 5;

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
};

const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
    req.on('error', () => res.destroy());
    res.on('error', () => req.destroy());

    const requestUrl = req.url ?? '/';
    const host = req.headers.host ?? 'localhost';
    const url = new URL(requestUrl, `http://${host}`);

    if (url.pathname.startsWith('/api/oxford/')) {
        handleProxy(url, res, req);
        return;
    }

    serveStatic(url, res);
});

function handleProxy(url: URL, res: http.ServerResponse, req: http.IncomingMessage): void {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, CORS_HEADERS);
        res.end();
        return;
    }

    const oxfordWord = url.pathname.replace('/api/oxford/', '');
    const oxfordUrl = `https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(oxfordWord)}`;
    fetchWithRedirects(oxfordUrl, res);
}

function fetchWithRedirects(targetUrl: string, res: http.ServerResponse, redirectCount = 0): void {
    if (redirectCount > MAX_REDIRECTS) {
        console.error(`[Proxy] Too many redirects: ${targetUrl}`);
        res.writeHead(508);
        res.end('Proxy Error: Too many redirects');
        return;
    }

    https.get(targetUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html',
        }
    }, (proxyRes) => {
        if (proxyRes.statusCode && proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
            const redirectUrl = proxyRes.headers.location.startsWith('http')
                ? proxyRes.headers.location
                : new URL(proxyRes.headers.location, 'https://www.oxfordlearnersdictionaries.com').href;
            fetchWithRedirects(redirectUrl, res, redirectCount + 1);
            return;
        }

        res.writeHead(proxyRes.statusCode || 200, {
            'Content-Type': 'text/html',
            ...CORS_HEADERS,
        });
        proxyRes.pipe(res);
        proxyRes.on('error', () => res.destroy());
        res.on('error', () => proxyRes.destroy());
    }).on('error', (e) => {
        console.error(`[Proxy] Error: ${e.message}`);
        res.writeHead(500);
        res.end('Proxy Error');
    });
}

function serveStatic(url: URL, res: http.ServerResponse): void {
    const filePath = path.join(PUBLIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname);

    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`);
            }
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
}

server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
        process.exit(1);
    }
    console.error(`Server error:`, err);
    process.exit(1);
});

server.listen(PORT, () => {
    console.log(`
🚀 Anki Adder Web Test Server
---------------------------
URL: http://localhost:${PORT}
Proxy: http://localhost:${PORT}/api/oxford/{word}
    `);
});
