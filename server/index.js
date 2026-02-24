/**
 * 功能：Memory Pic 后端主入口
 * 输入：无直接输入，监听 HTTP 请求
 * 输出：RESTful API 服务，默认端口 3001
 * 运行方式：node index.js 或 npm start
 * 依赖：express, cors, socket.io, 各路由模块
 * 项目作用：后端服务入口，组装所有中间件和路由
 * 最后修改：2026-02-25
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 将 io 实例存到 app 上，方便路由中使用
app.set('io', io);

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件（上传的照片/录音）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/albums', require('./routes/albums'));
app.use('/api/memories', require('./routes/memories'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 生产模式：托管前端构建产物
const clientDist = path.join(__dirname, '..', 'client', 'dist');
const fs = require('fs');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA 回退：非 API/uploads 路由都返回 index.html
  app.get(/^\/(?!api|uploads).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log('📦 已加载前端构建产物');
}

// Socket.io 连接管理
io.on('connection', (socket) => {
  console.log('🔗 用户连接:', socket.id);

  // 加入相册房间
  socket.on('join_album', (albumId) => {
    socket.join(`album_${albumId}`);
    console.log(`📸 用户 ${socket.id} 加入相册 ${albumId}`);
  });

  // 离开相册房间
  socket.on('leave_album', (albumId) => {
    socket.leave(`album_${albumId}`);
  });

  socket.on('disconnect', () => {
    console.log('👋 用户断开:', socket.id);
  });
});

// 启动服务
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n✨ Memory Pic 服务已启动`);
  console.log(`📡 API 地址: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket 已就绪\n`);
});
