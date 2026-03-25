const express = require("express");
const initSqlJs = require("sql.js");
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
app.get("/admin", (_req, res) => res.redirect("/admin/"));

// --- 文件上传配置 ---
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// --- 数据库 ---
const dbPath = process.env.DB_PATH || path.join(__dirname, "naicha.db");
let db;

// 定期持久化到磁盘（sql.js 是内存数据库，需要手动保存）
function saveDb() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

// 自动保存间隔（30 秒）
let saveTimer;
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveDb(); }, 30000);
}

// 写操作后标记需要保存
function runWrite(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  stmt.step();
  stmt.free();
  scheduleSave();
}

function runWriteGetId(sql, params = []) {
  runWrite(sql, params);
  const r = db.exec("SELECT last_insert_rowid() as id");
  return r[0]?.values[0]?.[0];
}

function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    row = {};
    cols.forEach((c, i) => { row[c] = vals[i]; });
  }
  stmt.free();
  return row;
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const cols = stmt.getColumnNames();
  const rows = [];
  while (stmt.step()) {
    const vals = stmt.get();
    const row = {};
    cols.forEach((c, i) => { row[c] = vals[i]; });
    rows.push(row);
  }
  stmt.free();
  return rows;
}

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

    const existing = queryOne("SELECT id FROM submissions WHERE phone = ?", [phone]);
    if (existing) {
      return res.status(409).json({ error: "该手机号已提交过" });
    }

    const orderPhoto = req.files?.orderPhoto?.[0]?.filename || null;
    const selfiePhoto = req.files?.selfiePhoto?.[0]?.filename || null;

    const id = runWriteGetId(
      `INSERT INTO submissions (name, phone, province, city, dealer, order_photo, selfie_photo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, phone, province, city, dealer, orderPhoto, selfiePhoto],
    );

    res.json({ success: true, id });
  },
);

app.get("/api/query", (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: "请输入手机号" });

  const submission = queryOne("SELECT id, status FROM submissions WHERE phone = ?", [phone]);

  if (!submission) {
    return res.json({ found: false, message: "未找到提交记录" });
  }
  if (submission.status === "pending") {
    return res.json({ found: true, status: "reviewing" });
  }
  if (submission.status === "rejected") {
    return res.json({ found: true, status: "thanks" });
  }

  const winner = queryOne("SELECT prize_code FROM winners WHERE submission_id = ?", [submission.id]);
  if (winner) {
    return res.json({ found: true, status: "won", code: winner.prize_code });
  }
  return res.json({ found: true, status: "thanks" });
});

// ==========================================
// 管理后台 API
// ==========================================

const ADMIN_KEY = process.env.ADMIN_KEY || "naicha2026";
function adminAuth(req, res, next) {
  const key = req.headers["x-admin-key"] || req.query.key;
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: "未授权" });
  }
  next();
}

app.get("/api/admin/submissions", adminAuth, (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = "";
  const params = [];
  if (status && status !== "all") {
    where = "WHERE status = ?";
    params.push(status);
  }

  const totalRow = queryOne(`SELECT COUNT(*) as count FROM submissions ${where}`, params);
  const total = totalRow?.count || 0;

  const list = queryAll(
    `SELECT * FROM submissions ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)],
  );

  res.json({ total, page: Number(page), limit: Number(limit), list });
});

app.patch("/api/admin/submissions/:id", adminAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "status 必须为 approved 或 rejected" });
  }

  runWrite("UPDATE submissions SET status = ? WHERE id = ?", [status, Number(id)]);
  const row = queryOne("SELECT changes() as c");
  if (row?.c === 0) {
    return res.status(404).json({ error: "未找到该记录" });
  }
  res.json({ success: true });
});

app.post("/api/admin/batch-review", adminAuth, (req, res) => {
  const { ids, status } = req.body;
  if (!ids?.length || !["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "参数错误" });
  }
  for (const id of ids) {
    runWrite("UPDATE submissions SET status = ? WHERE id = ?", [status, Number(id)]);
  }
  res.json({ success: true, updated: ids.length });
});

app.post("/api/admin/lottery", adminAuth, (req, res) => {
  const { count = 5000 } = req.body;

  const approved = queryAll(
    `SELECT s.id FROM submissions s
     LEFT JOIN winners w ON w.submission_id = s.id
     WHERE s.status = 'approved' AND w.id IS NULL`,
  );

  if (approved.length === 0) {
    return res.json({ success: false, message: "没有可抽奖的已通过记录" });
  }

  const pool = approved.map((r) => r.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const selected = pool.slice(0, Math.min(count, pool.length));

  for (const id of selected) {
    runWrite("INSERT INTO winners (submission_id, prize_code) VALUES (?, ?)", [id, generateCode()]);
  }

  res.json({
    success: true,
    message: `已从 ${approved.length} 条通过记录中抽取 ${selected.length} 名中奖者`,
    drawn: selected.length,
  });
});

app.get("/api/admin/winners", adminAuth, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const totalRow = queryOne("SELECT COUNT(*) as count FROM winners");
  const total = totalRow?.count || 0;

  const list = queryAll(
    `SELECT w.id, w.prize_code, w.created_at as won_at,
            s.name, s.phone, s.province, s.city, s.dealer
     FROM winners w
     JOIN submissions s ON s.id = w.submission_id
     ORDER BY w.created_at DESC
     LIMIT ? OFFSET ?`,
    [Number(limit), Number(offset)],
  );

  res.json({ total, page: Number(page), limit: Number(limit), list });
});

app.get("/api/admin/stats", adminAuth, (req, res) => {
  const stats = queryOne(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
     FROM submissions`,
  );

  const winnersRow = queryOne("SELECT COUNT(*) as count FROM winners");
  res.json({ ...stats, winners: winnersRow?.count || 0 });
});

// --- 生产模式：serve 前端静态文件 ---
const distPath = path.join(__dirname, "..", "dist");
if (fs.existsSync(distPath)) {
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
function shutdown() {
  saveDb();
  if (db) db.close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// --- 启动 ---
async function main() {
  const SQL = await initSqlJs();

  // 加载已有数据库或创建新的
  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run(`
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
  `);

  // 确保索引存在
  try { db.run("CREATE INDEX IF NOT EXISTS idx_submissions_phone ON submissions(phone)"); } catch {}
  try { db.run("CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status)"); } catch {}

  // 初始保存
  saveDb();

  app.listen(PORT, HOST, () => {
    console.log(`服务运行在 http://${HOST}:${PORT}`);
    console.log(`管理后台: http://${HOST}:${PORT}/admin/`);
  });
}

main().catch((err) => {
  console.error("启动失败:", err);
  process.exit(1);
});
