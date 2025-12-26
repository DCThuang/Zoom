const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer, WebSocket } = require('ws');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';

// 缓存已知存在的上传文件路径（避免重复 fs.existsSync）
const knownUploadFiles = new Set();
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);
const wsPort = parseInt(process.env.WS_PORT || '3001', 10); // 独立的 WebSocket 端口

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

/**
 * 某些反代/代理在 WebSocket Upgrade 时会把 request-target 以 absolute-form 传进来：
 * - ws://host:port/path?query
 * - ws:/host:port/path?query   (只有一个 /)
 * - //host:port/path?query
 *
 * Next dev 的 upgrade handler 期望 req.url 是 origin-form（以 / 开头），
 * 否则会进入 Next 的 proxyRequest 分支，最终打印：
 *   Failed to proxy ws:/... ECONNREFUSED 127.0.0.1:80
 * 这里我们在进入 Next upgrade handler 前，先把 absolute-form 统一规整成 /path?query。
 */
function normalizeUpgradeUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return urlStr;

  // absolute-form: scheme:/+host[:port]/path...
  // 兼容 ws:/host/path 与 ws://host/path（/ 的数量不固定）
  const m = urlStr.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/+[^/]+/);
  if (m) {
    const rest = urlStr.slice(m[0].length);
    return rest.startsWith('/') ? rest : `/${rest}`;
  }

  // schemeless absolute-form: //host[:port]/path...
  if (urlStr.startsWith('//')) {
    const idx = urlStr.indexOf('/', 2);
    if (idx === -1) return '/';
    return urlStr.slice(idx);
  }

  return urlStr;
}

// 存储所有 WebSocket 连接，按 sessionId 分组
const sessionConnections = new Map(); // sessionId -> Set<ws>

// 广播消息给同一 session 的所有连接
function broadcastToSession(sessionId, message, excludeWs = null) {
  const connections = sessionConnections.get(sessionId);
  if (!connections) return;
  
  const data = JSON.stringify(message);
  connections.forEach(ws => {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

app.prepare().then(() => {
  // 创建独立的 WebSocket 服务器
  const wsServer = createServer();
  const wss = new WebSocketServer({ server: wsServer });

  // 处理 WebSocket 连接
  wss.on('connection', (ws, request) => {
    const { query } = parse(request.url, true);
    const sessionId = query.sessionId;
    
    if (!sessionId) {
      ws.close(1008, 'Missing sessionId');
      return;
    }

    // 添加到连接池
    if (!sessionConnections.has(sessionId)) {
      sessionConnections.set(sessionId, new Set());
    }
    sessionConnections.get(sessionId).add(ws);
    
    console.log(`WebSocket connected: sessionId=${sessionId}, total=${sessionConnections.get(sessionId).size}`);

    // 发送连接成功消息
    ws.send(JSON.stringify({ type: 'connected', sessionId }));

    // 处理收到的消息
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'sync':
            broadcastToSession(sessionId, {
              type: 'sync',
              data: message.data,
              from: message.from || 'unknown'
            }, ws);
            break;
            
          case 'played_card':
            broadcastToSession(sessionId, {
              type: 'played_card',
              data: message.data
            }, ws);
            break;
            
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
            
          default:
            broadcastToSession(sessionId, message, ws);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    });

    // 处理连接关闭
    ws.on('close', () => {
      const connections = sessionConnections.get(sessionId);
      if (connections) {
        connections.delete(ws);
        console.log(`WebSocket disconnected: sessionId=${sessionId}, remaining=${connections.size}`);
        if (connections.size === 0) {
          sessionConnections.delete(sessionId);
        }
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });
  });

  // 启动 WebSocket 服务器（独立端口）
  wsServer.listen(wsPort, hostname, () => {
    console.log(`> WebSocket server running on ws://${hostname}:${wsPort}`);
  });

  // 创建 Next.js HTTP 服务器
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      
      // 手动处理 /uploads 路径的静态文件
      // 解决 Next.js 无法访问构建后新上传文件的问题
      // 开发模式和生产模式都需要，因为 Next.js 只认识构建时已存在的静态文件
      if (parsedUrl.pathname && parsedUrl.pathname.startsWith('/uploads/')) {
        const filePath = path.join(process.cwd(), 'public', parsedUrl.pathname);
        
        // 先检查内存缓存（避免重复 fs 调用），再检查文件系统
        const fileExists = knownUploadFiles.has(filePath) || fs.existsSync(filePath);
        
        if (fileExists) {
          knownUploadFiles.add(filePath);
          
          const ext = path.extname(filePath).toLowerCase();
          const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
          };
          
          const contentType = mimeTypes[ext] || 'application/octet-stream';
          const fileStream = fs.createReadStream(filePath);
          
          res.writeHead(200, { 
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=604800' // 7天缓存
          });
          fileStream.pipe(res);
          return;
        }
      }
      
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  /**
   * 关键：把 WebSocket upgrade 交给 Next.js（用于 /_next/webpack-hmr 等开发热更新通道）
   * 否则会出现 “Failed to proxy ws:.../_next/webpack-hmr ... ECONNREFUSED 127.0.0.1:80”
   */
  try {
    const upgradeHandler = app.getUpgradeHandler();
    server.on('upgrade', (req, socket, head) => {
      const before = req.url;
      req.url = normalizeUpgradeUrl(req.url);
      if (dev && before !== req.url) {
        console.warn(`[upgrade] normalized req.url: "${before}" -> "${req.url}"`);
      }
      upgradeHandler(req, socket, head);
    });
  } catch (err) {
    console.warn('Next upgrade handler not available:', err);
  }

  // 错误处理
  server.on('error', (err) => {
    console.error('Server error:', err);
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});

// 捕获未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
