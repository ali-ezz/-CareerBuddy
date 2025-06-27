/* Minimal Express server to serve API routes */

const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// API routes
app.use("/api/grok", require("./api/grok.js"));
app.use("/api/jobFetcher", require("./api/jobFetcher.js"));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
