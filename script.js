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
    const data = await jobRes.json();
    if (!data.jobs || !Array.isArray(data.jobs)) {
      jobContainer.innerHTML = `<p style='color:red'>Job API error.<br>Raw response: <pre>${JSON.stringify(data, null, 2)}</pre></p>`;
      return;
    }
    const jobs = data.jobs;
    if (!jobs.length) {
      jobContainer.innerHTML = "<p>No jobs found for this keyword.</p>";
      return;
    }
    jobContainer.innerHTML = "";
    for (const job of jobs) {
      renderJob(job, "Loading AI safety...");
    }
    // Fetch AI scores in parallel
    await Promise.all(jobs.map(async (job) => {
      try {
        const grokRes = await fetch('/api/grok', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobTitle: job.title,
            jobDescription: job.description
          })
        });
        const { analysis } = await grokRes.json();
        updateJobAI(job, analysis);
      } catch (err) {
        updateJobAI(job, "AI error");
      }
    }));
  } catch (err) {
    jobContainer.innerHTML = `<p style='color:red'>Error fetching jobs or AI scores.<br>${err.message}</p>`;
    console.error("Job fetch error:", err);
  }
}

function jobKey(job) {
  // Use job.url as unique key (always present)
  return btoa(unescape(encodeURIComponent(job.url))).replace(/=+$/, "");
}

function renderJob(job, aiAnalysis) {
  const key = jobKey(job);
  const div = document.createElement("div");
  div.className = "job-card";
  div.id = `job-${key}`;
  div.innerHTML = `
    <div class="job-header">
      <h3>${job.title}</h3>
      <button class="more-info-btn" data-jobkey="${key}">More Info</button>
    </div>
    <p><strong>Company:</strong> ${job.company_name}</p>
    <p><strong>Location:</strong> ${job.candidate_required_location}</p>
    <p><strong>AI Safety:</strong> <span class="ai-analysis">${aiAnalysis}</span></p>
    <a href="${job.url}" target="_blank" class="job-link">View Job</a>
  `;
  jobContainer.appendChild(div);
  addMoreInfoHandler(job, aiAnalysis);
}

function updateJobAI(job, aiAnalysis) {
  const key = jobKey(job);
  const card = document.getElementById(`job-${key}`);
  if (card) {
    const aiSpan = card.querySelector(".ai-analysis");
    if (aiSpan) aiSpan.textContent = aiAnalysis;
  }
}

function addMoreInfoHandler(job, aiAnalysis) {
  const key = jobKey(job);
  const btn = document.querySelector(`#job-${key} .more-info-btn`);
  if (btn) {
    btn.onclick = () => showModal(job, aiAnalysis);
  }
}

// Modal logic
function showModal(job, aiAnalysis) {
  let modal = document.getElementById("job-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "job-modal";
    modal.className = "modal";
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-btn" id="close-modal">&times;</span>
      <h2>${job.title}</h2>
      <p><strong>Company:</strong> ${job.company_name}</p>
      <p><strong>Location:</strong> ${job.candidate_required_location}</p>
      <p><strong>Description:</strong> ${job.description || "No description."}</p>
      <p><strong>AI Safety:</strong> ${aiAnalysis}</p>
      <a href="${job.url}" target="_blank" class="job-link">View Job</a>
    </div>
  `;
  modal.style.display = "flex";
  document.getElementById("close-modal").onclick = () => { modal.style.display = "none"; };
  modal.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };
}
