export default async function handler(req, res) {
  try {
    const keyword = req.query.keyword || "software";
    const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '../../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVariables = envContent.split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) acc[key.trim()] = value.trim();
  return acc;
}, {});
const apiKey = envVariables.GROK_API_KEY;
const jobRes = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(keyword)}&limit=20&apiKey=${apiKey}`);
    const jobs = await jobRes.json();
    res.status(200).json({ jobs: jobs.jobs });
  } catch (err) {
    console.error("Remotive API error:", err);
    res.status(500).json({ error: "Remotive API error", details: err.message });
  }
}
