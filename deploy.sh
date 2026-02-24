#!/bin/bash
# ============================================================
# 功能：Memory Pic 一键部署脚本
# 输入：无（服务器 IP 硬编码在脚本中）
# 输出：将项目部署到火山引擎服务器
# 运行方式：bash deploy.sh
# 依赖：本地需要 Node.js、npm、ssh、scp
# 项目作用：简化部署流程，本地构建后上传到服务器运行
# 最后修改：2026-02-25
# ============================================================

set -e

# ===== 配置 =====
SERVER_IP="118.196.94.210"
SERVER_USER="root"
REMOTE_DIR="/root/Memory_Pic"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "🚀 Memory Pic 部署脚本"
echo "━━━━━━━━━━━━━━━━━━━━━"
echo "📍 服务器: ${SERVER_USER}@${SERVER_IP}"
echo "📁 远程目录: ${REMOTE_DIR}"
echo ""

# ===== 第一步：构建前端 =====
echo "📦 [1/5] 构建前端..."

# 创建/更新生产环境配置
cat > "${PROJECT_DIR}/client/.env.production" << EOF
VITE_API_URL=http://${SERVER_IP}:3001
EOF

cd "${PROJECT_DIR}/client"
npm run build
echo "✅ 前端构建完成"
echo ""

# ===== 第二步：打包项目 =====
echo "📦 [2/5] 打包项目..."
cd "${PROJECT_DIR}"
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='server/data' \
    --exclude='server/uploads' \
    -czf /tmp/memory_pic.tar.gz .
echo "✅ 打包完成: $(du -h /tmp/memory_pic.tar.gz | cut -f1)"
echo ""

# ===== 第三步：上传到服务器 =====
echo "📤 [3/5] 上传到服务器..."
scp /tmp/memory_pic.tar.gz "${SERVER_USER}@${SERVER_IP}:/tmp/"
echo "✅ 上传完成"
echo ""

# ===== 第四步：在服务器上部署 =====
echo "⚙️  [4/5] 服务器端部署..."
ssh "${SERVER_USER}@${SERVER_IP}" << 'DEPLOY_SCRIPT'
set -e

# 创建项目目录
mkdir -p /root/Memory_Pic
cd /root/Memory_Pic

# 解压（保留 data 和 uploads 目录）
tar -xzf /tmp/memory_pic.tar.gz

# 安装后端依赖
cd server
npm install --production 2>&1 | tail -1

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    npm install -g pm2
fi

# 启动或重启
if pm2 describe memory-pic > /dev/null 2>&1; then
    pm2 restart memory-pic
    echo "✅ 服务已重启"
else
    pm2 start index.js --name memory-pic
    pm2 save
    echo "✅ 服务已启动"
fi

pm2 list

echo ""
echo "部署完成！"
DEPLOY_SCRIPT
echo ""

# ===== 第五步：验证 =====
echo "🔍 [5/5] 验证服务..."
sleep 2
if curl -s --max-time 5 "http://${SERVER_IP}:3001/api/health" | grep -q "ok"; then
    echo "✅ 服务运行正常！"
else
    echo "⚠️  服务可能尚未就绪（可能需要开放安全组端口 3001）"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 部署完成！"
echo ""
echo "📱 访问地址: http://${SERVER_IP}:3001"
echo ""
echo "⚠️  注意事项："
echo "   1. 确保安全组已开放 TCP 3001 端口"
echo "   2. 首次部署需要在服务器上安装 Node.js"
echo "      详见: docs/deploy.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 清理临时文件
rm -f /tmp/memory_pic.tar.gz
