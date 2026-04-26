const express = require('express');
const https = require('https');

const app = express();
const PORT = 8080;

app.use(express.json({ limit: '5mb' }));

// ──────────────────────────────────────────────
//  Health check
// ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'exnexus-multi-exchange-proxy',
    ip: '178.105.33.126',
    exchanges: ['binance', 'bybit', 'gate', 'alpaca']
  });
});

// ──────────────────────────────────────────────
//  Generic forwarder helper
// ──────────────────────────────────────────────
function forward(req, res, targetHost, targetPath, headersToForward) {
  const options = {
    hostname: targetHost,
    port: 443,
    path: targetPath,
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'ExNexus/1.0',
      ...headersToForward
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode);
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`Proxy error [${targetHost}]:`, err.message);
    res.status(502).json({ error: 'Proxy failed', message: err.message });
  });

  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    proxyReq.write(JSON.stringify(req.body));
  }
  proxyReq.end();
}

// ──────────────────────────────────────────────
//  Binance — spot or futures via x-binance-host
// ──────────────────────────────────────────────
app.all('/binance/*path', (req, res) => {
  const path = req.url.replace('/binance', '');
  const host = req.headers['x-binance-host'] || 'fapi.binance.com';
  forward(req, res, host, path, {
    'X-MBX-APIKEY': req.headers['x-mbx-apikey'] || ''
  });
});

// ──────────────────────────────────────────────
//  Bybit — single host, HMAC headers
// ──────────────────────────────────────────────
app.all('/bybit/*path', (req, res) => {
  const path = req.url.replace('/bybit', '');
  forward(req, res, 'api.bybit.com', path, {
    'X-BAPI-API-KEY':     req.headers['x-bapi-api-key']     || '',
    'X-BAPI-SIGN':        req.headers['x-bapi-sign']        || '',
    'X-BAPI-TIMESTAMP':   req.headers['x-bapi-timestamp']   || '',
    'X-BAPI-RECV-WINDOW': req.headers['x-bapi-recv-window'] || '',
    'X-BAPI-SIGN-TYPE':   req.headers['x-bapi-sign-type']   || '2'
  });
});

// ──────────────────────────────────────────────
//  Gate.io — single host, KEY/SIGN/Timestamp
// ──────────────────────────────────────────────
app.all('/gate/*path', (req, res) => {
  const path = req.url.replace('/gate', '');
  forward(req, res, 'api.gateio.ws', path, {
    'KEY':       req.headers['key']       || '',
    'SIGN':      req.headers['sign']      || '',
    'Timestamp': req.headers['timestamp'] || ''
  });
});

// ──────────────────────────────────────────────
//  Alpaca — paper or live via x-alpaca-host
// ──────────────────────────────────────────────
app.all('/alpaca/*path', (req, res) => {
  const path = req.url.replace('/alpaca', '');
  const host = req.headers['x-alpaca-host'] || 'paper-api.alpaca.markets';
  forward(req, res, host, path, {
    'APCA-API-KEY-ID':     req.headers['apca-api-key-id']     || '',
    'APCA-API-SECRET-KEY': req.headers['apca-api-secret-key'] || ''
  });
});

// ──────────────────────────────────────────────
//  Catch-all
// ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Unknown route',
    hint: 'Use /binance/*, /bybit/*, /gate/*, or /alpaca/*'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ExNexus Multi-Exchange Proxy listening on port ${PORT}`);
  console.log('Routes: /binance/* /bybit/* /gate/* /alpaca/*');
  console.log('Server IP: 178.105.33.126');
});
