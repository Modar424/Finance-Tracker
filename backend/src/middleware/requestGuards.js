// CSRF defence in depth (on top of SameSite cookies): state-changing requests must carry a
// custom header, which browsers will not send cross-origin without a CORS preflight.
function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-requested-with') !== 'XMLHttpRequest')
    return res.status(403).json({ message: 'Missing required request header' });
  next();
}

// Requests that carry a body must be JSON.
function jsonOnly(req, res, next) {
  const hasBody = Number(req.headers['content-length']) > 0 || req.headers['transfer-encoding'];
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && hasBody && !req.is('application/json'))
    return res.status(415).json({ message: 'Content-Type must be application/json' });
  next();
}

module.exports = { csrfGuard, jsonOnly };
