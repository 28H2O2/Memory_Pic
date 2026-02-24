/**
 * 功能：JWT 认证中间件
 * 输入：HTTP 请求头中的 Authorization: Bearer <token>
 * 输出：解析后的用户信息挂载到 req.user
 * 运行方式：被路由文件引入作为中间件使用
 * 依赖：jsonwebtoken
 * 项目作用：保护需要登录才能访问的 API
 * 最后修改：2026-02-25
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'memory-pic-secret-key-2026';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '请先登录' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
