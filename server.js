const express = require('express');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// --- Define paths ---
const uploadsDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');
const sessionsDir = path.join(dataDir, 'sessions');
const usersFile = path.join(dataDir, 'users.json');

// ✅ LÉTREHOZÁSOK ELŐRE, MIELŐTT bármi session történik!
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(sessionsDir, { recursive: true });

// ✅ MOST jöhet a session store, mivel már létezik a mappa!
const FileStore = require('session-file-store')(session);

// --- Middleware ---
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  store: new FileStore({ path: sessionsDir }),
  secret: 'oxeluns_secret_key',
  resave: false,
  saveUninitialized: false,
}));

// --- Multer config ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// --- Utility functions ---
const loadUsers = () => {
  if (!fs.existsSync(usersFile)) return {};
  return JSON.parse(fs.readFileSync(usersFile));
};
const saveUsers = (users) => fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

// --- Auth middleware ---
const requireAuth = (req, res, next) => {
  if (!req.session.user) return res.redirect('/login');
  next();
};

// --- Routes ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public/about.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'public/contact.html')));

app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users[username];
  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.user = username;
    res.redirect('/downloads');
  } else {
    res.send('<h2>Login failed</h2><a href="/login">Try again</a>');
  }
});

app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'public/signup.html')));
app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  if (users[username]) return res.send('<h2>User exists</h2><a href="/signup">Try again</a>');
  users[username] = { password: bcrypt.hashSync(password, 10) };
  saveUsers(users);
  res.redirect('/login');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.get('/uploads/:filename', requireAuth, (req, res) => {
  const file = path.join(uploadsDir, req.params.filename);
  if (fs.existsSync(file)) res.download(file, req.params.filename);
  else res.status(404).send('File not found');
});

app.get('/downloads', requireAuth, (req, res) => {
  const files = fs.readdirSync(uploadsDir);
  const list = files.map(f => `<li><a href="/uploads/${encodeURIComponent(f)}">${f}</a></li>`).join('');
  res.send(`
    <html>
    <head>
      <link rel="stylesheet" href="/style.css">
      <title>Downloads</title>
    </head>
    <body>
      <div class="container">
        <h2>Available Files</h2>
        <ul>${list}</ul>
        <a href="/">Back</a>
      </div>
    </body>
    </html>
  `);
});

app.get('/upload', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/upload.html'));
});

app.post('/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.send('<h2>No file uploaded</h2>');
  res.send(`
    <html>
    <head>
      <link rel="stylesheet" href="/style.css">
      <title>Upload Complete</title>
    </head>
    <body>
      <div class="container">
        <h2>Upload complete</h2>
        <p>File: <a href="/uploads/${encodeURIComponent(req.file.originalname)}">${req.file.originalname}</a></p>
        <a href="/">Back</a>
      </div>
    </body>
    </html>
  `);
});

// Fallback route
app.get('*', (req, res) => res.redirect('/'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
