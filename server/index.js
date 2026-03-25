const express = require("express");
const Database = require("better-sqlite3");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0";

// --- 中间件 ---
app.set("trust proxy", 1);
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads"), { maxAge: "7d" }));
app.use("/admin", express.static(path.join(__dirname, "admin")));
// /admin 不带尾部斜杠时重定向
app.get("/admin", (_req, res) => res.redirect("/admin/"));

// --- 文件上传配置 ---
const storage = multer.diskStorage({
  destination: path.join(__dirname, "uploads"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// --- 数据库初始化 ---
const db = new Database(path.join(__dirname, "naicha.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    province TEXT NOT NULL,
    city TEXT NOT NULL,
    dealer TEXT NOT NULL,
    order_photo TEXT,
    selfie_photo TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS winners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL UNIQUE,
    prize_code TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (submission_id) REFERENCES submissions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_submissions_phone ON submissions(phone);
  CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
`);

// --- 生成兑换码 ---
function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const parts = [];
  for (let p = 0; p < 4; p++) {
    let s = "";
    for (let i = 0; i < 4; i++) {
      s += chars[Math.floor(Math.random() * chars.length)];
    }
    parts.push(s);
  }
  return parts.join("-");
}

// ==========================================
// 前端 API
// ==========================================

// 用户提交打卡
app.post(
  "/api/submit",
  upload.fields([
    { name: "orderPhoto", maxCount: 1 },
    { name: "selfiePhoto", maxCount: 1 },
  ]),
  (req, res) => {
    const { name, phone, province, city, dealer } = req.body;
    if (!name || !phone || !province || !city || !dealer) {
      return res.status(400).json({ error: "请填写完整信息" });
    }

    // 检查是否已提交
    const existing = db
      .prepare("SELECT id FROM submissions WHERE phone = ?")
      .get(phone);
    if (existing) {
      return res.status(409).json({ error: "该手机号已提交过" });
    }

    const orderPhoto = req.files?.orderPhoto?.[0]?.filename || null;
    const selfiePhoto = req.files?.selfiePhoto?.[0]?.filename || null;

    const result = db
      .prepare(
        `INSERT INTO submissions (name, phone, province, city, dealer, order_photo, selfie_photo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(name, phone, province, city, dealer, orderPhoto, selfiePhoto);

    res.json({ success: true, id: result.lastInsertRowid });
  },
);

// 用户查询中奖信息
app.get("/api/query", (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: "请输入手机号" });

  const submission = db
    .prepare("SELECT id, status FROM submissions WHERE phone = ?")
    .get(phone);

  if (!submission) {
    return res.json({ found: false, message: "未找到提交记录" });
  }

  if (submission.status === "pending") {
    return res.json({ found: true, status: "reviewing" });
  }

  if (submission.status === "rejected") {
    return res.json({ found: true, status: "thanks" });
  }

  // approved — 检查是否中奖
  const winner = db
    .prepare("SELECT prize_code FROM winners WHERE submission_id = ?")
    .get(submission.id);

  if (winner) {
    return res.json({
      found: true,
      status: "won",
      code: winner.prize_code,
    });
  }

  // 已通过但未中奖
  return res.json({ found: true, status: "thanks" });
});

// ==========================================
// 管理后台 API
// ==========================================

// 简单认证中间件（生产环境请用更安全的方案）
const ADMIN_KEY = process.env.ADMIN_KEY || "naicha2026";
function adminAuth(req, res, next) {
  const key = req.headers["x-admin-key"] || req.query.key;
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: "未授权" });
  }
  next();
}

// 获取提交列表
app.get("/api/admin/submissions", adminAuth, (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = "";
  const params = [];
  if (status && status !== "all") {
    where = "WHERE status = ?";
    params.push(status);
  }

  const total = db
    .prepare(`SELECT COUNT(*) as count FROM submissions ${where}`)
    .get(...params).count;

  const list = db
    .prepare(
      `SELECT * FROM submissions ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, Number(limit), Number(offset));

  res.json({ total, page: Number(page), limit: Number(limit), list });
});

// 审核（通过/拒绝）
app.patch("/api/admin/submissions/:id", adminAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "status 必须为 approved 或 rejected" });
  }

  const result = db
    .prepare("UPDATE submissions SET status = ? WHERE id = ?")
    .run(status, id);

  if (result.changes === 0) {
    return res.status(404).json({ error: "未找到该记录" });
  }

  res.json({ success: true });
});

// 批量审核
app.post("/api/admin/batch-review", adminAuth, (req, res) => {
  const { ids, status } = req.body;
  if (!ids?.length || !["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "参数错误" });
  }

  const stmt = db.prepare("UPDATE submissions SET status = ? WHERE id = ?");
  const batch = db.transaction((ids) => {
    for (const id of ids) stmt.run(status, id);
  });
  batch(ids);

  res.json({ success: true, updated: ids.length });
});

// 抽奖：从已通过的名单中随机选取 N 个中奖者
app.post("/api/admin/lottery", adminAuth, (req, res) => {
  const { count = 5000 } = req.body;

  // 已有中奖者不重复抽
  const approved = db
    .prepare(
      `SELECT s.id FROM submissions s
       LEFT JOIN winners w ON w.submission_id = s.id
       WHERE s.status = 'approved' AND w.id IS NULL`,
    )
    .all();

  if (approved.length === 0) {
    return res.json({ success: false, message: "没有可抽奖的已通过记录" });
  }

  // Fisher-Yates 洗牌，取前 count 个
  const pool = approved.map((r) => r.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const selected = pool.slice(0, Math.min(count, pool.length));

  // 写入中奖表
  const stmt = db.prepare(
    "INSERT INTO winners (submission_id, prize_code) VALUES (?, ?)",
  );
  const batch = db.transaction((ids) => {
    for (const id of ids) {
      stmt.run(id, generateCode());
    }
  });
  batch(selected);

  res.json({
    success: true,
    message: `已从 ${approved.length} 条通过记录中抽取 ${selected.length} 名中奖者`,
    drawn: selected.length,
  });
});

// 查看中奖名单
app.get("/api/admin/winners", adminAuth, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const total = db
    .prepare("SELECT COUNT(*) as count FROM winners")
    .get().count;

  const list = db
    .prepare(
      `SELECT w.id, w.prize_code, w.created_at as won_at,
              s.name, s.phone, s.province, s.city, s.dealer
       FROM winners w
       JOIN submissions s ON s.id = w.submission_id
       ORDER BY w.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(Number(limit), Number(offset));

  res.json({ total, page: Number(page), limit: Number(limit), list });
});

// 统计
app.get("/api/admin/stats", adminAuth, (req, res) => {
  const stats = db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
       FROM submissions`,
    )
    .get();

  const winners = db
    .prepare("SELECT COUNT(*) as count FROM winners")
    .get().count;

  res.json({ ...stats, winners });
});

// --- 生产模式：serve 前端静态文件 ---
const distPath = path.join(__dirname, "..", "dist");
if (require("fs").existsSync(distPath)) {
  app.use(express.static(distPath, { maxAge: "30d", immutable: true }));
  app.get("/{*path}", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/admin") || req.path.startsWith("/uploads")) {
      return next();
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// --- 全局错误处理 ---
app.use((err, _req, res, _next) => {
  console.error(err.stack || err);
  res.status(500).json({ error: "服务器内部错误" });
});

// --- 优雅关闭 ---
process.on("SIGTERM", () => { db.close(); process.exit(0); });
process.on("SIGINT", () => { db.close(); process.exit(0); });

// --- 启动 ---
app.listen(PORT, HOST, () => {
  console.log(`服务运行在 http://${HOST}:${PORT}`);
  console.log(`管理后台: http://${HOST}:${PORT}/admin/`);
});
