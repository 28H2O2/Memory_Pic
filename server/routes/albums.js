/**
 * 功能：相册管理路由（创建 / 加入 / 列表 / 详情）
 * 输入：POST /create {name, description}, POST /join {inviteCode}, GET /, GET /:id
 * 输出：JSON 响应（相册信息）
 * 运行方式：被 index.js 挂载到 /api/albums
 * 依赖：express, uuid, db.js, middleware/auth.js
 * 项目作用：相册 CRUD 和邀请码系统
 * 最后修改：2026-02-25
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 所有相册路由需要登录
router.use(authMiddleware);

// 生成6位邀请码
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉容易混淆的字符
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 创建相册
router.post('/create', (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: '相册名称不能为空' });
  }

  // 确保邀请码唯一
  let inviteCode;
  do {
    inviteCode = generateInviteCode();
  } while (db.prepare('SELECT id FROM albums WHERE invite_code = ?').get(inviteCode));

  const result = db.prepare(
    'INSERT INTO albums (name, description, invite_code, creator_id) VALUES (?, ?, ?, ?)'
  ).run(name, description || '', inviteCode, req.user.id);

  // 创建者自动成为管理员
  db.prepare(
    'INSERT INTO album_members (album_id, user_id, role) VALUES (?, ?, ?)'
  ).run(result.lastInsertRowid, req.user.id, 'admin');

  const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(result.lastInsertRowid);

  res.json({ album });
});

// 通过邀请码加入相册
router.post('/join', (req, res) => {
  const { inviteCode } = req.body;

  if (!inviteCode) {
    return res.status(400).json({ error: '请输入邀请码' });
  }

  const album = db.prepare('SELECT * FROM albums WHERE invite_code = ?').get(inviteCode.toUpperCase());
  if (!album) {
    return res.status(404).json({ error: '邀请码无效' });
  }

  // 检查是否已加入
  const existing = db.prepare(
    'SELECT id FROM album_members WHERE album_id = ? AND user_id = ?'
  ).get(album.id, req.user.id);

  if (existing) {
    return res.json({ album, message: '你已经在这个相册中了' });
  }

  db.prepare(
    'INSERT INTO album_members (album_id, user_id, role) VALUES (?, ?, ?)'
  ).run(album.id, req.user.id, 'member');

  res.json({ album });
});

// 获取用户的所有相册
router.get('/', (req, res) => {
  const albums = db.prepare(`
    SELECT a.*, am.role,
      (SELECT COUNT(*) FROM memories WHERE album_id = a.id) as memory_count,
      (SELECT COUNT(*) FROM album_members WHERE album_id = a.id) as member_count
    FROM albums a
    JOIN album_members am ON a.id = am.album_id
    WHERE am.user_id = ?
    ORDER BY a.created_at DESC
  `).all(req.user.id);

  res.json({ albums });
});

// 获取相册详情
router.get('/:id', (req, res) => {
  const albumId = req.params.id;

  // 检查用户是否为相册成员
  const membership = db.prepare(
    'SELECT * FROM album_members WHERE album_id = ? AND user_id = ?'
  ).get(albumId, req.user.id);

  if (!membership) {
    return res.status(403).json({ error: '你不是该相册的成员' });
  }

  const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(albumId);
  if (!album) {
    return res.status(404).json({ error: '相册不存在' });
  }

  // 获取成员列表
  const members = db.prepare(`
    SELECT u.id, u.nickname, u.avatar, am.role, am.joined_at
    FROM album_members am
    JOIN users u ON am.user_id = u.id
    WHERE am.album_id = ?
  `).all(albumId);

  res.json({ album, members });
});

module.exports = router;
