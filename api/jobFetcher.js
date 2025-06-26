export default async function handler(req, res) {
  const keyword = req.query.keyword || "software";
  const jobRes = await fetch(`https://remotive.io/api/remote-jobs?search=${encodeURIComponent(keyword)}`);
  const jobs = await jobRes.json();
  res.status(200).json({ jobs: jobs.jobs.slice(0, 10) });
}
