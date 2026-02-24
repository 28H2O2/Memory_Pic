# Memory Pic — 共创记忆相册 📸

一起记录，让回忆动起来。

支持 iPhone + Android 浏览器访问的共创记忆相册 Web App。

---

## ✨ 功能

- 📸 照片上传（拍照/相册选择，自动生成缩略图）
- 🎙️ 语音录制（浏览器内录音）
- 📝 文字笔记
- 👫 邀请码共创（6位邀请码，分享即可加入）
- 🔄 实时同步（一方添加记忆，另一方立刻看到）
- 🎬 记忆时间线（卡片式展示，带入场动画）
- 🌙 暗色主题 + 移动端优先设计

---

## 📋 本地运行步骤

### 前置要求

- [Node.js](https://nodejs.org/) 18 或以上版本
- npm（随 Node.js 一起安装）

### 第一步：安装依赖

```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install
```

### 第二步：启动后端

```bash
cd server
node index.js
```

看到以下输出说明后端启动成功：
```
✨ Memory Pic 服务已启动
📡 API 地址: http://localhost:3001
🔌 WebSocket 已就绪
```

### 第三步：启动前端（开发模式）

打开一个**新的终端窗口**：

```bash
cd client
npm run dev -- --host
```

看到以下输出说明前端启动成功：
```
VITE ready in xxx ms
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.x.x:5173/
```

### 第四步：访问使用

- 电脑浏览器：打开 `http://localhost:5173`
- 手机浏览器：打开 `http://你的电脑IP:5173`（手机和电脑需在同一 WiFi 下）

### 使用流程

1. 注册一个账号（昵称 + 密码）
2. 登录后创建一个相册 → 获得 **6位邀请码**
3. 把邀请码发给对方
4. 对方注册后，输入邀请码加入相册
5. 你们都可以在相册里添加照片、录音、笔记了！

---

## 🚀 部署到服务器

详细的火山引擎部署步骤请参考 [docs/deploy.md](docs/deploy.md)。

快速部署命令（在服务器上执行）：

```bash
# 把项目上传到服务器后
cd Memory_Pic
bash deploy.sh
```

部署完成后，访问 `http://你的服务器公网IP:3001` 即可使用。

---

## 📁 项目结构

```
Memory_Pic/
├── server/                 # 后端 (Node.js + Express + SQLite)
│   ├── index.js            # 服务入口
│   ├── db.js               # 数据库
│   ├── middleware/          # JWT 认证中间件
│   ├── routes/             # API 路由
│   ├── uploads/            # 上传的照片和录音
│   └── data/               # SQLite 数据库文件
├── client/                 # 前端 (Vite + React)
│   └── src/
│       ├── pages/          # 页面组件
│       ├── components/     # 可复用组件
│       └── utils/          # 工具函数
├── deploy.sh               # 一键部署脚本
├── docs/deploy.md          # 部署文档
└── changelog.md            # 更新日志
```
