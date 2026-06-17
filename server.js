// =======================================================
// server.js — LGP Palavras
// Servidor HTTP em Node.js puro (sem dependências externas)
// Serve os ficheiros estáticos da pasta /public na rede local
// =======================================================

const http = require('http');
const fs   = require('fs');
const path = require('path');

// -------------------------------------------------------
// CONFIGURAÇÃO
// -------------------------------------------------------
const PORT      = 3000;                          // porta onde o jogo fica disponível
const PUBLIC_DIR = path.join(__dirname, 'public'); // pasta com os ficheiros do jogo

// Mapa de extensões → tipo MIME
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css' : 'text/css; charset=utf-8',
  '.js'  : 'application/javascript; charset=utf-8',
  '.ico' : 'image/x-icon',
  '.png' : 'image/png',
  '.jpg' : 'image/jpeg',
  '.svg' : 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

// -------------------------------------------------------
// SERVIDOR HTTP
// -------------------------------------------------------
const server = http.createServer((req, res) => {

  // Normaliza o URL (remove query strings, evita path traversal)
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const safePath  = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath  = path.join(PUBLIC_DIR, safePath);
  const ext       = path.extname(filePath).toLowerCase();
  const mimeType  = MIME_TYPES[ext] || 'application/octet-stream';

  // Lê e serve o ficheiro
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Ficheiro não encontrado → 404
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`404 — Ficheiro não encontrado: ${urlPath}`);
      } else {
        // Outro erro do sistema de ficheiros → 500
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 — Erro interno do servidor');
      }
      console.error(`[ERRO] ${req.method} ${urlPath} →`, err.code);
      return;
    }

    // Cabeçalhos de resposta
    res.writeHead(200, {
      'Content-Type'  : mimeType,
      'Content-Length': data.length,
      // Permite câmara via HTTPS / localhost
      'Permissions-Policy'            : 'camera=*',
      // Cache curto em desenvolvimento
      'Cache-Control'                 : 'no-cache',
    });
    res.end(data);

    console.log(`[OK]   ${req.method} ${urlPath} → ${mimeType}`);
  });
});

// -------------------------------------------------------
// ARRANQUE
// -------------------------------------------------------
server.listen(PORT, '0.0.0.0', () => {
  // Descobre os IPs da máquina para partilha na rede local
  const os       = require('os');
  const ifaces   = os.networkInterfaces();
  const localIPs = [];

  Object.values(ifaces).forEach(list => {
    list.forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIPs.push(iface.address);
      }
    });
  });

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║       LGP Palavras — Servidor ativo      ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Local:    http://localhost:${PORT}         ║`);

  localIPs.forEach(ip => {
    // Paddings para alinhar a caixa
    const line = `  Rede:     http://${ip}:${PORT}`;
    const pad  = ' '.repeat(Math.max(0, 42 - line.length));
    console.log(`║${line}${pad}║`);
  });

  console.log('╠══════════════════════════════════════════╣');
  console.log('║  Partilha o link da Rede com qualquer    ║');
  console.log('║  pessoa na mesma rede Wi-Fi!             ║');
  console.log('║                                          ║');
  console.log('║  Ctrl+C para parar o servidor            ║');
  console.log('╚══════════════════════════════════════════╝\n');
});

// Tratamento de erros do servidor
server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ A porta ${PORT} já está em uso.`);
    console.error(`   Tenta: node server.js (noutra porta)`);
    console.error(`   Ou muda PORT no ficheiro server.js\n`);
  } else {
    console.error('Erro no servidor:', err);
  }
  process.exit(1);
});
