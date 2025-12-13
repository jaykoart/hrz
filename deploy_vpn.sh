#!/bin/bash

# Configuration
HOST="23.21.183.81"
USER="ubuntu"
KEY="./hqmx-ec2.pem"
TARGET_ROOT="/home/ubuntu/hrz"

echo "🔐 Setting key permissions..."
chmod 400 $KEY

echo "========================================"
echo "🚀 Deploying HRZ VPN (Port 3003 Fix)..."
echo "========================================"

# 1. NGINX CONFIG
echo "📡 [1/4] Updating Nginx Configuration..."
scp -i $KEY -o StrictHostKeyChecking=no vpn/nginx/hqmx.net.conf $USER@$HOST:/tmp/hqmx.net.conf
ssh -i $KEY $USER@$HOST "sudo mv /tmp/hqmx.net.conf /etc/nginx/sites-available/hqmx.net && sudo nginx -t && sudo systemctl reload nginx"

# 2. BACKEND
echo "⚙️ [2/4] Deploying Backend & Fixing Port..."
# Create directory if not exists
ssh -i $KEY $USER@$HOST "mkdir -p $TARGET_ROOT/services/backend"
# Sync files
rsync -avz -e "ssh -i $KEY" vpn/backend/ $USER@$HOST:$TARGET_ROOT/services/backend/
# AUTOMATICALLY FIX .ENV ON SERVER
echo "🔧 Patching server-side .env to PORT=3003..."
ssh -i $KEY $USER@$HOST "sed -i 's/PORT=3002/PORT=3003/g' $TARGET_ROOT/services/backend/.env"
# Install & Restart
ssh -i $KEY $USER@$HOST "cd $TARGET_ROOT/services/backend && npm install --production && pm2 restart vpn-backend || pm2 start src/server.js --name vpn-backend"

# 3. FRONTEND
echo "🎨 [3/4] Deploying Frontend..."
ssh -i $KEY $USER@$HOST "mkdir -p $TARGET_ROOT/services/main/current"
rsync -avz -e "ssh -i $KEY" vpn/frontend/ $USER@$HOST:$TARGET_ROOT/services/main/current/

echo "========================================"
echo "✅ Deployment Complete!"
echo "========================================"
