const searchBtn = document.getElementById("search-btn");
const keywordInput = document.getElementById("keyword");
const jobContainer = document.getElementById("job-container");

searchBtn.addEventListener("click", () => {
  const keyword = keywordInput.value.trim();
  if (!keyword) return;
  fetchJobsAndScore(keyword);
});

let allJobs = [];

async function fetchJobsAndScore(keyword) {
  jobContainer.innerHTML = "<p>Loading jobs...</p>";
  try {
    const jobRes = await fetch(`/api/jobFetcher?keyword=${encodeURIComponent(keyword)}`);
    const data = await jobRes.json();
    if (!data.jobs || !Array.isArray(data.jobs)) {
      jobContainer.innerHTML = `<p style='color:red'>Job API error.<br>Raw response: <pre>${JSON.stringify(data, null, 2)}</pre></p>`;
      return;
    }
    allJobs = data.jobs;
    if (!allJobs.length) {
      jobContainer.innerHTML = "<p>No jobs found for this keyword.</p>";
      return;
    }
    populateLocationFilter(allJobs);
    renderFilteredJobs();
    // Fetch AI scores in parallel
    await Promise.all(allJobs.map(async (job) => {
      try {
        const grokRes = await fetch('/api/grok', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobTitle: job.title,
            jobDescription: job.description
          })
        });
        const grokData = await grokRes.json();
        if (grokData.analysis) {
          updateJobAI(job, grokData.analysis);
        } else if (grokData.error) {
          updateJobAI(job, `AI error: ${grokData.error} (${grokData.details || ""})`);
        } else {
          updateJobAI(job, `AI error: ${JSON.stringify(grokData)}`);
        }
      } catch (err) {
        updateJobAI(job, "AI error: " + err.message);
      }
    }));
  } catch (err) {
    jobContainer.innerHTML = `<p style='color:red'>Error fetching jobs or AI scores.<br>${err.message}</p>`;
    console.error("Job fetch error:", err);
  }
}

function populateLocationFilter(jobs) {
  const filter = document.getElementById("location-filter");
  const locations = Array.from(new Set(jobs.map(j => j.candidate_required_location).filter(Boolean)));
  filter.innerHTML = `<option value="">All Locations</option>` + locations.map(loc => `<option value="${loc}">${loc}</option>`).join("");
}

document.getElementById("location-filter").addEventListener("change", renderFilteredJobs);

function renderFilteredJobs() {
  const filter = document.getElementById("location-filter");
  const selected = filter.value;
  jobContainer.innerHTML = "";
  let jobsToShow = allJobs;
  if (selected) {
    jobsToShow = allJobs.filter(j => j.candidate_required_location === selected);
  }
  for (const job of jobsToShow) {
    renderJob(job, "Loading AI safety...");
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

// Chatbot UI logic
const chatbotForm = document.getElementById("chatbot-form");
const chatbotInput = document.getElementById("chatbot-input");
const chatbotMessages = document.getElementById("chatbot-messages");

if (chatbotForm && chatbotInput && chatbotMessages) {
  chatbotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userMsg = chatbotInput.value.trim();
    if (!userMsg) return;
    appendChatbotMessage("user", userMsg);
    chatbotInput.value = "";
    appendChatbotMessage("bot", "Thinking...");
    // Placeholder: integrate Grok API here for real advice
    setTimeout(() => {
      chatbotMessages.lastChild.textContent = "Sorry, the chatbot is not yet connected to AI.";
    }, 800);
  });
}

function appendChatbotMessage(sender, text) {
  const div = document.createElement("div");
  div.className = "chatbot-msg " + sender;
  div.textContent = text;
  chatbotMessages.appendChild(div);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}
