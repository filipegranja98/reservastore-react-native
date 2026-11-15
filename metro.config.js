const { getDefaultConfig } = require('expo/metro-config');
const http = require('node:http');
const config = getDefaultConfig(__dirname);
// Opt-in, development-only API relay. Backend remains bound to loopback.
if (process.env.RESERVASTORE_DEV_API_PROXY === 'true') {
  const previous = config.server.enhanceMiddleware;
  config.server.enhanceMiddleware = (middleware, server) => {
    const next = previous ? previous(middleware, server) : middleware;
    return (req, res, nextHandler) => {
      if (!req.url.startsWith('/api/')) return next(req, res, nextHandler);
      const upstream = http.request({hostname:'127.0.0.1',port:8002,path:req.url,method:req.method,headers:{...req.headers,host:'127.0.0.1:8002'}}, reply => {
        res.writeHead(reply.statusCode, reply.headers);
        reply.pipe(res);
      });
      upstream.on('error', () => {
        if (!res.headersSent) res.writeHead(502, {'Content-Type':'application/json'});
        res.end(JSON.stringify({detail:'API de teste indisponível. Inicie o backend local.'}));
      });
      req.on('aborted', () => upstream.destroy());
      req.pipe(upstream);
    };
  };
}
module.exports = config;
