/**
 * 功能：记忆管理路由（添加 / 批量添加 / 更新录音 / 列表 / 删除）
 * 输入：POST / (批量照片+录音+笔记), PATCH /:id/audio (更新录音), GET /:albumId, DELETE /:id
 * 输出：JSON 响应（记忆信息）
 * 运行方式：被 index.js 挂载到 /api/memories
 * 依赖：express, multer, sharp, exif-parser, db.js, middleware/auth.js
 * 项目作用：记忆的增删改查，包含文件上传、EXIF 日期提取和缩略图生成
 * 最后修改：2026-02-25
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { reverseGeocode } = require('../utils/geocode');

const router = express.Router();
router.use(authMiddleware);

// 确保上传目录存在
const uploadsDir = path.join(__dirname, '..', 'uploads');
const photosDir = path.join(uploadsDir, 'photos');
const thumbsDir = path.join(uploadsDir, 'thumbnails');
const audiosDir = path.join(uploadsDir, 'audios');

[uploadsDir, photosDir, thumbsDir, audiosDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer 配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'photos' || file.fieldname === 'photo') {
      cb(null, photosDir);
    } else if (file.fieldname === 'audio') {
      cb(null, audiosDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ext = path.extname(file.originalname) || (file.fieldname === 'audio' ? '.webm' : '.jpg');
    cb(null, uniqueName + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'photos' || file.fieldname === 'photo') {
      const allowed = /jpeg|jpg|png|gif|webp|heic|heif/i;
      if (allowed.test(path.extname(file.originalname)) || file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('只支持图片格式'));
      }
    } else if (file.fieldname === 'audio') {
      cb(null, true);
    } else {
      cb(null, true);
    }
  }
});

// 检查用户是否为相册成员
function checkMembership(albumId, userId) {
  return db.prepare(
    'SELECT * FROM album_members WHERE album_id = ? AND user_id = ?'
  ).get(albumId, userId);
}

// 从照片文件提取 EXIF 信息（日期 + GPS 位置）
function extractExifInfo(filePath) {
  const info = { date: null, location: null };
  try {
    const buffer = fs.readFileSync(filePath);
    if (buffer.length < 2 || buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
      return info;
    }
    const ExifParser = require('exif-parser');
    const parser = ExifParser.create(buffer);
    parser.enableSimpleValues(true);
    const result = parser.parse();

    // 提取拍摄日期
    const timestamp = result.tags.DateTimeOriginal
      || result.tags.CreateDate
      || result.tags.ModifyDate;
    if (timestamp) {
      const d = new Date(timestamp * 1000);
      if (!isNaN(d.getTime()) && d.getFullYear() > 1970) {
        info.date = d.toISOString().split('T')[0];
      }
    }

    // 提取 GPS 坐标并反向地理编码
    const lat = result.tags.GPSLatitude;
    const lng = result.tags.GPSLongitude;
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      const city = reverseGeocode(lat, lng);
      if (city) {
        info.location = city;
      }
    }
  } catch (e) {
    console.warn('EXIF 解析失败:', e.message);
  }
  return info;
}

// 生成缩略图，返回 URL
async function generateThumbnail(photoFile) {
  try {
    const thumbFilename = `thumb_${photoFile.filename.replace(path.extname(photoFile.filename), '.webp')}`;
    await sharp(photoFile.path)
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 80 })
      .toFile(path.join(thumbsDir, thumbFilename));
    return `/uploads/thumbnails/${thumbFilename}`;
  } catch (e) {
    console.warn('缩略图生成失败:', e.message);
    return `/uploads/photos/${photoFile.filename}`;
  }
}

// 添加记忆（支持批量上传，最多9张照片）
router.post('/', upload.fields([
  { name: 'photos', maxCount: 9 },
  { name: 'photo', maxCount: 1 },   // 兼容单张上传
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  try {
    const { album_id, note, memory_date } = req.body;

    if (!album_id) {
      return res.status(400).json({ error: '请指定相册' });
    }

    if (!checkMembership(album_id, req.user.id)) {
      return res.status(403).json({ error: '你不是该相册的成员' });
    }

    // 收集所有照片文件
    const photoFiles = [];
    if (req.files && req.files.photos) {
      photoFiles.push(...req.files.photos);
    }
    if (req.files && req.files.photo) {
      photoFiles.push(...req.files.photo);
    }

    if (photoFiles.length > 9) {
      return res.status(400).json({ error: '一次最多上传 9 张照片' });
    }

    // 获取共用的录音
    let audioUrl = null;
    if (req.files && req.files.audio && req.files.audio[0]) {
      audioUrl = `/uploads/audios/${req.files.audio[0].filename}`;
    }

    const createdMemories = [];

    if (photoFiles.length === 0) {
      // 没有照片，创建纯文字/录音记忆
      if (!note && !audioUrl) {
        return res.status(400).json({ error: '至少上传一张照片、一段语音或一段文字' });
      }
      const result = db.prepare(`
        INSERT INTO memories (album_id, user_id, photo_url, thumbnail_url, audio_url, note, location, memory_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(album_id, req.user.id, null, null, audioUrl, note || '', null, memory_date || null);

      const memory = db.prepare(`
        SELECT m.*, u.nickname as author_name
        FROM memories m JOIN users u ON m.user_id = u.id
        WHERE m.id = ?
      `).get(result.lastInsertRowid);
      createdMemories.push(memory);
    } else {
      // 批量创建记忆：每张照片一条
      for (let i = 0; i < photoFiles.length; i++) {
        const photoFile = photoFiles[i];
        const photoUrl = `/uploads/photos/${photoFile.filename}`;
        const thumbnailUrl = await generateThumbnail(photoFile);

        // 从 EXIF 读取拍摄日期和 GPS 位置
        const exifInfo = extractExifInfo(photoFile.path);
        const finalDate = memory_date || exifInfo.date || null;
        const location = exifInfo.location || null;

        // 只有第一张照片带文字和录音
        const memNote = (i === 0) ? (note || '') : '';
        const memAudio = (i === 0) ? audioUrl : null;

        const result = db.prepare(`
          INSERT INTO memories (album_id, user_id, photo_url, thumbnail_url, audio_url, note, location, memory_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(album_id, req.user.id, photoUrl, thumbnailUrl, memAudio, memNote, location, finalDate);

        const memory = db.prepare(`
          SELECT m.*, u.nickname as author_name
          FROM memories m JOIN users u ON m.user_id = u.id
          WHERE m.id = ?
        `).get(result.lastInsertRowid);
        createdMemories.push(memory);
      }
    }

    // 通过 Socket.io 通知其他成员
    if (req.app.get('io')) {
      for (const memory of createdMemories) {
        req.app.get('io').to(`album_${album_id}`).emit('new_memory', memory);
      }
    }

    res.json({
      memories: createdMemories,
      memory: createdMemories[0] // 兼容单条返回
    });
  } catch (err) {
    console.error('添加记忆失败:', err);
    res.status(500).json({ error: '添加记忆失败' });
  }
});

// 为已有记忆添加/更新录音
router.patch('/:id/audio', upload.fields([
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  try {
    const memory = db.prepare('SELECT * FROM memories WHERE id = ?').get(req.params.id);

    if (!memory) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    if (!checkMembership(memory.album_id, req.user.id)) {
      return res.status(403).json({ error: '你不是该相册的成员' });
    }

    if (!req.files || !req.files.audio || !req.files.audio[0]) {
      return res.status(400).json({ error: '请上传录音文件' });
    }

    // 删除旧录音文件
    if (memory.audio_url) {
      const oldPath = path.join(__dirname, '..', memory.audio_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const audioUrl = `/uploads/audios/${req.files.audio[0].filename}`;
    db.prepare('UPDATE memories SET audio_url = ? WHERE id = ?').run(audioUrl, memory.id);

    const updated = db.prepare(`
      SELECT m.*, u.nickname as author_name
      FROM memories m JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `).get(memory.id);

    // 通知其他成员
    if (req.app.get('io')) {
      req.app.get('io').to(`album_${memory.album_id}`).emit('update_memory', updated);
    }

    res.json({ memory: updated });
  } catch (err) {
    console.error('更新录音失败:', err);
    res.status(500).json({ error: '更新录音失败' });
  }
});

// 更新记忆笔记
router.patch('/:id/note', (req, res) => {
  const memory = db.prepare('SELECT * FROM memories WHERE id = ?').get(req.params.id);

  if (!memory) {
    return res.status(404).json({ error: '记忆不存在' });
  }

  if (!checkMembership(memory.album_id, req.user.id)) {
    return res.status(403).json({ error: '你不是该相册的成员' });
  }

  const { note } = req.body;
  db.prepare('UPDATE memories SET note = ? WHERE id = ?').run(note || '', memory.id);

  const updated = db.prepare(`
    SELECT m.*, u.nickname as author_name
    FROM memories m JOIN users u ON m.user_id = u.id
    WHERE m.id = ?
  `).get(memory.id);

  if (req.app.get('io')) {
    req.app.get('io').to(`album_${memory.album_id}`).emit('update_memory', updated);
  }

  res.json({ memory: updated });
});

// 删除记忆的录音
router.delete('/:id/audio', (req, res) => {
  const memory = db.prepare('SELECT * FROM memories WHERE id = ?').get(req.params.id);

  if (!memory) {
    return res.status(404).json({ error: '记忆不存在' });
  }

  if (!checkMembership(memory.album_id, req.user.id)) {
    return res.status(403).json({ error: '你不是该相册的成员' });
  }

  if (memory.audio_url) {
    const audioPath = path.join(__dirname, '..', memory.audio_url);
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
  }

  db.prepare('UPDATE memories SET audio_url = NULL WHERE id = ?').run(memory.id);

  const updated = db.prepare(`
    SELECT m.*, u.nickname as author_name
    FROM memories m JOIN users u ON m.user_id = u.id
    WHERE m.id = ?
  `).get(memory.id);

  if (req.app.get('io')) {
    req.app.get('io').to(`album_${memory.album_id}`).emit('update_memory', updated);
  }

  res.json({ memory: updated });
});

// 获取相册的所有记忆
router.get('/:albumId', (req, res) => {
  const { albumId } = req.params;

  if (!checkMembership(albumId, req.user.id)) {
    return res.status(403).json({ error: '你不是该相册的成员' });
  }

  const memories = db.prepare(`
    SELECT m.*, u.nickname as author_name
    FROM memories m
    JOIN users u ON m.user_id = u.id
    WHERE m.album_id = ?
    ORDER BY COALESCE(m.memory_date, m.created_at) DESC
  `).all(albumId);

  res.json({ memories });
});

// 删除记忆
router.delete('/:id', (req, res) => {
  const memory = db.prepare('SELECT * FROM memories WHERE id = ?').get(req.params.id);

  if (!memory) {
    return res.status(404).json({ error: '记忆不存在' });
  }

  // 只有作者或相册管理员可以删除
  const membership = checkMembership(memory.album_id, req.user.id);
  if (memory.user_id !== req.user.id && (!membership || membership.role !== 'admin')) {
    return res.status(403).json({ error: '无权删除此记忆' });
  }

  // 删除文件
  if (memory.photo_url) {
    const photoPath = path.join(__dirname, '..', memory.photo_url);
    if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
  }
  if (memory.thumbnail_url && memory.thumbnail_url !== memory.photo_url) {
    const thumbPath = path.join(__dirname, '..', memory.thumbnail_url);
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
  }
  if (memory.audio_url) {
    const audioPath = path.join(__dirname, '..', memory.audio_url);
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
  }

  db.prepare('DELETE FROM memories WHERE id = ?').run(req.params.id);

  if (req.app.get('io')) {
    req.app.get('io').to(`album_${memory.album_id}`).emit('delete_memory', { id: memory.id });
  }

  res.json({ success: true });
});

module.exports = router;
