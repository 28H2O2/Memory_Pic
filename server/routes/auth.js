/**
 * 功能：用户认证路由（注册 / 登录 / 获取当前用户）
 * 输入：POST /register {nickname, password}, POST /login {nickname, password}, GET /me
 * 输出：JSON 响应（用户信息 + JWT token）
 * 运行方式：被 index.js 挂载到 /api/auth
 * 依赖：express, bcryptjs, jsonwebtoken, db.js
 * 项目作用：用户系统，支持简单的昵称+密码注册登录
 * 最后修改：2026-02-25
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// 注册
router.post('/register', (req, res) => {
  const { nickname, password } = req.body;

  if (!nickname || !password) {
    return res.status(400).json({ error: '昵称和密码不能为空' });
  }
  if (nickname.length < 2 || nickname.length > 20) {
    return res.status(400).json({ error: '昵称长度需在 2-20 个字符之间' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: '密码长度至少 4 个字符' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE nickname = ?').get(nickname);
  if (existing) {
    return res.status(409).json({ error: '该昵称已被使用' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (nickname, password_hash) VALUES (?, ?)').run(nickname, passwordHash);

  const token = jwt.sign({ id: result.lastInsertRowid, nickname }, JWT_SECRET, { expiresIn: '30d' });

  res.json({
    user: { id: result.lastInsertRowid, nickname },
    token
  });
});

// 登录
router.post('/login', (req, res) => {
  const { nickname, password } = req.body;

  if (!nickname || !password) {
    return res.status(400).json({ error: '昵称和密码不能为空' });
  }

  const user = db.prepare('SELECT * FROM users WHERE nickname = ?').get(nickname);
  if (!user) {
    return res.status(401).json({ error: '用户不存在' });
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '密码错误' });
  }

  const token = jwt.sign({ id: user.id, nickname: user.nickname }, JWT_SECRET, { expiresIn: '30d' });

  res.json({
    user: { id: user.id, nickname: user.nickname, avatar: user.avatar },
    token
  });
});

// 获取当前用户
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, nickname, avatar, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json({ user });
});

module.exports = router;
