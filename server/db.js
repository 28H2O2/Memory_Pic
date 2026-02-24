/**
 * 功能：SQLite 数据库初始化与连接管理
 * 输入：无外部输入
 * 输出：初始化好的数据库实例，数据文件保存到 ./data/memory_pic.db
 * 运行方式：被 index.js 引入
 * 依赖：better-sqlite3
 * 项目作用：数据持久化层，管理用户、相册、记忆等核心数据表
 * 最后修改：2026-02-25
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 确保数据目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'memory_pic.db'));

// 开启 WAL 模式提升并发性能
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 创建数据表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    avatar TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    cover TEXT DEFAULT NULL,
    invite_code TEXT NOT NULL UNIQUE,
    creator_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS album_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    album_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(album_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    album_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    photo_url TEXT DEFAULT NULL,
    thumbnail_url TEXT DEFAULT NULL,
    audio_url TEXT DEFAULT NULL,
    note TEXT DEFAULT '',
    memory_date DATE DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_memories_album ON memories(album_id);
  CREATE INDEX IF NOT EXISTS idx_memories_date ON memories(memory_date);
  CREATE INDEX IF NOT EXISTS idx_album_members_album ON album_members(album_id);
  CREATE INDEX IF NOT EXISTS idx_album_members_user ON album_members(user_id);
`);

module.exports = db;
