const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public', 'about.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'public', 'contact.html')));

// API route to receive contact form
app.post('/api/contact', (req, res) => {
    const message = req.body;
    const file = path.join(__dirname, 'messages.json');
    
    const messages = fs.existsSync(file)
        ? JSON.parse(fs.readFileSync(file))
        : [];

    messages.push(message);

    fs.writeFileSync(file, JSON.stringify(messages, null, 2));
    res.json({ status: 'success', message: 'Message received!' });
});

app.listen(PORT, () => {
    console.log(`🌐 Server running at http://localhost:${PORT}`);
});
