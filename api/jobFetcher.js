export default async function handler(req, res) {
  try {
    const keyword = req.query.keyword || "software";
    const apiKey = process.env.GROK_API_KEY;
const jobRes = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(keyword)}&limit=20&apiKey=${apiKey}`);
    const jobs = await jobRes.json();
    res.status(200).json({ jobs: jobs.jobs });
  } catch (err) {
    console.error("Remotive API error:", err);
    res.status(500).json({ error: "Remotive API error", details: err.message });
  }
}
