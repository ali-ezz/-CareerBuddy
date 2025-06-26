// Advanced Career Platform - Main JavaScript
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
      sort: 'relevance'
    };
    
    this.aiAssistant = new AIAssistant();
    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.showSkeletonJobs();
    await this.loadTrendingJobs();
    this.hideSkeletonJobs();
  }

  setupEventListeners() {
    // Search functionality
    const mainSearchBtn = document.getElementById('main-search-btn');
    const mainSearchInput = document.getElementById('main-search');
    
    mainSearchBtn?.addEventListener('click', () => this.handleSearch());
    mainSearchInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSearch();
    });

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
  }

  async handleSearch() {
    const searchInput = document.getElementById('main-search');
    const query = searchInput?.value.trim();
    
    if (!query) return;
    
    this.searchQuery = query;
    this.currentPage = 1;
    this.updateJobsTitle(`Results for "${query}"`);
    
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
      
      this.jobs = data.jobs;
      this.populateFilters();
      this.applyFilters();
      this.renderJobs();
      
      // Fetch AI scores in batches
      this.fetchAIScores();
      
    } catch (error) {
      console.error('Error fetching jobs:', error);
      this.showError('Failed to load jobs. Please try again.');
    } finally {
      this.isLoading = false;
    }
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
  }

  applyFilters() {
    this.filteredJobs = this.jobs.filter(job => {
      if (this.filters.location && job.candidate_required_location !== this.filters.location) {
        return false;
      }
      
      if (this.filters.experience) {
        const title = job.title.toLowerCase();
        switch (this.filters.experience) {
          case 'entry':
            return title.includes('junior') || title.includes('entry') || title.includes('intern');
          case 'mid':
            return !title.includes('senior') && !title.includes('lead') && !title.includes('principal');
          case 'senior':
            return title.includes('senior') || title.includes('lead') || title.includes('principal');
          case 'executive':
            return title.includes('director') || title.includes('vp') || title.includes('cto') || title.includes('ceo');
        }
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
        this.filteredJobs.sort((a, b) => this.extractSalary(b.salary) - this.extractSalary(a.salary));
        break;
      case 'ai-score':
        this.filteredJobs.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
        break;
      default: // relevance
        break;
    }
  }

  extractSalary(salaryStr) {
    if (!salaryStr) return 0;
    const numbers = salaryStr.match(/\d+/g);
    return numbers ? parseInt(numbers[0]) : 0;
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
    
    return `
      <div class="job-card" data-job-id="${job.id}">
        <div class="job-header">
          <div>
            <h3 class="job-title">${job.title}</h3>
            <div class="job-company">${job.company_name}</div>
          </div>
          <div class="ai-score ${aiScoreClass}">
            🤖 ${typeof aiScore === 'number' ? `${aiScore}% Safe` : aiScore}
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
        </div>
        
        <div class="job-description">
          ${this.truncateText(job.description || 'No description available', 120)}
        </div>
        
        <div class="job-footer">
          <div class="job-salary">${job.salary || 'Salary not specified'}</div>
          <div class="job-actions">
            <button class="btn-secondary" onclick="careerPlatform.openJobModal('${job.id}')">
              View Details
            </button>
            <a href="${job.url}" target="_blank" class="btn-primary">
              Apply Now
            </a>
          </div>
        </div>
      </div>
    `;
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
    const batchSize = 5;
    const jobs = this.filteredJobs.slice(0, 20); // Limit to first 20 jobs
    
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      await Promise.all(batch.map(job => this.fetchJobAIScore(job)));
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
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
        // Try to extract number from analysis
        const scoreMatch = data.analysis.match(/(\d+)/);
        if (scoreMatch) {
          score = parseInt(scoreMatch[1]);
          if (score > 100) score = score % 100; // Handle cases like "score: 75"
        }
      }
      
      if (score !== null && score >= 0 && score <= 100) {
        job.aiScore = score;
        this.updateJobAIScore(job.id, score);
      } else {
        // Fallback scoring based on job title keywords
        job.aiScore = this.getFallbackAIScore(job);
        this.updateJobAIScore(job.id, job.aiScore);
      }
      
    } catch (error) {
      console.error('Error fetching AI score for job:', job.id, error);
      
      if (retryCount < maxRetries) {
        // Retry after delay
        setTimeout(() => {
          this.fetchJobAIScore(job, retryCount + 1);
        }, (retryCount + 1) * 2000);
      } else {
        // Final fallback
        job.aiScore = this.getFallbackAIScore(job);
        this.updateJobAIScore(job.id, job.aiScore);
      }
    }
  }

  getFallbackAIScore(job) {
    const title = job.title.toLowerCase();
    const description = (job.description || '').toLowerCase();
    
    // High AI safety jobs (tech, creative, strategy)
    const highSafetyKeywords = ['software', 'developer', 'engineer', 'designer', 'creative', 'strategy', 'manager', 'architect', 'lead', 'senior', 'principal', 'ai', 'machine learning', 'data scientist'];
    
    // Medium safety jobs
    const mediumSafetyKeywords = ['analyst', 'consultant', 'specialist', 'coordinator', 'officer', 'advisor'];
    
    // Lower safety jobs (repetitive, administrative)
    const lowerSafetyKeywords = ['clerk', 'assistant', 'operator', 'entry', 'junior', 'support'];
    
    let score = 50; // Default score
    
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
    
    return Math.min(Math.max(score, 20), 95); // Ensure score is between 20-95
  }

  updateJobAIScore(jobId, score) {
    const jobCard = document.querySelector(`[data-job-id="${jobId}"]`);
    if (!jobCard) return;
    
    const aiScoreElement = jobCard.querySelector('.ai-score');
    if (aiScoreElement) {
      aiScoreElement.textContent = `🤖 ${score}% Safe`;
      aiScoreElement.className = `ai-score ${this.getAIScoreClass(score)}`;
    }
  }

  attachJobEventListeners() {
    const jobCards = document.querySelectorAll('.job-card');
    jobCards.forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
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

    modal.innerHTML = `
      <div class="modal-header">
        <h2>${job.title}</h2>
        <button class="modal-close" onclick="careerPlatform.closeJobModal()">×</button>
      </div>
      <div class="modal-content">
        <div class="modal-meta">
          <div class="modal-company">${job.company_name}</div>
          <div class="ai-score ${aiScoreClass}">
            🤖 ${typeof aiScore === 'number' ? `${aiScore}% Safe from AI` : aiScore}
          </div>
        </div>
        
        <div class="modal-details">
          <div class="detail-row">
            <strong>Location:</strong> ${job.candidate_required_location || 'Remote'}
          </div>
          <div class="detail-row">
            <strong>Type:</strong> ${job.job_type || 'Full-time'}
          </div>
          <div class="detail-row">
            <strong>Salary:</strong> ${job.salary || 'Not specified'}
          </div>
          <div class="detail-row">
            <strong>Published:</strong> ${this.formatDate(job.publication_date)}
          </div>
        </div>
        
        <div class="modal-description">
          <h3>Job Description</h3>
          <div class="description-content">
            ${job.description || 'No description available'}
          </div>
        </div>
        
        <div class="modal-actions">
          <button class="btn-secondary" onclick="careerPlatform.askAIAboutJob('${job.id}')">
            Ask AI Coach
          </button>
          <a href="${job.url}" target="_blank" class="btn-primary">
            Apply Now
          </a>
        </div>
      </div>
    `;

    overlay.classList.add('open');
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

// AI Assistant Class
class AIAssistant {
  constructor() {
    this.isOpen = false;
    this.conversation = [];
    this.userProfile = {
      interests: null,
      skills: null,
      values: null,
      experience: null
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
    
    // Focus on input
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
    this.addMessage('bot', "Hi! I'm your AI career coach. I can help you find the perfect job match, analyze your skills, and guide your career growth. What would you like to explore today?");
  }

  async handleUserMessage() {
    const input = document.getElementById('assistant-input');
    const message = input?.value.trim();
    
    if (!message) return;
    
    this.addMessage('user', message);
    input.value = '';
    
    // Show typing indicator
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
    const context = this.buildContext(userMessage);
    
    const response = await fetch('/api/grok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobTitle: "Career Coach Conversation",
        jobDescription: context,
        mode: "chatbot"
      })
    });
    
    const data = await response.json();
    return data.analysis || "I'm not sure how to help with that. Could you tell me more about your career goals?";
  }

  buildContext(currentMessage) {
    const conversationHistory = this.conversation.slice(-6).map(msg => 
      `${msg.sender}: ${msg.content}`
    ).join('\n');
    
    const profileInfo = Object.entries(this.userProfile)
      .filter(([key, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    return `
      You are an expert career coach. Have a natural conversation helping with career advice.
      
      User Profile: ${profileInfo || 'Not yet collected'}
      
      Recent conversation:
      ${conversationHistory}
      
      Current message: ${currentMessage}
      
      Instructions:
      - Be conversational and helpful
      - Ask follow-up questions to understand the user better
      - If you don't know their background, ask about interests, skills, or career goals
      - Provide specific, actionable advice
      - Keep responses concise but valuable
      - If they ask about specific jobs, help them understand if it's a good fit
    `;
  }

  updateConversationFlow(userMessage, botResponse) {
    // Extract key information from the conversation
    const message = userMessage.toLowerCase();
    
    if (!this.userProfile.interests && (message.includes('interested') || message.includes('like') || message.includes('passion'))) {
      this.userProfile.interests = userMessage;
    }
    
    if (!this.userProfile.skills && (message.includes('skill') || message.includes('experience') || message.includes('good at'))) {
      this.userProfile.skills = userMessage;
    }
    
    if (!this.userProfile.values && (message.includes('value') || message.includes('important') || message.includes('looking for'))) {
      this.userProfile.values = userMessage;
    }
  }

  askAboutJob(job) {
    const message = `I'm looking at a ${job.title} position at ${job.company_name}. Can you help me understand if this would be a good fit for my career?`;
    
    this.addMessage('user', message);
    this.showTyping();
    
    // Create a specialized prompt for job analysis
    setTimeout(async () => {
      try {
        const context = `
          The user is asking about this job:
          Title: ${job.title}
          Company: ${job.company_name}
          Location: ${job.candidate_required_location}
          Description: ${job.description}
          
          User Profile: ${Object.entries(this.userProfile).filter(([k,v]) => v).map(([k,v]) => `${k}: ${v}`).join(', ') || 'Limited information available'}
          
          Provide helpful analysis about:
          1. Whether this role aligns with their interests/skills
          2. Growth opportunities
          3. What questions they should ask in an interview
          4. Any red flags or concerns
          
          Be specific and actionable.
        `;
        
        const response = await fetch('/api/grok', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobTitle: "Job Analysis",
            jobDescription: context,
            mode: "chatbot"
          })
        });
        
        const data = await response.json();
        this.hideTyping();
        this.addMessage('bot', data.analysis || "This looks like an interesting opportunity! What specific aspects would you like me to analyze?");
      } catch (error) {
        this.hideTyping();
        this.addMessage('bot', "I'd be happy to help analyze this job opportunity! What specific questions do you have about the role?");
      }
    }, 1500);
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

// Add CSS for typing indicator and other dynamic elements
const additionalStyles = `
<style>
.typing-dots {
  display: flex;
  gap: 4px;
  padding: 8px 0;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  background: var(--neutral-400);
  border-radius: 50%;
  animation: typing-bounce 1.4s ease-in-out infinite both;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing-bounce {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.error-state, .empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--neutral-600);
}

.error-icon, .empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid var(--neutral-200);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--neutral-500);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: var(--transition);
}

.modal-close:hover {
  background: var(--neutral-100);
  color: var(--neutral-700);
}

.modal-content {
  padding: 24px;
}

.modal-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.modal-company {
  font-size: 18px;
  font-weight: 600;
  color: var(--neutral-700);
}

.modal-details {
  margin-bottom: 24px;
}

.detail-row {
  display: flex;
  margin-bottom: 8px;
  font-size: 14px;
}

.detail-row strong {
  min-width: 80px;
  color: var(--neutral-700);
}

.modal-description h3 {
  margin-bottom: 12px;
  color: var(--neutral-900);
}

.description-content {
  line-height: 1.6;
  color: var(--neutral-700);
  margin-bottom: 24px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', additionalStyles);
