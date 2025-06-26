const searchBtn = document.getElementById("search-btn");
const keywordInput = document.getElementById("keyword");
const jobContainer = document.getElementById("job-container");

searchBtn.addEventListener("click", () => {
  const keyword = keywordInput.value.trim();
  if (!keyword) return;
  fetchJobsAndScore(keyword);
});

async function fetchJobsAndScore(keyword) {
  jobContainer.innerHTML = "<p>Loading jobs...</p>";
  try {
    const jobRes = await fetch(`/api/jobFetcher?keyword=${encodeURIComponent(keyword)}`);
    const { jobs } = await jobRes.json();
    if (!jobs.length) {
      jobContainer.innerHTML = "<p>No jobs found for this keyword.</p>";
      return;
    }
    jobContainer.innerHTML = "";
    for (const job of jobs) {
      renderJob(job, "Loading AI safety...");
      const grokRes = await fetch('/api/grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: job.title,
          jobDescription: job.description
        })
      });
      const { analysis } = await grokRes.json();
      updateJobAI(job.id, analysis);
    }
  } catch (err) {
    jobContainer.innerHTML = "<p style='color:red'>Error fetching jobs or AI scores.</p>";
  }
}

function renderJob(job, aiAnalysis) {
  const div = document.createElement("div");
  div.className = "job-card";
  div.id = `job-${job.id}`;
  div.innerHTML = `
    <h3>${job.title}</h3>
    <p><strong>Company:</strong> ${job.company_name}</p>
    <p><strong>Location:</strong> ${job.candidate_required_location}</p>
    <p><strong>AI Safety:</strong> <span class="ai-analysis">${aiAnalysis}</span></p>
    <a href="${job.url}" target="_blank" class="job-link">View Job</a>
  `;
  jobContainer.appendChild(div);
}

function updateJobAI(jobId, aiAnalysis) {
  const card = document.getElementById(`job-${jobId}`);
  if (card) {
    const aiSpan = card.querySelector(".ai-analysis");
    if (aiSpan) aiSpan.textContent = aiAnalysis;
  }
}
