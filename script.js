const searchBtn = document.getElementById("search-btn");
const keywordInput = document.getElementById("keyword");
const jobContainer = document.getElementById("job-container");

searchBtn.addEventListener("click", () => {
  const keyword = keywordInput.value.trim();
  if (!keyword) return;
  fetchJobsAndScore(keyword);
});

let allJobs = [];

// --- Advanced Chatbot State ---
let chatState = {
  step: 0,
  interests: "",
  skills: "",
  values: "",
  jobs: [],
  lastBotMsg: "",
  clarification: false
};

async function fetchJobsAndScore(keyword, trending = false) {
  showJobSkeletons();
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
    populateTypeFilter(allJobs);
    renderFilteredJobs();
    if (!trending) {
      document.getElementById("jobs-section-title").textContent = "Job Results";
    } else {
      document.getElementById("jobs-section-title").textContent = "Trending Jobs";
    }
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

function showJobSkeletons() {
  jobContainer.innerHTML = "";
  for (let i = 0; i < 6; i++) {
    const div = document.createElement("div");
    div.className = "job-card skeleton";
    div.innerHTML = `
      <div class="job-header"><div class="skeleton-box" style="width: 60%; height: 1.5rem;"></div></div>
      <div class="skeleton-box" style="width: 40%; height: 1.1rem; margin-bottom:0.7rem"></div>
      <div class="skeleton-box" style="width: 30%; height: 1.1rem; margin-bottom:0.7rem"></div>
      <div class="skeleton-box" style="width: 50%; height: 1.1rem;"></div>
    `;
    jobContainer.appendChild(div);
  }
}

function populateLocationFilter(jobs) {
  const filter = document.getElementById("location-filter");
  const locations = Array.from(new Set(jobs.map(j => j.candidate_required_location).filter(Boolean)));
  filter.innerHTML = `<option value="">All Locations</option>` + locations.map(loc => `<option value="${loc}">${loc}</option>`).join("");
}

function populateTypeFilter(jobs) {
  let filter = document.getElementById("type-filter");
  if (!filter) {
    filter = document.createElement("select");
    filter.id = "type-filter";
    filter.innerHTML = `<option value="">All Types</option>`;
    document.querySelector(".search-bar").appendChild(filter);
    filter.addEventListener("change", renderFilteredJobs);
  }
  const types = Array.from(new Set(jobs.map(j => j.job_type).filter(Boolean)));
  filter.innerHTML = `<option value="">All Types</option>` + types.map(type => `<option value="${type}">${type}</option>`).join("");
}

document.getElementById("location-filter").addEventListener("change", renderFilteredJobs);

function renderFilteredJobs() {
  const locFilter = document.getElementById("location-filter");
  const typeFilter = document.getElementById("type-filter");
  const selectedLoc = locFilter.value;
  const selectedType = typeFilter ? typeFilter.value : "";
  jobContainer.innerHTML = "";
  let jobsToShow = allJobs;
  if (selectedLoc) {
    jobsToShow = jobsToShow.filter(j => j.candidate_required_location === selectedLoc);
  }
  if (selectedType) {
    jobsToShow = jobsToShow.filter(j => j.job_type === selectedType);
  }
  if (!document.getElementById("keyword").value.trim()) {
    document.getElementById("jobs-section-title").textContent = "Trending Jobs";
  } else {
    document.getElementById("jobs-section-title").textContent = "Job Results";
  }
  if (!jobsToShow.length) {
    jobContainer.innerHTML = "<p>No jobs found for these filters.</p>";
    return;
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
    <p><strong>Type:</strong> ${job.job_type || "N/A"}</p>
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
    if (aiSpan) {
      let score = parseInt(aiAnalysis);
      let badgeColor = "#10b981"; // green
      if (isNaN(score)) {
        aiSpan.textContent = "Not enough data";
        aiSpan.style.background = "#e5e7eb";
        aiSpan.style.color = "#222";
      } else {
        if (score < 40) badgeColor = "#ef4444"; // red
        else if (score < 70) badgeColor = "#f59e42"; // orange
        aiSpan.textContent = `${score}/100`;
        aiSpan.style.background = badgeColor;
        aiSpan.style.color = "#fff";
        aiSpan.style.padding = "0.3rem 1.1rem";
        aiSpan.style.borderRadius = "999px";
        aiSpan.style.fontWeight = "bold";
        aiSpan.style.marginLeft = "0.5rem";
      }
    }
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
      <p><strong>Type:</strong> ${job.job_type || "N/A"}</p>
      <p><strong>Description:</strong> ${job.description || "No description."}</p>
      <p><strong>AI Safety:</strong> ${aiAnalysis}</p>
      <a href="${job.url}" target="_blank" class="job-link">View Job</a>
    </div>
  `;
  modal.style.display = "flex";
  document.getElementById("close-modal").onclick = () => { modal.style.display = "none"; };
  modal.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };
}

// --- Chatbot Floating Button Logic ---
const chatbotDock = document.getElementById("chatbot-dock");
const chatbotSection = document.getElementById("chatbot-section");
let chatbotOpen = false;

function createChatbotButton() {
  let btn = document.getElementById("chatbot-fab");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "chatbot-fab";
    btn.className = "chatbot-fab";
    btn.innerHTML = "🤖";
    document.body.appendChild(btn);
    btn.onclick = () => {
      chatbotOpen = !chatbotOpen;
      chatbotDock.style.display = chatbotOpen ? "block" : "none";
    };
  }
}
createChatbotButton();
if (chatbotDock) {
  chatbotDock.style.display = "none";
}

// --- Advanced Chatbot Logic ---
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
    await handleChatbotConversation(userMsg);
  });
}

function appendChatbotMessage(sender, text) {
  const div = document.createElement("div");
  div.className = "chatbot-msg " + sender;
  div.textContent = text;
  chatbotMessages.appendChild(div);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

async function handleChatbotConversation(userMsg) {
  // Conversation flow: interests -> skills -> values -> recommend jobs
  if (chatState.clarification) {
    // If bot asked for clarification, send to Grok for a follow-up
    appendChatbotMessage("bot", "Thinking...");
    try {
      const res = await fetch('/api/grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: "Career Coach",
          jobDescription: `User said: "${userMsg}". Continue the conversation as a career coach, ask clarifying questions if needed, and recommend jobs if ready. If the user is unsure, suggest examples or ask about their hobbies or favorite school subjects.`,
          mode: "chatbot"
        })
      });
      const data = await res.json();
      chatbotMessages.lastChild.textContent = data.analysis || "Sorry, I couldn't find a match.";
    } catch (err) {
      chatbotMessages.lastChild.textContent = "AI error: " + err.message;
    }
    chatState.clarification = false;
    return;
  }

  if (chatState.step === 0) {
    chatState.interests = userMsg;
    chatState.step = 1;
    appendChatbotMessage("bot", "Great! What are your top 2-3 skills?");
  } else if (chatState.step === 1) {
    chatState.skills = userMsg;
    chatState.step = 2;
    appendChatbotMessage("bot", "What do you value most in a job? (e.g., salary, flexibility, impact, learning)");
  } else if (chatState.step === 2) {
    chatState.values = userMsg;
    chatState.step = 3;
    appendChatbotMessage("bot", "Thanks! Let me find jobs that match your profile...");
    // Fetch jobs from API using interests as keyword
    const jobRes = await fetch(`/api/jobFetcher?keyword=${encodeURIComponent(chatState.interests)}`);
    const data = await jobRes.json();
    chatState.jobs = data.jobs ? data.jobs.slice(0, 10) : [];
    // Ask Grok for recommendations
    const jobTitles = chatState.jobs.map(j => j.title).join(", ");
    const prompt = `User interests: ${chatState.interests}. Skills: ${chatState.skills}. Values: ${chatState.values}. Here are some jobs: ${jobTitles}. Which 3 jobs are the best fit for the user and why? If you need more info, ask the user a clarifying question. If the user is unsure, suggest examples or ask about their hobbies or favorite school subjects. Respond as a friendly career coach.`;
    appendChatbotMessage("bot", "Thinking...");
    try {
      const res = await fetch('/api/grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: "Career Coach",
          jobDescription: prompt,
          mode: "chatbot"
        })
      });
      const data = await res.json();
      chatbotMessages.lastChild.textContent = data.analysis || "Sorry, I couldn't find a match.";
      // If Grok asks a question, set clarification mode
      if (data.analysis && /(\?|clarify|more info|tell me|could you|please specify|elaborate)/i.test(data.analysis)) {
        chatState.clarification = true;
      }
    } catch (err) {
      chatbotMessages.lastChild.textContent = "AI error: " + err.message;
    }
    chatState.step = 4;
  } else {
    appendChatbotMessage("bot", "If you'd like more recommendations, please refresh or start a new chat.");
  }
}

// Show trending jobs on load
window.addEventListener("DOMContentLoaded", () => {
  fetchJobsAndScore("trending", true);
});
