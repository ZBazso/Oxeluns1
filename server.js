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

// Multer config for file upload
const upload = multer({ dest: 'uploads/' });

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// File upload route (supports all file types)
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'auto', // handles images, videos, raw (pdf/zip/etc.)
    });

    fs.unlinkSync(req.file.path); // Delete local file after upload

    res.send(`
      <h2>File uploaded!</h2>
      <p>Direct link: <a href="${result.secure_url}" target="_blank">${result.secure_url}</a></p>
      <p><a href="${result.secure_url}" download>⬇️ Click to download</a></p>
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

// Fallback: catch-all for the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
