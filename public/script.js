// Advanced Career Platform - Main JavaScript
class CareerPlatform {
  constructor() {
    this.jobs = [];
    this.filteredJobs = [];
    this.userPreferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');
    this.currentPage = 1;
    this.jobsPerPage = 12;
    this.isLoading = false;
    this.searchQuery = '';
    this.filters = {
      location: '',
      experience: '',
      salary: '',
      sort: 'relevance',
      remote: false,
      skills: []
    };
    
    this.aiAssistant = new AIAssistant();
this.aiAssistant.initAIIntegration();
    this.analytics = new PlatformAnalytics();
    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.loadUserPreferences();
    this.showSkeletonJobs();
    await this.loadTrendingJobs();
    this.hideSkeletonJobs();
    this.updateInsights();
  }

  setupEventListeners() {
    // Search functionality
    const mainSearchBtn = document.getElementById('main-search-btn');
    const mainSearchInput = document.getElementById('main-search');
    
    mainSearchBtn?.addEventListener('click', () => this.handleSearch());
    mainSearchInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSearch();
    });

    // Auto-complete search
    mainSearchInput?.addEventListener('input', (e) => this.handleSearchSuggestions(e.target.value));

    // Filter functionality
    const locationFilter = document.getElementById('location-filter');
    const experienceFilter = document.getElementById('experience-filter');
    const salaryFilter = document.getElementById('salary-filter');
    const sortFilter = document.getElementById('sort-filter');

    locationFilter?.addEventListener('change', (e) => this.updateFilter('location', e.target.value));
    experienceFilter?.addEventListener('change', (e) => this.updateFilter('experience', e.target.value));
    salaryFilter?.addEventListener('change', (e) => this.updateFilter('salary', e.target.value));
    sortFilter?.addEventListener('change', (e) => this.updateFilter('sort', e.target.value));

    // View toggle
    const viewToggleBtns = document.querySelectorAll('.toggle-btn');
    viewToggleBtns.forEach(btn => {
      btn.addEventListener('click', () => this.toggleView(btn.dataset.view));
    });

    // Load more
    const loadMoreBtn = document.getElementById('load-more-btn');
    loadMoreBtn?.addEventListener('click', () => this.loadMoreJobs());

    // Navigation
    const dashboardBtn = document.getElementById('dashboard-btn');
    const getStartedBtn = document.getElementById('get-started-btn');
    
    dashboardBtn?.addEventListener('click', () => this.showDashboard());
    getStartedBtn?.addEventListener('click', () => this.aiAssistant.open());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
  }

  handleKeyboardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
      switch(e.key) {
        case 'k':
          e.preventDefault();
          document.getElementById('main-search')?.focus();
          break;
        case '/':
          e.preventDefault();
          this.aiAssistant.open();
          break;
      }
    }
  }

  async handleSearchSuggestions(query) {
    if (query.length < 2) return;
    
    const suggestions = this.generateSearchSuggestions(query);
    this.showSearchSuggestions(suggestions);
  }

  generateSearchSuggestions(query) {
    const commonRoles = [
      'Software Engineer', 'Data Scientist', 'Product Manager', 'UX Designer',
      'DevOps Engineer', 'Marketing Manager', 'Sales Representative', 'Business Analyst',
      'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Machine Learning Engineer'
    ];
    
    const skills = [
      'JavaScript', 'Python', 'React', 'Node.js', 'AWS', 'Docker', 'Kubernetes',
      'Machine Learning', 'Data Analysis', 'Project Management', 'Digital Marketing'
    ];
    
    const allSuggestions = [...commonRoles, ...skills];
    return allSuggestions
      .filter(item => item.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  }

  showSearchSuggestions(suggestions) {
    // Implementation for search suggestions dropdown
    console.log('Search suggestions:', suggestions);
  }

  async handleSearch() {
    const searchInput = document.getElementById('main-search');
    const query = searchInput?.value.trim();
    
    if (!query) return;
    
    this.searchQuery = query;
    this.currentPage = 1;
    this.updateJobsTitle(`Results for "${query}"`);
    this.analytics.trackSearch(query);
    
    this.showSkeletonJobs();
    await this.fetchJobs(query);
    this.hideSkeletonJobs();
  }

  async fetchJobs(keyword = 'trending') {
    try {
      this.isLoading = true;
      const response = await fetch(`/api/jobFetcher?keyword=${encodeURIComponent(keyword)}`);
      const data = await response.json();
      
      if (!data.jobs || !Array.isArray(data.jobs)) {
        throw new Error('Invalid job data received');
      }
      
      this.jobs = data.jobs.map(job => ({
        ...job,
        id: job.id || this.generateJobId(job),
        skills: this.extractSkills(job),
        isRemote: this.isRemoteJob(job),
        experienceLevel: this.extractExperienceLevel(job),
        salaryRange: this.extractSalaryRange(job)
      }));
      
      this.populateFilters();
      this.applyFilters();
      this.renderJobs();
      this.fetchAIScores();
      this.analytics.trackJobsFetched(this.jobs.length, keyword);
      
    } catch (error) {
      console.error('Error fetching jobs:', error);
      this.showError('Failed to load jobs. Please try again.');
      this.analytics.trackError('job_fetch_failed', error.message);
    } finally {
      this.isLoading = false;
    }
  }

  generateJobId(job) {
    return btoa(job.url || job.title + job.company_name).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
  }

  extractSkills(job) {
    const text = `${job.title} ${job.description}`.toLowerCase();
    const skillKeywords = [
      'javascript', 'python', 'react', 'node.js', 'aws', 'docker', 'kubernetes',
      'machine learning', 'data analysis', 'sql', 'mongodb', 'postgresql',
      'figma', 'adobe', 'photoshop', 'sketch', 'git', 'jenkins', 'terraform'
    ];
    
    return skillKeywords.filter(skill => text.includes(skill));
  }

  isRemoteJob(job) {
    const text = `${job.title} ${job.description} ${job.candidate_required_location}`.toLowerCase();
    return text.includes('remote') || text.includes('work from home') || text.includes('wfh');
  }

  extractExperienceLevel(job) {
    const title = job.title.toLowerCase();
    if (title.includes('senior') || title.includes('lead') || title.includes('principal')) return 'Senior';
    if (title.includes('junior') || title.includes('entry') || title.includes('intern')) return 'Entry';
    return 'Mid';
  }

  extractSalaryRange(job) {
    if (!job.salary) return null;
    const numbers = job.salary.match(/\d+/g);
    if (numbers && numbers.length >= 1) {
      const min = parseInt(numbers[0]);
      const max = numbers.length > 1 ? parseInt(numbers[1]) : min * 1.5;
      return { min, max };
    }
    return null;
  }

  async loadTrendingJobs() {
    this.updateJobsTitle('Trending Opportunities');
    await this.fetchJobs('trending');
  }

  populateFilters() {
    const locationFilter = document.getElementById('location-filter');
    if (!locationFilter) return;

    const locations = [...new Set(this.jobs.map(job => job.candidate_required_location).filter(Boolean))];
    
    locationFilter.innerHTML = '<option value="">Location</option>' + 
      locations.map(loc => `<option value="${loc}">${loc}</option>`).join('');
  }

  updateFilter(filterType, value) {
    this.filters[filterType] = value;
    this.currentPage = 1;
    this.applyFilters();
    this.renderJobs();
    this.analytics.trackFilterUsed(filterType, value);
  }

  applyFilters() {
    this.filteredJobs = this.jobs.filter(job => {
      if (this.filters.location && job.candidate_required_location !== this.filters.location) {
        return false;
      }
      
      if (this.filters.experience && job.experienceLevel !== this.filters.experience) {
        return false;
      }
      
      if (this.filters.salary && job.salaryRange) {
        const [min, max] = this.filters.salary.split('-').map(s => parseInt(s.replace('k', '000').replace('$', '').replace('+', '')));
        if (max && job.salaryRange.min > max * 1000) return false;
        if (min && job.salaryRange.max < min * 1000) return false;
      }
      
      if (this.filters.remote && !job.isRemote) {
        return false;
      }
      
      return true;
    });

    this.sortJobs();
  }

  sortJobs() {
    switch (this.filters.sort) {
      case 'date':
        this.filteredJobs.sort((a, b) => new Date(b.publication_date) - new Date(a.publication_date));
        break;
      case 'salary':
        this.filteredJobs.sort((a, b) => {
          const aAvg = a.salaryRange ? (a.salaryRange.min + a.salaryRange.max) / 2 : 0;
          const bAvg = b.salaryRange ? (b.salaryRange.min + b.salaryRange.max) / 2 : 0;
          return bAvg - aAvg;
        });
        break;
      case 'ai-score':
        this.filteredJobs.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
        break;
      case 'relevance':
      default:
        // Sort by relevance score (calculated based on user preferences)
        this.filteredJobs.sort((a, b) => this.calculateRelevanceScore(b) - this.calculateRelevanceScore(a));
        break;
    }
  }

  calculateRelevanceScore(job) {
    let score = 0;
    
    // Skills match
    const userSkills = this.userPreferences.skills || [];
    const skillMatches = job.skills.filter(skill => userSkills.includes(skill)).length;
    score += skillMatches * 10;
    
    // Experience level match
    if (this.userPreferences.experienceLevel === job.experienceLevel) {
      score += 20;
    }
    
    // Remote preference
    if (this.userPreferences.preferRemote && job.isRemote) {
      score += 15;
    }
    
    // Recent jobs get slight boost
    const daysOld = (Date.now() - new Date(job.publication_date)) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 30 - daysOld);
    
    return score;
  }

  renderJobs() {
    const container = document.getElementById('jobs-container');
    if (!container) return;

    const startIndex = (this.currentPage - 1) * this.jobsPerPage;
    const endIndex = startIndex + this.jobsPerPage;
    const jobsToShow = this.filteredJobs.slice(0, endIndex);

    if (jobsToShow.length === 0) {
      container.innerHTML = this.getEmptyState();
      return;
    }

    container.innerHTML = jobsToShow.map(job => `<div class="job-container">${this.createJobCard(job)}</div>`).join('');
    this.attachJobEventListeners();
    this.updateLoadMoreButton();
  }

  createJobCard(job) {
    const aiScore = job.aiScore || 'Loading...';
    const aiScoreClass = this.getAIScoreClass(job.aiScore);
    const relevanceScore = this.calculateRelevanceScore(job);
    
    return `
      <div class="job-card ${relevanceScore > 50 ? 'highly-relevant' : ''}" data-job-id="${job.id}">
        <div class="job-card-header">
          <div class="job-badges">
            ${job.isRemote ? '<span class="badge remote">🌍 Remote</span>' : ''}
            ${relevanceScore > 70 ? '<span class="badge hot">🔥 Perfect Match</span>' : ''}
            ${job.salaryRange && job.salaryRange.max > 100000 ? '<span class="badge high-salary">💰 High Salary</span>' : ''}
          </div>
        </div>
        
        <div class="job-header">
          <div>
            <h3 class="job-title">${job.title}</h3>
            <div class="job-company">
              <span class="company-name">${job.company_name}</span>
              ${this.getCompanyRating(job.company_name)}
            </div>
          </div>
          <div class="ai-score ${aiScoreClass}">
            <span class="score-icon">🤖</span>
            <span class="score-text">${typeof aiScore === 'number' ? `${aiScore}%` : aiScore}</span>
          </div>
        </div>
        
<div class="job-meta">
  <div class="job-meta-item">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" stroke-width="2"/>
      <circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/>
    </svg>
    ${job.candidate_required_location || 'Remote'}
  </div>
  <div class="job-meta-item">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
      <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" stroke-width="2"/>
      <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" stroke-width="2"/>
    </svg>
    ${job.job_type || 'Full-time'}
  </div>
  <div class="job-meta-item">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/>
      <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
      <path d="m22 21-3-3m0 0a5 5 0 1 0-7-7 5 5 0 0 0 7 7z" stroke="currentColor" stroke-width="2"/>
    </svg>
    ${job.experienceLevel}
  </div>
  <div class="job-meta-item publish-date">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
      <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2"/>
    </svg>
    ${this.getTimeAgo(job.publication_date)}
  </div>
</div>

        ${job.skills.length > 0 ? `
<div class="job-skills">
  ${job.skills && job.skills.length > 0 ? job.skills.slice(0, 4).map(skill => `<span class="skill-tag">${skill}</span>`).join('') : '<span class="skill-tag">No skills listed</span>'}
  ${job.skills && job.skills.length > 4 ? `<span class="skill-more">+${job.skills.length - 4}</span>` : ''}
</div>
        ` : ''}
        
<!-- Removed job description for concise card design -->
        
<div class="job-footer">
  <div class="job-actions">
    <button class="btn-secondary" onclick="careerPlatform.openJobModal('${job.id}')">
      Details
    </button>
    <a href="${job.url}" target="_blank" class="btn-primary" onclick="careerPlatform.analytics.trackJobClick('${job.id}')">
      Apply
    </a>
  </div>
</div>
        
        ${relevanceScore > 50 ? `
          <div class="relevance-indicator">
            <span class="relevance-score">${Math.round(relevanceScore)}% Match</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  getCompanyRating(companyName) {
    // Mock company rating system
    const ratings = {
      'Google': 4.9,
      'Microsoft': 4.7,
      'Apple': 4.8,
      'Amazon': 4.2,
      'Meta': 4.1,
      'Netflix': 4.5
    };
    
    const rating = ratings[companyName];
    if (rating) {
      return `<span class="company-rating">⭐ ${rating}</span>`;
    }
    return '';
  }

  formatSalary(amount) {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return amount.toString();
  }

  getTimeAgo(dateStr) {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  }


  loadUserPreferences() {
    // Load and apply user preferences
    if (this.userPreferences.preferredLocations) {
      // Apply preferred locations to filter
    }
  }

  updateInsights() {
    // Update the insights section with real data
    const skillsInDemand = this.getTopSkills();
    this.updateSkillsInsight(skillsInDemand);
  }

  getTopSkills() {
    const skillCounts = {};
    this.jobs.forEach(job => {
      job.skills.forEach(skill => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });
    
    return Object.entries(skillCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6)
      .map(([skill, count]) => ({ skill, count }));
  }

  updateSkillsInsight(skills) {
    const skillTagsContainer = document.querySelector('.skill-tags');
    if (skillTagsContainer && skills.length > 0) {
      skillTagsContainer.innerHTML = skills.map(({skill, count}) => 
        `<span class="skill-tag ${count > 10 ? 'hot' : ''}" title="${count} jobs">${skill}</span>`
      ).join('');
    }
  }

  // ... rest of the methods remain the same but with enhanced analytics tracking

  getAIScoreClass(score) {
    if (typeof score !== 'number') return '';
    if (score >= 70) return 'safe';
    if (score >= 40) return 'moderate';
    return 'risk';
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  async fetchAIScores() {
    const batchSize = 3; // Reduced batch size for better performance
    const jobs = this.filteredJobs.slice(0, 15); // Limit to first 15 jobs
    
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      await Promise.all(batch.map(job => this.fetchJobAIScore(job)));
      await new Promise(resolve => setTimeout(resolve, 1500)); // Increased delay for rate limiting
    }
  }

  async fetchJobAIScore(job, retryCount = 0) {
const maxRetries = 7;
const retryDelay = 5000;

    try {
      console.log("Sending request to Grok API:", {
  jobTitle: job.title,
  jobDescription: job.description || job.title
});
console.log("Attempting to send request to Grok API with payload:", {
  jobTitle: job.title,
  jobDescription: job.description || job.title
});
const response = await fetch('https://career-buddy-with-ai.vercel.app/api/grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: job.title,
          jobDescription: job.description || job.title
        })
      });

      if (!response.ok) {
        // Try to parse Groq error for rate limit
        let friendlyMessage = "Error fetching AI score.";
        let isRateLimit = false;
        try {
          const errorData = await response.json();
          if (
            errorData?.error?.code === "rate_limit_exceeded" ||
            (errorData?.details && errorData.details.includes("rate limit"))
          ) {
            friendlyMessage = "AI is busy right now (rate limit reached). Waiting and retrying...";
            isRateLimit = true;
          }
        } catch (e) {}
        if (isRateLimit && retryCount < maxRetries) {
          this.showAIRateLimitReminder(friendlyMessage);
setTimeout(() => {
  this.fetchJobAIScore(job, retryCount + 1);
}, retryDelay * Math.pow(2, retryCount));
          return;
        } else {
          this.showAIRateLimitReminder(friendlyMessage);
          throw new Error(`HTTP ${response.status}`);
        }
      }

      const data = await response.json();
      let score = null;

      if (data.analysis) {
        const scoreMatch = data.analysis.match(/(\d+)/);
        if (scoreMatch) {
          score = parseInt(scoreMatch[1]);
          if (score > 100) score = score % 100;
        }
      }

      if (score !== null && score >= 0 && score <= 100) {
        job.aiScore = score;
        this.updateJobAIScore(job.id, score);
      } else {
        job.aiScore = this.getFallbackAIScore(job);
this.showError(`AI score could not be fetched for job: ${job.title}. Please try again later.`);
        this.updateJobAIScore(job.id, job.aiScore);
      }

    } catch (error) {
      console.error('Error fetching AI score for job:', job.id, error);

      if (retryCount < maxRetries) {
        setTimeout(() => {
          this.fetchJobAIScore(job, retryCount + 1);
        }, retryDelay * (retryCount + 1));
      } else {
        job.aiScore = this.getFallbackAIScore(job);
        this.updateJobAIScore(job.id, job.aiScore);
      }
    }
  }

  showAIRateLimitReminder(message) {
    // Show a friendly reminder at the top of the page
    let reminder = document.getElementById('ai-rate-limit-reminder');
    if (!reminder) {
      reminder = document.createElement('div');
      reminder.id = 'ai-rate-limit-reminder';
      reminder.style.position = 'fixed';
      reminder.style.top = '0';
      reminder.style.left = '0';
      reminder.style.right = '0';
      reminder.style.zIndex = '9999';
      reminder.style.background = '#f59e42';
      reminder.style.color = '#222';
      reminder.style.fontWeight = 'bold';
      reminder.style.textAlign = 'center';
      reminder.style.padding = '12px 0';
      reminder.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
      reminder.style.fontSize = '16px';
      document.body.appendChild(reminder);
    }
    reminder.textContent = message || "AI is busy right now. Please wait a few seconds and try again!";
    setTimeout(() => {
      if (reminder) reminder.remove();
    }, 8000);
  }

  getFallbackAIScore(job) {
    const title = job.title.toLowerCase();
    const description = (job.description || '').toLowerCase();
    
    const highSafetyKeywords = ['software', 'developer', 'engineer', 'designer', 'creative', 'strategy', 'manager', 'architect', 'lead', 'senior', 'principal', 'ai', 'machine learning', 'data scientist'];
    const mediumSafetyKeywords = ['analyst', 'consultant', 'specialist', 'coordinator', 'officer', 'advisor'];
    const lowerSafetyKeywords = ['clerk', 'assistant', 'operator', 'entry', 'junior', 'support'];
    
    let score = 50;
    
    for (const keyword of highSafetyKeywords) {
      if (title.includes(keyword) || description.includes(keyword)) {
        score = Math.max(score, 75 + Math.floor(Math.random() * 20));
        break;
      }
    }
    
    for (const keyword of mediumSafetyKeywords) {
      if (title.includes(keyword) || description.includes(keyword)) {
        score = Math.max(score, 55 + Math.floor(Math.random() * 20));
        break;
      }
    }
    
    for (const keyword of lowerSafetyKeywords) {
      if (title.includes(keyword) || description.includes(keyword)) {
        score = Math.min(score, 45 + Math.floor(Math.random() * 15));
        break;
      }
    }
    
    return Math.min(Math.max(score, 20), 95);
  }

  updateJobAIScore(jobId, score) {
    const jobCard = document.querySelector(`[data-job-id="${jobId}"]`);
    if (!jobCard) return;
    
    const aiScoreElement = jobCard.querySelector('.ai-score');
    if (aiScoreElement) {
      const scoreText = aiScoreElement.querySelector('.score-text');
      if (scoreText) {
        scoreText.textContent = `${score}%`;
        aiScoreElement.className = `ai-score ${this.getAIScoreClass(score)}`;
      }
    }
  }

  // ... rest of existing methods

  attachJobEventListeners() {
    const jobCards = document.querySelectorAll('.job-card');
    jobCards.forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A' && !e.target.closest('.save-btn')) {
          const jobId = card.dataset.jobId;
          this.openJobModal(jobId);
        }
      });
    });
  }

  openJobModal(jobId) {
    const job = this.jobs.find(j => j.id == jobId);
    if (!job) return;

    const modal = document.getElementById('job-modal');
    const overlay = document.getElementById('job-modal-overlay');
    
    if (!modal || !overlay) return;

    const aiScore = job.aiScore || 'Analyzing...';
    const aiScoreClass = this.getAIScoreClass(job.aiScore);
    const relevanceScore = this.calculateRelevanceScore(job);

    modal.innerHTML = `
      <div class="modal-header" style="background: var(--accent, #e94560); color: #fff; border-radius: 12px 12px 0 0; padding: 24px 32px 16px 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.07);">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <h2 style="margin: 0 0 8px 0; font-size: 2rem; font-weight: 700;">${job.title}</h2>
            <div style="font-size: 1.1rem; font-weight: 500;">
              <span class="company-name" style="color: #fff;">${job.company_name}</span>
              ${this.getCompanyRating(job.company_name)}
            </div>
          </div>
          <button class="modal-close" onclick="careerPlatform.closeJobModal()" style="background: none; border: none; color: #fff; font-size: 2rem; cursor: pointer; margin-left: 24px;">×</button>
        </div>
      </div>
      <div class="modal-content" style="padding: 32px; background: #fff; border-radius: 0 0 12px 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.08);">
        <div class="modal-scores" style="display: flex; gap: 24px; align-items: center; margin-bottom: 24px;">
          <div class="ai-score ${aiScoreClass}" style="font-size: 1.1rem;">
            🤖 ${typeof aiScore === 'number' ? `${aiScore}% Safe from AI` : aiScore}
          </div>
          ${relevanceScore > 50 ? `<div class="relevance-score" style="background: #f59e42; color: #fff; padding: 6px 14px; border-radius: 16px; font-weight: 600;">🎯 ${Math.round(relevanceScore)}% Match</div>` : ''}
        </div>
        <div class="modal-details" style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px 32px; margin-bottom: 24px;">
          <div><strong>Location:</strong> ${job.candidate_required_location || 'Remote'} ${job.isRemote ? '<span class="remote-badge" style="margin-left:8px;">🌍 Remote OK</span>' : ''}</div>
          <div><strong>Type:</strong> ${job.job_type || 'Full-time'}</div>
          <div><strong>Experience:</strong> ${job.experienceLevel}</div>
          <div><strong>Salary:</strong> ${job.salaryRange ? `$${this.formatSalary(job.salaryRange.min)} - $${this.formatSalary(job.salaryRange.max)}` : job.salary || 'Not specified'}</div>
          <div><strong>Published:</strong> ${this.formatDate(job.publication_date)}</div>
        </div>
        ${job.skills.length > 0 ? `
          <div class="modal-skills" style="margin-bottom: 24px;">
            <h4 style="margin-bottom: 10px; color: var(--accent, #e94560); font-size: 1.1rem;">Skills & Technologies</h4>
            <div class="skills-grid" style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${job.skills.map(skill => `<span class="skill-tag" style="background: #f3f4f6; color: #222; padding: 6px 14px; border-radius: 14px; font-size: 0.98rem;">${skill}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        <div class="modal-description" style="margin-bottom: 24px;">
          <h3 style="margin-bottom: 10px; color: var(--accent, #e94560); font-size: 1.1rem;">Job Description</h3>
          <div class="description-content" style="line-height: 1.7; color: #222;">
            ${job.description || 'No description available'}
          </div>
        </div>
        <div class="modal-actions" style="display: flex; gap: 16px; margin-top: 16px;">
          <button class="btn-secondary" onclick="careerPlatform.askAIAboutJob('${job.id}')">
            🤖 Ask AI Coach
          </button>
          <a href="${job.url}" target="_blank" class="btn-primary" onclick="careerPlatform.analytics.trackJobClick('${job.id}')">
            Apply Now →
          </a>
        </div>
      </div>
    `;

    overlay.classList.add('open');
    this.analytics.trackJobViewed(jobId);
  }

  closeJobModal() {
    const overlay = document.getElementById('job-modal-overlay');
    overlay?.classList.remove('open');
  }

  askAIAboutJob(jobId) {
    const job = this.jobs.find(j => j.id == jobId);
    if (!job) return;
    
    this.closeJobModal();
    this.aiAssistant.open();
    this.aiAssistant.askAboutJob(job);
  }

  formatDate(dateStr) {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  showSkeletonJobs() {
    const container = document.getElementById('jobs-container');
    if (!container) return;

    const skeletons = Array(6).fill().map(() => `
      <div class="skeleton-job">
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
        <div class="skeleton-line medium"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>
    `).join('');

    container.innerHTML = skeletons;
  }

  hideSkeletonJobs() {
    // Jobs will be rendered, replacing skeletons
  }

  updateJobsTitle(title) {
    const titleElement = document.getElementById('jobs-title');
    if (titleElement) {
      titleElement.textContent = title;
    }
  }

  toggleView(viewType) {
    const container = document.getElementById('jobs-container');
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    
    toggleBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewType);
    });
    
    if (viewType === 'list') {
      container?.classList.add('list-view');
    } else {
      container?.classList.remove('list-view');
    }
  }

  loadMoreJobs() {
    this.currentPage++;
    this.renderJobs();
  }

  updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (!loadMoreBtn) return;
    
    const totalShown = this.currentPage * this.jobsPerPage;
    const hasMore = totalShown < this.filteredJobs.length;
    
    loadMoreBtn.style.display = hasMore ? 'block' : 'none';
  }

  showError(message) {
    const container = document.getElementById('jobs-container');
    if (container) {
      container.innerHTML = `
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <h3>Oops! Something went wrong</h3>
          <p>${message}</p>
          <button class="btn-primary" onclick="careerPlatform.loadTrendingJobs()">
            Try Again
          </button>
        </div>
      `;
    }
  }

  getEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No jobs found</h3>
        <p>Try adjusting your search criteria or filters</p>
        <button class="btn-primary" onclick="careerPlatform.loadTrendingJobs()">
          View Trending Jobs
        </button>
      </div>
    `;
  }

  showDashboard() {
    alert('Dashboard feature coming soon!');
  }
}

// Analytics Class
class PlatformAnalytics {
  constructor() {
    this.events = [];
  }

  trackSearch(query) {
    this.trackEvent('search', { query, timestamp: Date.now() });
  }

  trackJobsFetched(count, keyword) {
    this.trackEvent('jobs_fetched', { count, keyword, timestamp: Date.now() });
  }

  trackFilterUsed(filterType, value) {
    this.trackEvent('filter_used', { filterType, value, timestamp: Date.now() });
  }

  trackJobViewed(jobId) {
    this.trackEvent('job_viewed', { jobId, timestamp: Date.now() });
  }

  trackJobClick(jobId) {
    this.trackEvent('job_clicked', { jobId, timestamp: Date.now() });
  }

  trackJobSaved(jobId, saved) {
    this.trackEvent('job_saved', { jobId, saved, timestamp: Date.now() });
  }

  trackError(errorType, message) {
    this.trackEvent('error', { errorType, message, timestamp: Date.now() });
  }

  trackEvent(eventName, data) {
    this.events.push({ eventName, data });
    console.log(`Analytics: ${eventName}`, data);
  }
}

// AI Assistant Class (Enhanced)
class AIAssistant {
  initAIIntegration() {
    console.log("AI integration initialized.");
    // Add AI-specific functionality here
  }
  constructor() {
    this.isOpen = false;
    this.conversation = [];
    this.userProfile = {
      interests: null,
      skills: null,
      values: null,
      experience: null,
      preferredLocations: null,
      salaryExpectations: null
    };
    this.currentStep = 'greeting';
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.addInitialMessage();
  }

  setupEventListeners() {
    const toggle = document.getElementById('assistant-toggle');
    const close = document.getElementById('assistant-close');
    const form = document.getElementById('assistant-form');
    const overlay = document.getElementById('job-modal-overlay');

    toggle?.addEventListener('click', () => this.toggle());
    close?.addEventListener('click', () => this.close());
    
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleUserMessage();
    });

    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) {
        careerPlatform.closeJobModal();
      }
    });
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    const panel = document.getElementById('assistant-panel');
    panel?.classList.add('open');
    this.isOpen = true;
    
    setTimeout(() => {
      const input = document.getElementById('assistant-input');
      input?.focus();
    }, 300);
  }

  close() {
    const panel = document.getElementById('assistant-panel');
    panel?.classList.remove('open');
    this.isOpen = false;
  }

  addInitialMessage() {
    this.addMessage('bot', "Hi! I'm your AI career coach. I can help you find the perfect job match, analyze your skills, and guide your career growth. Try asking me:\n\n• 'What jobs match my skills?'\n• 'Should I apply for this role?'\n• 'How can I improve my resume?'\n\nWhat would you like to explore today?");
  }

  async handleUserMessage() {
    const input = document.getElementById('assistant-input');
    const message = input?.value.trim();
    
    if (!message) return;
    
    this.addMessage('user', message);
    input.value = '';
    
    this.showTyping();
    
    try {
      const response = await this.getAIResponse(message);
      this.hideTyping();
      this.addMessage('bot', response);
      this.updateConversationFlow(message, response);
    } catch (error) {
      this.hideTyping();
      this.addMessage('bot', "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.");
    }
  }

  async getAIResponse(userMessage) {
    try {
      const prompt = this.buildChatPrompt(userMessage);
      
      const response = await fetch('/api/grok', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jobTitle: job.title,
    jobDescription: job.description || job.title,
    mode: 'chatbot'
  })
});
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: "AI Career Coach Response",
          jobDescription: prompt
        })
      });
      
      const data = await response.json();
      
      // Clean up the response to remove any meta-commentary
      let aiResponse = data.analysis || "I'm not sure how to help with that. Could you tell me more about your career goals?";
      
      // Remove any text that talks about analyzing jobs or scoring
      aiResponse = aiResponse.replace(/\*\*Risk Summary:\*\*.*$/s, '');
      aiResponse = aiResponse.replace(/\*\*Risk Score:.*$/s, '');
      aiResponse = aiResponse.replace(/The job requires.*$/s, '');
      aiResponse = aiResponse.replace(/This.*job is at.*risk.*$/s, '');

      // If the response is just a number or a short number-like string, show a friendly fallback
      if (/^\s*\d+\s*$/.test(aiResponse.trim())) {
        aiResponse = "I'm here to help with your career questions. Could you tell me more about your goals, interests, or what you're looking for?";
      }
      
      return aiResponse.trim() || "I'm here to help with your career questions. What would you like to know?";
    } catch (error) {
      console.error('AI Response Error:', error);
      return "I'm having trouble connecting right now. Could you try asking your question again?";
    }
  }

  buildChatPrompt(currentMessage) {
    const conversationHistory = this.conversation.slice(-6).map(msg => 
      `${msg.sender === 'user' ? 'User' : 'Coach'}: ${msg.content}`
    ).join('\n');
    
    const profileInfo = Object.entries(this.userProfile)
      .filter(([key, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    const availableJobs = careerPlatform.jobs.slice(0, 3).map(job => 
      `• ${job.title} at ${job.company_name} (${job.experienceLevel}${job.isRemote ? ', Remote' : ''})`
    ).join('\n');
    
    return `You are a professional AI career coach helping someone with their career development. Be conversational, supportive, and provide actionable advice.

Context:
- User Profile: ${profileInfo || 'Still learning about the user'}
- Available Jobs: ${availableJobs || 'Loading job opportunities...'}

Recent Conversation:
${conversationHistory}

Current User Message: "${currentMessage}"

Instructions:
- Respond as a helpful career coach, not as a job analyst
- Be warm, professional, and encouraging
- Ask follow-up questions to understand their goals better
- Provide specific, actionable career advice
- If they ask about skills, suggest relevant learning paths
- If they ask about jobs, help them evaluate fit and next steps
- Keep responses focused and under 150 words
- Don't mention risk scores or job safety analysis

Respond directly as the career coach:`;
  }

  updateConversationFlow(userMessage, botResponse) {
    const message = userMessage.toLowerCase();
    
    // Enhanced profile extraction
    if (!this.userProfile.interests && (message.includes('interested') || message.includes('like') || message.includes('passion') || message.includes('enjoy'))) {
      this.userProfile.interests = userMessage;
    }
    
    if (!this.userProfile.skills && (message.includes('skill') || message.includes('experience') || message.includes('good at') || message.includes('know'))) {
      this.userProfile.skills = userMessage;
    }
    
    if (!this.userProfile.values && (message.includes('value') || message.includes('important') || message.includes('looking for') || message.includes('want'))) {
      this.userProfile.values = userMessage;
    }

    if (!this.userProfile.experience && (message.includes('years') || message.includes('worked') || message.includes('experience'))) {
      this.userProfile.experience = userMessage;
    }
  }

  askAboutJob(job) {
    const message = `I'm looking at a ${job.title} position at ${job.company_name}. Can you help me understand if this would be a good fit for my career?`;
    
    this.addMessage('user', message);
    this.showTyping();
    
    setTimeout(async () => {
      try {
        const context = `
          The user is asking about this specific job:
          Title: ${job.title}
          Company: ${job.company_name}
          Location: ${job.candidate_required_location}
          Type: ${job.job_type}
          Experience Level: ${job.experienceLevel}
          Skills Required: ${job.skills.join(', ')}
          Description: ${job.description}
          Salary: ${job.salaryRange ? `$${job.salaryRange.min}-${job.salaryRange.max}` : 'Not specified'}
          
          User Profile: ${Object.entries(this.userProfile).filter(([k,v]) => v).map(([k,v]) => `${k}: ${v}`).join(', ') || 'Limited information available'}
          
          Provide comprehensive analysis covering:
          1. Job fit assessment based on their background
          2. Growth and learning opportunities
          3. Salary competitiveness and negotiation tips
          4. Company culture and reputation insights
          5. Specific interview preparation advice
          6. Any potential red flags or concerns
          7. Next steps if they're interested
          
          Be specific, actionable, and encouraging while being honest about any concerns.
        `;
        
        const response = await fetch('/api/grok', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobTitle: "Detailed Job Analysis",
            jobDescription: context,
            mode: "chatbot"
          })
        });
        
        const data = await response.json();
        this.hideTyping();
        this.addMessage('bot', data.analysis || "This looks like an interesting opportunity! Based on the role details, I can help you evaluate if it's a good fit. What specific aspects would you like me to focus on?");
      } catch (error) {
        this.hideTyping();
        this.addMessage('bot', "I'd be happy to help analyze this job opportunity! What specific questions do you have about the role, company, or how it fits your career goals?");
      }
    }, 2000);
  }

  addMessage(sender, content) {
    const messagesContainer = document.getElementById('assistant-messages');
    if (!messagesContainer) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `assistant-message ${sender}`;
    
    messageElement.innerHTML = `
      <div class="message-avatar">${sender === 'bot' ? '🤖' : '👤'}</div>
      <div class="message-content">${content}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    this.conversation.push({ sender, content, timestamp: Date.now() });
  }

  showTyping() {
    const messagesContainer = document.getElementById('assistant-messages');
    if (!messagesContainer) return;
    
    const typingElement = document.createElement('div');
    typingElement.className = 'assistant-message bot typing-indicator';
    typingElement.id = 'typing-indicator';
    
    typingElement.innerHTML = `
      <div class="message-avatar">🤖</div>
      <div class="message-content">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    
    messagesContainer.appendChild(typingElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  hideTyping() {
    const typingIndicator = document.getElementById('typing-indicator');
    typingIndicator?.remove();
  }
}

// Initialize the platform
const careerPlatform = new CareerPlatform();

// Global utility functions
window.careerPlatform = careerPlatform;

// Handle modal clicks
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    careerPlatform.closeJobModal();
  }
});

// Handle escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    careerPlatform.closeJobModal();
    careerPlatform.aiAssistant.close();
  }
});

// Enhanced CSS for new features
const enhancedStyles = `
<style>
/* Enhanced Job Card Styles */
.job-card {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.job-card.highly-relevant {
  border: 2px solid var(--accent);
  box-shadow: 0 8px 32px rgba(233, 69, 96, 0.15);
}

.job-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.job-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge.remote {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success);
}

.badge.hot {
  background: rgba(233, 69, 96, 0.1);
  color: var(--accent);
  animation: pulse-glow 2s infinite;
}

.badge.high-salary {
  background: rgba(245, 158, 11, 0.1);
  color: var(--warning);
}

@keyframes pulse-glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}


.company-name {
  font-weight: 600;
  color: var(--neutral-700);
}

.company-rating {
  font-size: 12px;
  color: var(--warning);
  margin-left: 8px;
}

.ai-score {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 80px;
  justify-content: center;
}

.score-icon {
  font-size: 16px;
}

.job-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0;
}

.skill-tag {
  background: var(--neutral-200);
  color: var(--neutral-700);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: capitalize;
}

.skill-more {
  background: var(--neutral-300);
  color: var(--neutral-600);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.job-meta-item.publish-date {
  color: var(--neutral-500);
  font-size: 13px;
}

.relevance-indicator {
  position: absolute;
  top: 16px;
  right: 16px;
  background: var(--accent);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  transform: rotate(15deg);
}

.relevance-score {
  font-size: 12px;
  font-weight: 600;
}

/* Enhanced Modal Styles */
.modal-scores {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modal-skills {
  margin: 20px 0;
}

.modal-skills h4 {
  margin-bottom: 12px;
  color: var(--neutral-900);
  font-size: 16px;
}

.skills-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.remote-badge {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 8px;
}

/* Enhanced Button Styles */
.btn-primary, .btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  transition: all 0.3s ease;
}

.btn-primary:hover, .btn-secondary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* List View Styles */
.jobs-container.list-view .job-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 20px;
  min-height: 120px;
}

.jobs-container.list-view .job-header {
  flex: 1;
  margin-right: 20px;
}

.jobs-container.list-view .job-meta {
  display: flex;
  gap: 20px;
  margin: 8px 0;
}

.jobs-container.list-view .job-description {
  display: none;
}

.jobs-container.list-view .job-footer {
  margin-left: auto;
  text-align: right;
}

/* Typing indicator enhancements */
.typing-dots span {
  background: var(--accent);
}

/* Loading animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.job-card {
  animation: fadeInUp 0.6s ease-out;
}

/* Responsive enhancements */
@media (max-width: 768px) {
  .job-badges {
    margin-bottom: 8px;
  }
  
  .save-btn {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }
  
  .job-skills {
    margin: 8px 0;
  }
  
  .skill-tag {
    font-size: 10px;
    padding: 3px 6px;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .skill-tag {
    background: var(--neutral-700);
    color: var(--neutral-300);
  }
  
  .badge.remote {
    background: rgba(16, 185, 129, 0.2);
  }
  
  .badge.hot {
    background: rgba(233, 69, 96, 0.2);
  }
  
  .badge.high-salary {
    background: rgba(245, 158, 11, 0.2);
  }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', enhancedStyles);
