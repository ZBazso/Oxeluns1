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

// Store uploaded files metadata
const uploadedFiles = [];

// File upload route (supports all file types)
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'auto', // handles images, videos, raw (pdf/zip/etc.)
      public_id: req.file.originalname.split('.')[0], // Set original name (without extension) as the public_id
    });

    fs.unlinkSync(req.file.path); // Delete local file after upload

    // Save metadata for later access
    uploadedFiles.push({
      originalName: req.file.originalname,
      cloudinaryUrl: result.secure_url,
      public_id: result.public_id,
    });

    res.send(`
      <h2>File uploaded!</h2>
      <p>Direct link: <a href="${result.secure_url}" target="_blank">${result.secure_url}</a></p>
      <p><a href="${result.secure_url}" download="${req.file.originalname}">⬇️ Click to download</a></p>
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

// Downloads route: Show uploaded files
app.get('/downloads', (req, res) => {
  let fileListHtml = uploadedFiles
    .map(
      (file) => `
        <div>
          <a href="${file.cloudinaryUrl}" download="${file.originalName}">${file.originalName}</a>
          <p><a href="${file.cloudinaryUrl}" target="_blank">View File</a></p>
        </div>
      `
    )
    .join('');

  res.send(`
    <h2>Uploaded Files</h2>
    <div>${fileListHtml}</div>
    <br><a href="/">Back</a>
  `);
});

// Fallback: catch-all for the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
