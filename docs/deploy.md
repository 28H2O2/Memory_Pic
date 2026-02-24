# Memory Pic 部署指南 — 火山引擎服务器

## 服务器信息

| 项目 | 值 |
|------|------|
| 公网 IP | `118.196.94.210` |
| 私网 IP | `172.31.0.2` |
| 系统盘 | 40 GB |
| 用途 | 后端 API + 前端静态文件 |

## 部署架构

```
用户手机浏览器
    │
    │  HTTP (端口 3001)
    ▼
┌──────────────────────────────────┐
│  火山引擎服务器 118.196.94.210    │
│                                  │
│  Node.js (PM2 守护)              │
│  ├─ Express API  (/api/*)       │
│  ├─ 静态文件    (前端构建产物)    │
│  ├─ Socket.io   (实时同步)       │
│  └─ SQLite DB   (./data/)       │
└──────────────────────────────────┘
```

> 只需要运行一个 Node.js 进程，同时服务 API 和前端页面。

---

## 部署步骤

### 1. 连接服务器

```bash
ssh root@118.196.94.210
```

### 2. 安装 Node.js（如果没装）

```bash
# 使用 NodeSource 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 验证
node -v   # 应该显示 v20.x.x
npm -v    # 应该显示 10.x.x
```

> 如果服务器是 CentOS/RHEL 系统，使用：
> ```bash
> curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
> yum install -y nodejs
> ```

### 3. 安装 PM2（进程守护）

```bash
npm install -g pm2
```

### 4. 上传项目到服务器

**方法一：从本地电脑用 scp 上传**

在你的 Mac 上执行（**不是**在服务器上）：

```bash
# 先在本地构建前端
cd /Users/h2o2/Desktop/Project/Memory_Pic/client
npm run build

# 打包项目（排除 node_modules）
cd /Users/h2o2/Desktop/Project/Memory_Pic
tar --exclude='node_modules' --exclude='.git' --exclude='server/data' -czf memory_pic.tar.gz .

# 上传到服务器
scp memory_pic.tar.gz root@118.196.94.210:/root/
```

**方法二：通过 Git（如果项目在 GitHub）**

```bash
# 在服务器上
cd /root
git clone https://github.com/你的用户名/Memory_Pic.git
cd Memory_Pic
```

### 5. 在服务器上解压和安装

```bash
# 在服务器上
cd /root
mkdir -p Memory_Pic
cd Memory_Pic
tar -xzf /root/memory_pic.tar.gz

# 安装后端依赖
cd server
npm install --production

# 如果前端还没构建，安装前端依赖并构建
cd ../client
npm install
npm run build
cd ..
```

### 6. 配置环境变量

```bash
# 创建环境变量文件
cat > /root/Memory_Pic/server/.env << 'EOF'
PORT=3001
JWT_SECRET=你的自定义密钥_越长越安全_至少32个字符
NODE_ENV=production
EOF
```

> ⚠️ 请把 `JWT_SECRET` 改成一个随机的长字符串，例如：
> ```bash
> openssl rand -hex 32
> ```

然后在 `server/index.js` 中读取 .env（已内置默认值，不加 .env 也可运行）。

### 7. 用 PM2 启动

```bash
cd /root/Memory_Pic/server
pm2 start index.js --name memory-pic
pm2 save
pm2 startup  # 开机自启
```

常用 PM2 命令：
```bash
pm2 list              # 查看运行状态
pm2 logs memory-pic   # 查看日志
pm2 restart memory-pic # 重启
pm2 stop memory-pic    # 停止
```

### 8. 开放防火墙端口

在**火山引擎控制台**中：

1. 进入 **安全组** 设置
2. 添加入站规则：
   - **协议**：TCP
   - **端口**：3001
   - **来源**：0.0.0.0/0
3. 保存

如果服务器本身也有防火墙：
```bash
# Ubuntu/Debian
ufw allow 3001

# CentOS/RHEL
firewall-cmd --permanent --add-port=3001/tcp
firewall-cmd --reload
```

### 9. 修改前端 API 地址

在上传前，先修改前端指向服务器地址。

**在本地 Mac 上执行**：

```bash
# 在 client 目录创建生产环境配置
cat > /Users/h2o2/Desktop/Project/Memory_Pic/client/.env.production << 'EOF'
VITE_API_URL=http://118.196.94.210:3001
EOF

# 重新构建
cd /Users/h2o2/Desktop/Project/Memory_Pic/client
npm run build
```

然后重新上传 `client/dist` 到服务器，并重启：

```bash
# 本地上传构建产物
scp -r /Users/h2o2/Desktop/Project/Memory_Pic/client/dist root@118.196.94.210:/root/Memory_Pic/client/

# SSH 到服务器重启
ssh root@118.196.94.210 "pm2 restart memory-pic"
```

### 10. 验证

在手机浏览器打开：

```
http://118.196.94.210:3001
```

你应该能看到 Memory Pic 的登录页面 🎉

---

## 一键部署（简化版）

在本地 Mac 执行：

```bash
cd /Users/h2o2/Desktop/Project/Memory_Pic
bash deploy.sh
```

脚本会自动完成：构建前端 → 打包 → 上传 → 服务器安装依赖 → PM2 启动/重启。

---

## 后续升级

每次有代码更新时，在本地执行：

```bash
cd /Users/h2o2/Desktop/Project/Memory_Pic
bash deploy.sh
```

---

## 可选：配置域名 + HTTPS

如果你有域名，可以进一步配置：

### 安装 Nginx（反向代理）

```bash
# 在服务器上
apt-get install -y nginx

# 配置
cat > /etc/nginx/sites-available/memory-pic << 'EOF'
server {
    listen 80;
    server_name 你的域名.com;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

ln -sf /etc/nginx/sites-available/memory-pic /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 配置 HTTPS（Let's Encrypt 免费证书）

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d 你的域名.com
```

配好后前端 `.env.production` 改为：
```
VITE_API_URL=https://你的域名.com
```

---

## 常见问题

**Q: 访问 http://118.196.94.210:3001 打不开？**
- 检查安全组是否开放了 3001 端口
- 检查 PM2 是否在运行：`pm2 list`
- 查看日志排查错误：`pm2 logs memory-pic`

**Q: 照片上传失败？**
- 检查磁盘空间：`df -h`
- 检查 uploads 目录权限：`ls -la /root/Memory_Pic/server/uploads/`

**Q: 手机端录音不工作？**
- 录音需要 HTTPS 或 localhost 环境
- 如果未配 HTTPS，录音在 HTTP 下可能被浏览器禁止
- 建议配置域名 + HTTPS

**Q: 忘记密码怎么办？**
- 目前没有找回密码功能，可以直接操作数据库：
  ```bash
  cd /root/Memory_Pic/server
  node -e "const db=require('./db'); db.prepare('UPDATE users SET password_hash=? WHERE nickname=?').run(require('bcryptjs').hashSync('新密码',10), '用户昵称')"
  ```
