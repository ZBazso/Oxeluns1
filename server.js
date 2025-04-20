const express = require('express');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// --- Create an Express app ---
const app = express();

// --- Define paths ---
const uploadsDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');
const sessionsDir = path.join(dataDir, 'sessions');
const usersFile = path.join(dataDir, 'users.json');

// ✅ LÉTREHOZÁSOK ELŐRE, MIELŐTT bármi session történik!
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

// ✅ Ensure session folder exists before setting up session store
fs.mkdirSync(sessionsDir, { recursive: true });

// Supabase setup
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- Middleware ---
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'oxeluns_secret_key',
  resave: false,
  saveUninitialized: false,
}));

// --- Multer config ---
const storage = multer.memoryStorage();  // Store files in memory before uploading
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
  res.send('<h2>File upload via Supabase only</h2>');
});

app.get('/downloads', requireAuth, async (req, res) => {
  const { data, error } = await supabase.storage.from(process.env.SUPABASE_BUCKET).list('');
  if (error) return res.status(500).send(error.message);
  const list = data.map(file => `<li><a href="https://your-supabase-url.supabase.co/storage/v1/object/public/${process.env.SUPABASE_BUCKET}/${file.name}">${file.name}</a></li>`).join('');
  res.send(`
    <html>
      <head><link rel="stylesheet" href="/style.css"><title>Downloads</title></head>
      <body><h2>Available Files</h2><ul>${list}</ul><a href="/">Back</a></body>
    </html>
  `);
});

app.get('/upload', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/upload.html'));
});

app.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.send('<h2>No file uploaded</h2>');

const { data, error } = await supabase.storage
  .from('uploads1')
  .upload(`public/${req.file.originalname}`, req.file.buffer, {
    cacheControl: '3600',
    upsert: false,
  });

console.log(data, error); // Log both data and error
if (error) {
  return res.status(500).send('Error uploading file');
}

  // Return the response
  res.send(`
    <html>
      <head><link rel="stylesheet" href="/style.css"><title>Upload Complete</title></head>
      <body>
        <h2>Upload Complete</h2>
        <p>File: <a href="https://your-supabase-url.supabase.co/storage/v1/object/public/${process.env.SUPABASE_BUCKET}/${data.path}">${data.name}</a></p>
        <a href="/">Back</a>
      </body>
    </html>
  `);
});

// Fallback route
app.get('*', (req, res) => res.redirect('/'));

// Define the PORT for the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
