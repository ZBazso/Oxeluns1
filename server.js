const express = require('express');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { config } = require('dotenv');
const fs = require('fs');

config(); // Load .env

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: 'uploads/' });

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// Load uploaded files metadata from file
const DATA_FILE = 'uploads.json';
let uploadedFiles = [];

if (fs.existsSync(DATA_FILE)) {
  try {
    uploadedFiles = JSON.parse(fs.readFileSync(DATA_FILE));
  } catch (err) {
    console.error('Failed to load saved uploads:', err.message);
  }
}

function saveUploads() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(uploadedFiles, null, 2));
}

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'auto',
      public_id: req.file.originalname.split('.')[0],
    });

    fs.unlinkSync(req.file.path);

    const fileData = {
      originalName: req.file.originalname,
      cloudinaryUrl: result.secure_url,
      public_id: result.public_id,
    };

    uploadedFiles.push(fileData);
    saveUploads();

    res.send(`
      <h2>File uploaded!</h2>
      <p>Direct link: <a href="${result.secure_url}" target="_blank">${result.secure_url}</a></p>
      <p><a href="${result.secure_url}" download="${req.file.originalname}">⬇️ Download ${req.file.originalname}</a></p>
      ${result.resource_type === 'image' ? `<img src="${result.secure_url}" style="max-width:300px;">` : ''}
      <br><a href="/">Back</a>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send(`
      <h2>Upload failed.</h2>
      <pre>${err.message}</pre>
      <br><a href="/">Back</a>
    `);
  }
});

// Serve uploaded files list page
app.get('/downloads', (req, res) => {
  const list = uploadedFiles.map(f => `
    <li>
      ${f.originalName} - 
      <a href="${f.cloudinaryUrl}" download="${f.originalName}">⬇️ Download</a>
    </li>
  `).join('');

  res.send(`
    <h1>Uploaded Files</h1>
    <ul>${list}</ul>
    <br><a href="/">Back to Home</a>
  `);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
