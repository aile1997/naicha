FROM node:18-alpine

# better-sqlite3 需要编译原生模块
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 复制后端依赖并安装
COPY server/package.json ./server/
RUN cd server && npm install --production && \
    apk del python3 make g++ && \
    rm -rf /root/.npm /tmp/*

# 复制后端代码和管理后台
COPY server/index.js ./server/
COPY server/admin/ ./server/admin/

# 复制前端构建产物
COPY dist/ ./dist/

# 创建上传目录和数据目录
RUN mkdir -p server/uploads server/data

# 环境变量
ENV PORT=3001
ENV HOST=0.0.0.0
ENV NODE_ENV=production

EXPOSE 3001

# 数据持久化挂载点
VOLUME ["/app/server/uploads", "/app/server/data"]

WORKDIR /app/server
CMD ["node", "index.js"]
