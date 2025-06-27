# CareerBuddy – AI-Powered Career Intelligence Platform

CareerBuddy is a modern, AI-driven job discovery and career guidance platform. It leverages advanced AI models to analyze thousands of jobs, provide personalized career insights, and help users understand how safe different roles are from AI disruption.

## Features

- **AI-Powered Job Risk Analysis:**  
  Each job listing is analyzed by Groq's Llama models to estimate its safety from AI disruption, with a clear score and an explanation ("Why this score?") shown in the job details.

- **AI Career Coach:**  
  An interactive AI assistant helps users explore career options, improve their resumes, and get actionable advice tailored to their interests and skills.

- **Smart Search & Filters:**  
  Search jobs by title, skills, or interests. Filter by location, experience, salary, remote options, and more.

- **Trending & Relevant Jobs:**  
  See trending opportunities and jobs most relevant to your profile.

- **Market Insights:**  
  Discover in-demand skills, salary trends, and remote work statistics.

- **Modern UI/UX:**  
  Responsive, visually appealing design with smooth animations and enhanced accessibility.

## How It Works

- **Job Data:**  
  Jobs are fetched from the Remotive API.

- **AI Risk Analysis:**  
  For each job, the backend (`/api/grok`) sends the job title and description to Groq's Llama model, returning a risk score (0-100) and a natural language explanation.

- **Frontend:**  
  Built with vanilla JS and CSS, the frontend displays jobs, explanations, and provides an AI chat assistant.

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/career-buddy-with-ai.git
cd career-buddy-with-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file (or use your deployment platform's environment settings):

```
GROK_API_KEY=your-groq-api-key-here
```

### 4. Run locally

If using Next.js or Vercel serverless functions:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### 5. Deploy

Deploy to [Vercel](https://vercel.com/) for best results.  
Set the `GROK_API_KEY` in your Vercel project environment variables.

## File Structure

```
/
├── api/
│   ├── grok.js         # API route for Groq AI risk analysis
│   └── jobFetcher.js   # API route for fetching jobs from Remotive
├── script.js           # Main frontend logic
├── index.html          # Main HTML file
├── style.css           # Base styles
├── package.json        # Project dependencies
├── README.md           # This file
└── ...
```

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **Backend:** Node.js (Vercel Serverless Functions)
- **APIs:** Remotive (jobs), Groq (AI/LLM)
- **Deployment:** Vercel

## Credits

- [Remotive API](https://remotive.com/api/remote-jobs)
- [Groq AI](https://groq.com/)
- [Llama Models](https://llama.meta.com/)

## License

MIT

---

**CareerBuddy** – Discover your future, powered by AI.
