export default async function handler(req, res) {
  try {
    const keyword = req.query.keyword || "software";
    const jobRes = await fetch(`https://remotive.io/api/remote-jobs?search=${encodeURIComponent(keyword)}`);
    const jobs = await jobRes.json();
    res.status(200).json({ jobs: jobs.jobs.slice(0, 10) });
  } catch (err) {
    console.error("Remotive API error:", err);
    res.status(500).json({ error: "Remotive API error", details: err.message });
  }
}
