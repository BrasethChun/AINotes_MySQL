import express from 'express';
import { createServer as createViteServer } from 'vite';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';
let pool: mysql.Pool | null = null;

function getDb(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: '118.139.180.163',
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pool;
}

// Ensure uploads dir
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({ dest: 'uploads/' });

function mapDbToNote(row: any) {
  let tags = row.tags;
  let attachments = row.attachments;
  if(typeof tags === 'string') {
    try { tags = JSON.parse(tags); } catch { tags = []; }
  }
  if(typeof attachments === 'string') {
    try { attachments = JSON.parse(attachments); } catch { attachments = []; }
  }

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    thumbnailUrl: row.thumbnail_url,
    tags: tags || [],
    attachments: attachments || []
  };
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());
  
  // Serve uploaded files statically
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', dbConfigured: !!process.env.MYSQL_HOST });
  });

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ error: "No token provided" });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: "Invalid token" });
      req.user = user;
      next();
    });
  };

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, full_name, display_name } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const db = getDb();
      if (!db) {
         return res.status(500).json({ error: 'Database could not be initialized.'});
      }
      
      const id = crypto.randomUUID();
      await db.query(
        'INSERT INTO users (id, email, password, full_name, display_name) VALUES (?, ?, ?, ?, ?)',
        [id, email, hashedPassword, full_name, display_name]
      );
      
      const user = { id, email, name: full_name || display_name };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
      res.json({ user, token });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const db = getDb();
      if (!db) {
         return res.status(500).json({ error: 'Database could not be initialized.'});
      }
      const [rows]: any = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      if (rows.length === 0) return res.status(400).json({ error: 'Invalid email or password' });
      
      const valid = await bcrypt.compare(password, rows[0].password);
      if (!valid) return res.status(400).json({ error: 'Invalid email or password' });
      
      const user = { id: rows[0].id, email: rows[0].email, name: rows[0].full_name || rows[0].display_name };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
      res.json({ user, token });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '396522502341-jsusuml98fi8j4uf27i89ta73k05ofv6.apps.googleusercontent.com';
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';

  app.get('/api/auth/google/url', (req, res) => {
    const redirectUri = req.query.redirectUri as string;
    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." });
    }
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state: redirectUri // pass redirect_uri through state so the callback knows it
    });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    res.json({ url: authUrl });
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    const { code, state } = req.query; // we can pass redirectUri via state!
    const redirectUri = state as string;

    try {
      if (!code) throw new Error("No code provided");

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code: code as string,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        })
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.id_token) throw new Error("Failed to get ID token from Google");

      const payload = JSON.parse(Buffer.from(tokenData.id_token.split('.')[1], 'base64').toString());
      
      const email = payload.email;
      const full_name = payload.name;
      const display_name = payload.given_name;

      const db = getDb();
      let [rows]: any = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      let user;

      if (rows.length === 0) {
        const id = crypto.randomUUID();
        const randomPassword = crypto.randomBytes(16).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        await db.query(
          'INSERT INTO users (id, email, password, full_name, display_name) VALUES (?, ?, ?, ?, ?)',
          [id, email, hashedPassword, full_name, display_name || full_name]
        );
        user = { id, email, name: full_name };
      } else {
        user = { id: rows[0].id, email: rows[0].email, name: rows[0].full_name || rows[0].display_name };
      }

      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${token}', user: ${JSON.stringify(user)} }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (e: any) {
      console.error(e);
      res.status(500).send(`Authentication failed: ${e.message}`);
    }
  });
  
  app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
     res.json({ user: req.user });
  });

  // Notes Routes
  app.get('/api/notes', authenticateToken, async (req: any, res) => {
    try {
      const db = getDb();
      const [rows]: any = await db.query('SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC', [req.user.id]);
      res.json(rows.map(mapDbToNote));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/notes/count', authenticateToken, async (req: any, res: any) => {
     try {
       const db = getDb();
       const [rows]: any = await db.query('SELECT COUNT(*) as count FROM notes WHERE user_id = ?', [req.user.id]);
       res.json({ count: rows[0].count });
     } catch (e: any) {
       res.status(500).json({ error: e.message });
     }
  });

  app.get('/api/notes/:id', authenticateToken, async (req: any, res: any) => {
    try {
      const db = getDb();
      const [rows]: any = await db.query('SELECT * FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
      if(rows.length === 0) return res.status(404).json({ error: 'Note not found' });
      res.json(mapDbToNote(rows[0]));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/notes', authenticateToken, async (req: any, res) => {
    try {
      const db = getDb();
      const { title, content, thumbnailUrl, tags, attachments } = req.body;
      const id = crypto.randomUUID();
      await db.query(
        'INSERT INTO notes (id, user_id, title, content, thumbnail_url, tags, attachments) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, req.user.id, title || '', content || '', thumbnailUrl || null, JSON.stringify(tags || []), JSON.stringify(attachments || [])]
      );
      const [rows]: any = await db.query('SELECT * FROM notes WHERE id = ?', [id]);
      res.json(mapDbToNote(rows[0]));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/notes/:id', authenticateToken, async (req: any, res) => {
    try {
      const db = getDb();
      const { title, content, thumbnailUrl, tags, attachments } = req.body;
      
      // We only update if the note belongs to the user
      const [existing]: any = await db.query('SELECT id FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
      if (existing.length === 0) return res.status(404).json({ error: 'Note not found' });

      await db.query(
        'UPDATE notes SET title=?, content=?, thumbnail_url=?, tags=?, attachments=?, updated_at=NOW() WHERE id=? AND user_id=?',
        [title, content, thumbnailUrl, JSON.stringify(tags||[]), JSON.stringify(attachments||[]), req.params.id, req.user.id]
      );
      
      const [rows]: any = await db.query('SELECT * FROM notes WHERE id = ?', [req.params.id]);
      res.json(mapDbToNote(rows[0]));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/notes/:id', authenticateToken, async (req: any, res) => {
    try {
      const db = getDb();
      await db.query('DELETE FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Storage Route
  app.post('/api/upload', authenticateToken, upload.single('file'), (req: any, res: any) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileOriginalName = req.file.originalname;
    // To preserve extension
    const ext = path.extname(fileOriginalName);
    const newFileName = `${req.file.filename}${ext}`;
    const newPath = path.join(uploadDir, newFileName);
    fs.renameSync(req.file.path, newPath);
    
    // In production you would want bucket paths, here we just host statically
    const url = `/uploads/${newFileName}`;
    res.json({ url, path: url });
  });

  app.delete('/api/upload', authenticateToken, async (req: any, res: any) => {
    try {
      const { path: filePath } = req.body;
      if (filePath && filePath.startsWith('/uploads/')) {
        const fullPath = path.join(process.cwd(), filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite Integration for frontend
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
