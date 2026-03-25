# 奶茶抽奖活动 — 部署文档

## 目录结构

```
naicha-deploy/
  dist/                    # 前端静态文件（Vite 构建产物）
    index.html             # H5 活动页入口
    assets/                # JS/CSS/图片（文件名含 hash）
  server/
    index.js               # 后端服务（Express + SQLite）
    package.json           # 后端依赖声明
    admin/
      index.html           # 管理后台页面
    uploads/               # 用户上传图片存储（自动创建）
    naicha.db              # SQLite 数据库（首次启动自动创建）
```

## 环境要求

- Node.js 18+

## 部署步骤

### 1. 上传解压

```bash
# 上传 naicha-deploy.tar.gz 到服务器后
mkdir naicha && cd naicha
tar -xzf naicha-deploy.tar.gz
```

### 2. 安装依赖

```bash
cd server
npm install --production
```

### 3. 启动服务

```bash
# 方式 A：直接启动
node index.js

# 方式 B：后台常驻（推荐）
npm install -g pm2
pm2 start index.js --name naicha
pm2 save
pm2 startup    # 开机自启

# 方式 C：简单后台运行
nohup node index.js > server.log 2>&1 &
```

### 4. 访问地址

| 地址 | 说明 | 使用者 |
|------|------|--------|
| `http://IP:3001` | H5 活动页 | 用户（微信内打开） |
| `http://IP:3001/admin/` | 管理后台 | 运营人员 |

管理后台默认密钥：`naicha2026`

## 环境变量（可选）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3001` | 监听端口 |
| `HOST` | `0.0.0.0` | 监听地址 |
| `ADMIN_KEY` | `naicha2026` | 管理后台密钥 |
| `CORS_ORIGIN` | `true`（允许所有） | 跨域来源限制 |

示例：
```bash
PORT=80 ADMIN_KEY=mySecret123 node index.js
```

## 如果使用 nginx 反代

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 20m;
    }
}
```

## 活动时间配置

当前硬编码在前端：**2026年3月28日 ~ 4月6日，每日 9:00-18:00（北京时间）**

- 活动时间外，用户可正常浏览页面和查询中奖结果
- 用户点击"提交打卡"时弹出打烊提示
- 如需修改时间，编辑 `dist/assets/index-*.js` 中搜索 `20260328` 和 `20260406`，或重新构建前端

## 管理后台操作流程

1. 打开 `http://IP:3001/admin/`，输入管理密钥登录
2. **提交审核**：查看用户提交，逐条或批量通过/拒绝
3. **抽奖**：切换到"抽奖"标签，输入抽取人数（默认 5000），点击"开始抽奖"
4. **中奖名单**：切换到"中奖名单"标签查看所有中奖者及兑换码

## 数据备份

SQLite 数据库文件在 `server/naicha.db`，定期备份即可：

```bash
cp server/naicha.db server/naicha.db.bak
```
