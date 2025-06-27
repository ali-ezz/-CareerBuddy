// Load careers.js before this script in index.html

function getUniqueInterests(careers) {
  const set = new Set();
  Object.values(careers).forEach(c => set.add(c.interest));
  return Array.from(set);
}

function getCareersByInterest(interest) {
  return Object.entries(careers)
    .filter(([_, c]) => c.interest === interest)
    .slice(0, 5);
}

function aiScoreColor(score) {
  if (score <= 0.15) return "#10b981"; // green (safe)
  if (score <= 0.3) return "#f59e42";  // orange (medium)
  return "#ef4444";                    // red (risk)
}

function renderInterests() {
  const select = document.getElementById("interest-select");
  select.innerHTML = "";
  getUniqueInterests(careers).forEach(interest => {
    const opt = document.createElement("option");
    opt.value = interest;
    opt.textContent = interest;
    select.appendChild(opt);
  });
}

function renderCareers() {
  const select = document.getElementById("interest-select");
  const section = document.getElementById("careers-section");
  const interest = select.value;
  const careersList = getCareersByInterest(interest);

  if (!careersList.length) {
    section.innerHTML = "<p>No careers found for this interest.</p>";
    return;
  }

  section.innerHTML = careersList.map(([title, c]) => `
    <div class="career-card">
      <div class="career-title">${title}</div>
      <div class="career-desc">${c.desc || ""}</div>
      <div>
        <strong>AI Score:</strong>
        <span class="ai-score-badge" style="background:${aiScoreColor(c.aiScore)}">
          ${Math.round((1 - c.aiScore) * 100)}% Safe
        </span>
      </div>
      <div>
        <strong>Skills:</strong>
        <div class="skills-list">
          ${c.skills.map(skill => `<span class="skill">${skill}</span>`).join("")}
        </div>
      </div>
    </div>
  `).join("");
}

window.addEventListener("DOMContentLoaded", () => {
  renderInterests();
  renderCareers();
  document.getElementById("interest-select").addEventListener("change", renderCareers);
});
