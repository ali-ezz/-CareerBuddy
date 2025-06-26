// Enhanced Career Platform - Professional JavaScript
class CareerPlatform {
  constructor() {
    this.jobs = [];
    this.filteredJobs = [];
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
    this.analytics = new PlatformAnalytics();
    this.searchSuggestions = new SearchSuggestions();
    this.init();
  }

  async init() {
    this.setupEventListeners();
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

    // Enhanced auto-complete search
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

    // Enhanced keyboard shortcuts
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
    if (query.length < 2) {
      this.hideSearchSuggestions();
      return;
    }
    
    const suggestions = this.generateSearchSuggestions(query);
    this.showSearchSuggestions(suggestions);
  }

  generateSearchSuggestions(query) {
    const commonRoles = [
      'Software Engineer', 'Data Scientist', 'Product Manager', 'UX Designer',
      'DevOps Engineer', 'Marketing Manager', 'Sales Representative', 'Business Analyst',
      'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Machine Learning Engineer',
      'Project Manager', 'Content Writer', 'Graphic Designer', 'Customer Success Manager'
    ];
    
    const skills = [
      'JavaScript', 'Python', 'React', 'Node.js', 'AWS', 'Docker', 'Kubernetes',
      'Machine Learning', 'Data Analysis', 'Project Management', 'Digital Marketing',
      'TypeScript', 'Vue.js', 'Angular', 'MongoDB', 'PostgreSQL', 'Redis'
    ];
    
    const allSuggestions = [...commonRoles, ...skills];
    return allSuggestions
      .filter(item => item.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 6);
  }

  showSearchSuggestions(suggestions) {
    const searchContainer = document.querySelector('.search-container');
    let suggestionsDropdown = document.getElementById('search-suggestions');
    
    if (!suggestionsDropdown) {
      suggestionsDropdown = document.createElement('div');
      suggestionsDropdown.id = 'search-suggestions';
      suggestionsDropdown.className = 'search-suggestions';
      searchContainer.appendChild(suggestionsDropdown);
    }
    
    if (suggestions.length > 0) {
      suggestionsDropdown.innerHTML = suggestions.map(suggestion => 
        `<div class="suggestion-item" onclick="careerPlatform.selectSuggestion('${suggestion}')">${suggestion}</div>`
      ).join('');
      suggestionsDropdown.style.display = 'block';
    } else {
      suggestionsDropdown.style.display = 'none';
    }
  }

  hideSearchSuggestions() {
    const suggestionsDropdown = document.getElementById('search-suggestions');
    if (suggestionsDropdown) {
      suggestionsDropdown.style.display = 'none';
    }
  }

  selectSuggestion(suggestion) {
    const searchInput = document.getElementById('main-search');
    if (searchInput) {
      searchInput.value = suggestion;
      this.hideSearchSuggestions();
      this.handleSearch();
    }
  }

  async handleSearch() {
    const searchInput = document.getElementById('main-search');
    const query = searchInput?.value.trim();
    
    if (!query) return;
    
    this.searchQuery = query;
    this.currentPage = 1;
    this.updateJobsTitle(`Results for "${query}"`);
    this.analytics.trackSearch(query);
    this.hideSearchSuggestions();
    
    this.showSkeletonJobs();
    await this.fetchJobs(query);
    this.hideSkeletonJobs();
  }

  async fetchJobs(keyword = 'trending') {
    try {
      this.isLoading = true;
      const response = await fetch(`/api/jobFetcher?keyword=${encodeURIComponent(keyword)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.jobs || !Array.isArray(data.jobs)) {
        throw new Error('Invalid job data format received');
      }
      
      this.jobs = data.jobs.map(job => ({
        ...job,
        id: job.id || this.generateJobId(job),
        skills: this.extractSkills(job),
        isRemote: this.isRemoteJob(job),
        experienceLevel: this.extractExperienceLevel(job),
        salaryRange: this.extractSalaryRange(job),
        companyType: this.extractCompanyType(job)
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
    return btoa(encodeURIComponent(job.url || job.title + job.company_name)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
  }

  extractSkills(job) {
    const text = `${job.title} ${job.description}`.toLowerCase();
    const skillKeywords = [
      'javascript', 'python', 'react', 'node.js', 'aws', 'docker', 'kubernetes',
      'machine learning', 'data analysis', 'sql', 'mongodb', 'postgresql',
      'figma', 'adobe', 'photoshop', 'sketch', 'git', 'jenkins', 'terraform',
      'typescript', 'vue.js', 'angular', 'redis', 'elasticsearch', 'kafka'
    ];
    
    return skillKeywords.filter(skill => text.includes(skill.replace('.', '\\.')));
  }

  isRemoteJob(job) {
    const text = `${job.title} ${job.description} ${job.candidate_required_location}`.toLowerCase();
    return text.includes('remote') || text.includes('work from home') || text.includes('wfh') || text.includes('distributed');
  }

  extractExperienceLevel(job) {
    const title = job.title.toLowerCase();
    const description = (job.description || '').toLowerCase();
    
    if (title.includes('senior') || title.includes('lead') || title.includes('principal') || title.includes('staff')) return 'Senior';
    if (title.includes('junior') || title.includes('entry') || title.includes('intern') || description.includes('0-2 years')) return 'Entry';
    return 'Mid';
  }

  extractSalaryRange(job) {
    if (!job.salary) return null;
    const numbers = job.salary.match(/\d+/g);
    if (numbers && numbers.length >= 1) {
      const min = parseInt(numbers[0]) * (job.salary.includes('k') || job.salary.includes('K') ? 1000 : 1);
      const max = numbers.length > 1 ? parseInt(numbers[1]) * (job.salary.includes('k') || job.salary.includes('K') ? 1000 : 1) : min * 1.3;
      return { min, max };
    }
    return null;
  }

  extractCompanyType(job) {
    const company = job.company_name.toLowerCase();
    const description = (job.description || '').toLowerCase();
    
    if (['google', 'microsoft', 'apple', 'amazon', 'meta', 'netflix'].some(tech => company.includes(tech))) {
      return 'Big Tech';
    }
    if (description.includes('startup') || description.includes('early stage')) {
      return 'Startup';
    }
    if (description.includes('enterprise') || description.includes('fortune')) {
      return 'Enterprise';
    }
    return 'Company';
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
      
      if (this.filters.experience) {
        const experienceMap = {
          'entry': 'Entry',
          'mid': 'Mid', 
          'senior': 'Senior',
          'executive': 'Executive'
        };
        if (job.experienceLevel !== experienceMap[this.filters.experience]) {
          return false;
        }
      }
      
      if (this.filters.salary && job.salaryRange) {
        const ranges = {
          '0-50k': [0, 50000],
          '50k-100k': [50000, 100000],
          '100k-150k': [100000, 150000],
          '150k+': [150000, Infinity]
        };
        
        const [min, max] = ranges[this.filters.salary] || [0, Infinity];
        if (job.salaryRange.max < min || job.salaryRange.min > max) {
          return false;
        }
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
        this.filteredJobs.sort((a, b) => this.calculateRelevanceScore(b) - this.calculateRelevanceScore(a));
        break;
    }
  }

  calculateRelevanceScore(job) {
    let score = 0;
    
    // Recent jobs get boost
    const daysOld = (Date.now() - new Date(job.publication_date)) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 30 - daysOld);
    
    // Remote jobs get slight boost
    if (job.isRemote) score += 10;
    
    // High salary jobs get boost
    if (job.salaryRange && job.salaryRange.max > 100000) score += 15;
    
    // Experience level preference
    if (job.experienceLevel === 'Mid') score += 10; // Most common preference
    
    // Skills relevance
    score += job.skills.length * 5;
    
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

    container.innerHTML = jobsToShow.map(job => this.createJobCard(job)).join('');
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
            ${relevanceScore > 70 ? '<span class="badge hot">🔥 Top Match</span>' : ''}
            ${job.salaryRange && job.salaryRange.max > 120000 ? '<span class="badge high-salary">💰 High Pay</span>' : ''}
            ${job.companyType === 'Big Tech' ? '<span class="badge tech">⭐ Big Tech</span>' : ''}
          </div>
        </div>
        
        <div class="job-header">
          <div class="job-title-area">
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
            ${job.skills.slice(0, 4).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            ${job.skills.length > 4 ? `<span class="skill-more">+${job.skills.length - 4}</span>` : ''}
          </div>
        ` : ''}
        
        <div class="job-description">
          ${this.truncateText(job.description || 'No description available', 140)}
        </div>
        
        <div class="job-footer">
          <div class="job-salary">
            ${job.salaryRange ? 
              `$${this.formatSalary(job.salaryRange.min)} - $${this.formatSalary(job.salaryRange.max)}` : 
              job.salary || 'Competitive salary'
            }
          </div>
          <div class="job-actions">
            <button class="btn-secondary" onclick="careerPlatform.openJobModal('${job.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
              </svg>
              Details
            </button>
            <a href="${job.url}" target="_blank" class="btn-primary" onclick="careerPlatform.analytics.trackJobClick('${job.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M7 17l9.2-9.2M17 17V7H7" stroke="currentColor" stroke-width="2"/>
              </svg>
              Apply
            </a>
          </div>
        </div>
        
        ${relevanceScore > 60 ? `
          <div class="relevance-indicator">
            <span class="relevance-score">${Math.round(relevanceScore)}% Match</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  getCompanyRating(companyName) {
    const ratings = {
      'Google': 4.9, 'Microsoft': 4.7, 'Apple': 4.8, 'Amazon': 4.2,
      'Meta': 4.1, 'Netflix': 4.5, 'Tesla': 4.3, 'Spotify': 4.6,
      'Stripe': 4.8, 'Airbnb': 4.4, 'Uber': 4.0, 'Twitter': 4.2
    };
    
    const rating = ratings[companyName];
    return rating ? `<span class="company-rating">⭐ ${rating}</span>` : '';
  }

  formatSalary(amount) {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return amount.toString();
  }

  getTimeAgo(dateStr) {
    if (!dateStr) return 'Recently';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return '1 day ago';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
      return `${Math.ceil(diffDays / 30)} months ago`;
    } catch {
      return 'Recently';
    }
  }

  updateInsights() {
    const skillsInDemand = this.getTopSkills();
    this.updateSkillsInsight(skillsInDemand);
    this.updateSalaryTrends();
    this.updateRemoteStats();
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
        `<span class="skill-tag ${count > 10 ? 'hot' : ''}" title="${count} jobs mention this skill">${skill}</span>`
      ).join('');
    }
  }

  updateSalaryTrends() {
    const trendElement = document.querySelector('.trend-chart');
    if (trendElement) {
      const avgSalary = this.jobs
        .filter(job => job.salaryRange)
        .reduce((sum, job) => sum + (job.salaryRange.min + job.salaryRange.max) / 2, 0) / 
        this.jobs.filter(job => job.salaryRange).length;
      
      if (avgSalary) {
        trendElement.textContent = `📈 Avg: $${this.formatSalary(avgSalary)}`;
      }
    }
  }

  updateRemoteStats() {
    const remoteElement = document.querySelector('.remote-stats');
    if (remoteElement) {
      const remotePercentage = Math.round((this.jobs.filter(job => job.isRemote).length / this.jobs.length) * 100);
      remoteElement.textContent = `${remotePercentage}% of jobs offer remote work`;
    }
  }

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
    const batchSize = 3;
    const jobs = this.filteredJobs.slice(0, 12); // Reduced for better performance
    
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      await Promise.all(batch.map(job => this.fetchJobAIScore(job)));
      await new Promise(resolve => setTimeout(resolve, 2000)); // Proper rate limiting
    }
  }

  async fetchJobAIScore(job, retryCount = 0) {
    const maxRetries = 2;
    
    try {
      const response = await fetch('/api/grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: job.title,
          jobDescription: job.description || job.title
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      let score = null;
      
      if (data.analysis) {
        // Extract score from AI response
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
        this.updateJobAIScore(job.id, job.aiScore);
      }
      
    } catch (error) {
      console.error('Error fetching AI score for job:', job.id, error);
      
      if (retryCount < maxRetries) {
        setTimeout(() => {
          this.fetchJobAIScore(job, retryCount + 1);
        }, (retryCount + 1) * 3000);
      } else {
        job.aiScore = this.getFallbackAIScore(job);
        this.updateJobAIScore(job.id, job.aiScore);
      }
    }
  }

  getFallbackAIScore(job) {
    const title = job.title.toLowerCase();
    const description = (job.description || '').toLowerCase();
    
    const highSafetyKeywords = [
      'software', 'developer', 'engineer', 'designer', 'creative', 'strategy', 
      'manager', 'architect', 'lead', 'senior', 'principal', 'ai', 'machine learning', 
      'data scientist', 'product manager', 'research', 'innovation'
    ];
    
    const mediumSafetyKeywords = [
      'analyst', 'consultant', 'specialist', 'coordinator', 'officer', 
      'advisor', 'marketing', 'sales', 'hr', 'finance'
    ];
    
    const lowerSafetyKeywords = [
      'clerk', 'assistant', 'operator', 'entry', 'admin', 'support',
      'data entry', 'receptionist', 'cashier'
    ];
    
    let score = 50; // Default baseline
    
    // Check for high safety indicators
    for (const keyword of highSafetyKeywords) {
      if (title.includes(keyword) || description.includes(keyword)) {
        score = Math.max(score, 75 + Math.floor(Math.random() * 20));
        break;
      }
    }
    
    // Check for medium safety indicators
    if (score === 50) {
      for (const keyword of mediumSafetyKeywords) {
        if (title.includes(keyword) || description.includes(keyword)) {
          score = Math.max(score, 55 + Math.floor(Math.random() * 20));
          break;
        }
      }
    }
    
    // Check for lower safety indicators
    for (const keyword of lowerSafetyKeywords) {
      if (title.includes(keyword) || description.includes(keyword)) {
        score = Math.min(score, 45 + Math.floor(Math.random() * 15));
        break;
      }
    }
    
    return Math.min(Math.max(score, 25), 95); // Ensure realistic range
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

  attachJobEventListeners() {
    const jobCards = document.querySelectorAll('.job-card');
    jobCards.forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A' && !e.target.closest('.btn-secondary') && !e.target.closest('.btn-primary')) {
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
      <div class="modal-header">
        <h2>${job.title}</h2>
        <button class="modal-close" onclick="careerPlatform.closeJobModal()">×</button>
      </div>
      <div class="modal-content">
        <div class="modal-meta">
          <div class="modal-company">
            <span class="company-name">${job.company_name}</span>
            ${this.getCompanyRating(job.company_name)}
          </div>
          <div class="modal-scores">
            <div class="ai-score ${aiScoreClass}">
              🤖 ${typeof aiScore === 'number' ? `${aiScore}% AI Safe` : aiScore}
            </div>
            ${relevanceScore > 50 ? `<div class="relevance-score">🎯 ${Math.round(relevanceScore)}% Match</div>` : ''}
          </div>
        </div>
        
        <div class="modal-details">
          <div class="detail-row">
            <strong>Location:</strong> ${job.candidate_required_location || 'Remote'}
            ${job.isRemote ? '<span class="remote-badge">🌍 Remote OK</span>' : ''}
          </div>
          <div class="detail-row">
            <strong>Type:</strong> ${job.job_type || 'Full-time'}
          </div>
          <div class="detail-row">
            <strong>Experience:</strong> ${job.experienceLevel}
          </div>
          <div class="detail-row">
            <strong>Company Type:</strong> ${job.companyType}
          </div>
          <div class="detail-row">
            <strong>Salary:</strong> ${job.salaryRange ? 
              `$${this.formatSalary(job.salaryRange.min)} - $${this.formatSalary(job.salaryRange.max)}` : 
              job.salary || 'Not specified'
            }
          </div>
          <div class="detail-row">
            <strong>Published:</strong> ${this.formatDate(job.publication_date)}
          </div>
        </div>

        ${job.skills.length > 0 ? `
          <div class="modal-skills">
            <h4>Required Skills & Technologies</h4>
            <div class="skills-grid">
              ${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        
        <div class="modal-description">
          <h3>Job Description</h3>
          <div class="description-content">
            ${job.description || 'No detailed description available.'}
          </div>
        </div>
        
        <div class="modal-actions">
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
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'Unknown';
    }
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
    loadMoreBtn.textContent = `Load More Jobs (${Math.min(this.jobsPerPage, this.filteredJobs.length - totalShown)} remaining)`;
  }

  showError(message) {
    const container = document.getElementById('jobs-container');
    if (container) {
      container.innerHTML = `
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <h3>Oops! Something went wrong</h3>
          <p>${message}</p>
          <div class="error-actions">
            <button class="btn-primary" onclick="careerPlatform.loadTrendingJobs()">
              Try Again
            </button>
            <button class="btn-secondary" onclick="careerPlatform.aiAssistant.open()">
              Get Help from AI
            </button>
          </div>
        </div>
      `;
    }
  }

  getEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No jobs found</h3>
        <p>Try adjusting your search criteria or explore trending opportunities</p>
        <div class="empty-actions">
          <button class="btn-primary" onclick="careerPlatform.loadTrendingJobs()">
            View Trending Jobs
          </button>
          <button class="btn-secondary" onclick="careerPlatform.aiAssistant.open()">
            Ask AI for Help
          </button>
        </div>
      </div>
    `;
  }

  showDashboard() {
    // Enhanced dashboard placeholder
    const modal = document.getElementById('job-modal');
    const overlay = document.getElementById('job-modal-overlay');
    
    if (modal && overlay) {
      modal.innerHTML = `
        <div class="modal-header">
          <h2>Dashboard Coming Soon</h2>
          <button class="modal-close" onclick="careerPlatform.closeJobModal()">×</button>
        </div>
        <div class="modal-content">
          <div class="dashboard-preview">
            <h3>🚀 Exciting Features in Development</h3>
            <ul>
              <li>📊 Personalized job recommendations</li>
              <li>📈 Career progress tracking</li>
              <li>🎯 Skill gap analysis</li>
              <li>💼 Application management</li>
              <li>📧 Job alerts & notifications</li>
            </ul>
            <p>Stay tuned for these powerful features!</p>
          </div>
        </div>
      `;
      overlay.classList.add('open');
    }
  }
}

// Enhanced Analytics Class
class PlatformAnalytics {
  constructor() {
    this.events = [];
    this.sessionStart = Date.now();
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

  trackError(errorType, message) {
    this.trackEvent('error', { errorType, message, timestamp: Date.now() });
  }

  trackEvent(eventName, data) {
    this.events.push({ eventName, data });
    
    // Enhanced logging
    console.log(`📊 Analytics: ${eventName}`, {
      ...data,
      sessionDuration: Date.now() - this.sessionStart
    });
  }

  getAnalyticsSummary() {
    return {
      totalEvents: this.events.length,
      sessionDuration: Date.now() - this.sessionStart,
      events: this.events.slice(-10) // Last 10 events
    };
  }
}

// Enhanced Search Suggestions Class
class SearchSuggestions {
  constructor() {
    this.popularSearches = [
      'Remote Software Engineer',
      'Data Scientist',
      'Product Manager',
      'UX Designer',
      'DevOps Engineer',
      'Full Stack Developer'
    ];
  }

  getPopularSearches() {
    return this.popularSearches;
  }

  addPopularSearch(query) {
    if (!this.popularSearches.includes(query)) {
      this.popularSearches.unshift(query);
      this.popularSearches = this.popularSearches.slice(0, 10);
    }
  }
}

// Enhanced AI Assistant Class
class AIAssistant {
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

    toggle?.addEventListener('click', () => this.toggle());
    close?.addEventListener('click', () => this.close());
    
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleUserMessage();
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
    this.addMessage('bot', "Hi! I'm your AI career coach 👋\n\nI can help you with:\n• Finding jobs that match your skills\n• Career guidance and advice\n• Resume and interview tips\n• Salary negotiation strategies\n• Industry insights\n\nWhat can I help you with today?");
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
      this.addMessage('bot', "I apologize, but I'm having trouble connecting right now. Please try again in a moment, or feel free to browse the available jobs while I get back online! 😊");
    }
  }

  async getAIResponse(userMessage) {
    const context = this.buildEnhancedContext(userMessage);
    
    const response = await fetch('/api/grok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobTitle: "AI Career Coach",
        jobDescription: context,
        mode: "career_coaching"
      })
    });
    
    const data = await response.json();
    
    // Better response parsing and fallback
    if (data.analysis && !data.analysis.includes('Risk Summary') && !data.analysis.includes('Risk Score')) {
      return data.analysis;
    }
    
    // Fallback to intelligent responses based on message content
    return this.getIntelligentFallback(userMessage);
  }

  getIntelligentFallback(userMessage) {
    const message = userMessage.toLowerCase();
    
    if (message.includes('hello') || message.includes('hi')) {
      return "Hello! I'm excited to help you with your career journey. What specific area would you like to explore - job searching, skill development, or career planning?";
    }
    
    if (message.includes('job') && message.includes('match')) {
      return "I'd love to help you find matching jobs! Can you tell me about your skills, experience level, and what type of role you're looking for? Also, do you have any location preferences?";
    }
    
    if (message.includes('resume')) {
      return "Great question about resumes! Here are key tips:\n\n• Tailor it to each job application\n• Use action verbs and quantify achievements\n• Keep it concise (1-2 pages)\n• Include relevant keywords from job descriptions\n• Highlight your most recent and relevant experience\n\nWould you like specific advice for your industry?";
    }
    
    if (message.includes('interview')) {
      return "Interview preparation is crucial! Here's what I recommend:\n\n• Research the company and role thoroughly\n• Prepare STAR method examples for behavioral questions\n• Practice common technical questions for your field\n• Prepare thoughtful questions to ask them\n• Plan your outfit and route in advance\n\nWhat type of interview are you preparing for?";
    }
    
    if (message.includes('salary')) {
      return "Salary negotiation is an important skill! Here are some strategies:\n\n• Research market rates for your role and location\n• Consider the entire compensation package\n• Wait for them to make the first offer when possible\n• Be prepared to justify your request with examples\n• Practice your negotiation conversation\n\nWhat's your experience level and industry?";
    }
    
    return "That's an interesting question! I'd love to help you more effectively. Could you provide a bit more context about what you're looking for? For example, are you interested in job searching, career development, skill building, or something else?";
  }

  buildEnhancedContext(currentMessage) {
    const conversationHistory = this.conversation.slice(-6).map(msg => 
      `${msg.sender === 'user' ? 'User' : 'Coach'}: ${msg.content}`
    ).join('\n');
    
    const profileInfo = Object.entries(this.userProfile)
      .filter(([key, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    const availableJobs = careerPlatform.jobs.slice(0, 3).map(job => 
      `${job.title} at ${job.company_name}`
    ).join(', ');
    
    return `
You are an expert AI career coach having a helpful conversation. Provide practical, actionable career advice.

IMPORTANT: You are a career coach, NOT a job safety assessor. Do not provide "Risk Summary" or "Risk Score" responses.

User Profile: ${profileInfo || 'Getting to know the user'}
Recent conversation: ${conversationHistory}
Current available jobs: ${availableJobs}
User message: ${currentMessage}

Provide helpful career coaching advice. Be conversational, encouraging, and specific. Ask follow-up questions when appropriate. Keep responses under 150 words.
    `;
  }

  updateConversationFlow(userMessage, botResponse) {
    const message = userMessage.toLowerCase();
    
    // Enhanced profile extraction
    if (!this.userProfile.interests && (message.includes('interested in') || message.includes('passionate about') || message.includes('love working'))) {
      this.userProfile.interests = userMessage;
    }
    
    if (!this.userProfile.skills && (message.includes('experienced in') || message.includes('skilled in') || message.includes('know'))) {
      this.userProfile.skills = userMessage;
    }
    
    if (!this.userProfile.experience && (message.includes('years') || message.includes('worked as') || message.includes('been a'))) {
      this.userProfile.experience = userMessage;
    }
  }

  askAboutJob(job) {
    const message = `I'm interested in the ${job.title} position at ${job.company_name}. Can you help me understand if this would be a good career move?`;
    
    this.addMessage('user', message);
    this.showTyping();
    
    setTimeout(async () => {
      try {
        const context = `
The user is asking about this job:
Title: ${job.title}
Company: ${job.company_name}
Location: ${job.candidate_required_location}
Type: ${job.job_type}
Experience Level: ${job.experienceLevel}
Skills: ${job.skills.join(', ')}
Salary: ${job.salaryRange ? `$${job.salaryRange.min}-${job.salaryRange.max}` : 'Not specified'}

User Profile: ${Object.entries(this.userProfile).filter(([k,v]) => v).map(([k,v]) => `${k}: ${v}`).join(', ') || 'Limited information'}

As a career coach, provide advice about:
1. Whether this role aligns with their career goals
2. Growth opportunities and skills they'd develop
3. Questions to ask in the interview
4. How to stand out as a candidate

Be encouraging and practical.
        `;
        
        const response = await fetch('/api/grok', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobTitle: "Career Coach Job Analysis",
            jobDescription: context,
            mode: "job_analysis"
          })
        });
        
        const data = await response.json();
        this.hideTyping();
        
        if (data.analysis && !data.analysis.includes('Risk Summary')) {
          this.addMessage('bot', data.analysis);
        } else {
          this.addMessage('bot', `This ${job.title} role at ${job.company_name} looks interesting! Based on the details, here's my analysis:\n\n✅ **Good fit if:** You enjoy ${job.experienceLevel.toLowerCase()} level challenges and want to work with ${job.skills.slice(0,3).join(', ')}\n\n🎯 **Growth potential:** ${job.experienceLevel} roles typically offer good advancement opportunities\n\n💡 **Questions to ask:** What does success look like in this role? What are the biggest challenges the team faces?\n\nWhat specific aspects would you like me to dive deeper into?`);
        }
      } catch (error) {
        this.hideTyping();
        this.addMessage('bot', `I'd be happy to help you evaluate this ${job.title} opportunity! What specific aspects are you most interested in - the role responsibilities, growth potential, or how it fits your career goals?`);
      }
    }, 1500);
  }

  addMessage(sender, content) {
    const messagesContainer = document.getElementById('assistant-messages');
    if (!messagesContainer) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `assistant-message ${sender}`;
    
    // Enhanced message formatting
    const formattedContent = content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    messageElement.innerHTML = `
      <div class="message-avatar">${sender === 'bot' ? '🤖' : '👤'}</div>
      <div class="message-content">${formattedContent}</div>
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

// Enhanced event handling
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    careerPlatform.closeJobModal();
  }
  
  // Hide search suggestions when clicking outside
  if (!e.target.closest('.search-container')) {
    careerPlatform.hideSearchSuggestions();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    careerPlatform.closeJobModal();
    careerPlatform.aiAssistant.close();
    careerPlatform.hideSearchSuggestions();
  }
});

// Enhanced CSS for new features
const enhancedStyles = `
<style>
/* Search Suggestions */
.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
  display: none;
}

.suggestion-item {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--neutral-100);
  transition: var(--transition);
}

.suggestion-item:hover {
  background: var(--neutral-50);
}

.suggestion-item:last-child {
  border-bottom: none;
}

/* Enhanced Job Cards */
.job-card {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  border-left: 4px solid transparent;
}

.job-card.highly-relevant {
  border-left-color: var(--accent);
  box-shadow: 0 8px 32px rgba(233, 69, 96, 0.12);
}

.job-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-xl);
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
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
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

.badge.tech {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}

.job-title-area {
  flex: 1;
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
  font-size: 13px;
  font-weight: 600;
  min-width: 85px;
  justify-content: center;
  white-space: nowrap;
}

.ai-score.safe {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success);
}

.ai-score.moderate {
  background: rgba(245, 158, 11, 0.1);
  color: var(--warning);
}

.ai-score.risk {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
}

.job-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 14px 0;
}

.skill-tag {
  background: var(--neutral-200);
  color: var(--neutral-700);
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
  text-transform: capitalize;
}

.skill-more {
  background: var(--neutral-300);
  color: var(--neutral-600);
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
}

.relevance-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  background: var(--accent);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 700;
  transform: rotate(12deg);
  z-index: 1;
}

/* Enhanced Modal */
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
