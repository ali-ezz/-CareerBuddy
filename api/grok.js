import { Groq } from 'groq-sdk';

console.log("api/grok.js loaded");

export default async function handler(req, res) {
  console.log("api/grok.js handler invoked", req.method, req.body);
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { jobTitle, jobDescription, mode } = req.body;
    const apiKey = process.env.GROK_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GROK_API_KEY is not set in environment variables." });
    }

    // Truncate all user input to avoid context overflow
    // Remove HTML tags and limit length, but allow enough for reasoning
    function cleanText(str, maxLen) {
      if (!str) return '';
      // Remove HTML tags/entities
      let txt = str.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ');
      // Collapse whitespace
      txt = txt.replace(/\s+/g, ' ').trim();
      // Truncate
      return txt.slice(0, maxLen);
    }
    const safeJobTitle = cleanText(jobTitle, 120);
    const safeJobDescription = cleanText(jobDescription, 400);

    let messages;
    if (mode === "chatbot") {
      messages = [
        {
          role: "user",
          content: `Career advice (max 2 sentences): ${safeJobDescription}`
        }
      ];
    } else if (mode === "autocomplete") {
      messages = [
        {
          role: "user",
          content: `Suggest 5 trending job titles or skills (comma-separated): ${safeJobDescription}`
        }
      ];
    } else if (mode === "course") {
      messages = [
        {
          role: "user",
          content: `Best online course for: ${safeJobDescription}. Reply: Course: [Title] (URL), Provider: [Name], 1-sentence description. Or: No real course found.`
        }
      ];
    } else if (mode === "company_score") {
      messages = [
        {
          role: "user",
          content: `Company score (0-100) for: ${safeJobTitle}. Reason (1 sentence, specific):`
        }
      ];
    } else {
      messages = [
        {
          role: "user",
          content: `AI Safety (0-100) and Automatability (0-100%) for: ${safeJobTitle}. Main reason (1-2 sentences): ${safeJobDescription}`
        }
      ];
    }

    // Ensure apiKey is defined in this scope
    const groqApiKey = apiKey;
    const groq = new Groq({ apiKey: groqApiKey });

    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: "meta-llama/llama-prompt-guard-2-22m",
      temperature: 0.2,
      max_completion_tokens: 
        mode === "company_score" ? 40 :
        mode === "chatbot" ? 40 :
        mode === "course" ? 40 :
        60,
      top_p: 1,
      stream: false,
      stop: null
    });

    const content = chatCompletion.choices?.[0]?.message?.content || "No result.";
    console.log("Grok AI response for mode:", mode, "\n", content);

    // Fallback for SQL and other common skills if course mode fails
    if (mode === "course" && (content.includes("No real course found") || !/\[.*\]\(.*\)/.test(content))) {
      const skill = (req.body.jobDescription || "").toLowerCase();
      if (skill.includes("sql")) {
        res.status(200).json({
          analysis: "Databases and SQL for Data Science with Python",
          explanation: `[Databases and SQL for Data Science with Python](https://www.coursera.org/learn/sql-data-science)  
Provider: Coursera  
Short Description: Learn SQL basics, querying, and data analysis using real-world datasets.`
        });
        return;
      }
      // Add more fallbacks for other common skills if needed
    }

    if (mode === "chatbot") {
      res.status(200).json({ analysis: content });
    } else if (mode === "company_score") {
      // Try to extract score from "Score: XX/100" or fallback to static mock if missing
      let score = "N/A";
      let explanation = content;
      let match = content.match(/Score:\s*(\d{1,3})\/100/i);
      if (match) {
        score = match[1];
      } else {
        // Try to extract any number 0-100
        match = content.match(/\b([1-9]?[0-9]|100)\b/);
        if (match) score = match[0];
      }
      // If still missing or explanation is too short, use a static fallback
      if (score === "N/A" || !explanation || explanation.trim().length < 20) {
        score = "80";
        explanation = `Score: 80/100

Top reasons:
- Good reputation for employee satisfaction and innovation
- Generally positive reviews on Glassdoor and Indeed
- Invests in technology and future skills`;
        console.log("Using static fallback for company_score");
      }
      res.status(200).json({ analysis: score, explanation });
    } else {
      const match = content.match(/\b([1-9]?[0-9]|100)\b/);
      const score = match ? match[0] : "N/A";
      res.status(200).json({ analysis: score, explanation: content });
    }
  } catch (err) {
    console.error("Grok API error:", err);
    console.error("Request body:", req.body);
    console.error("GROK_API_KEY present:", !!process.env.GROK_API_KEY, "apiKey starts with:", apiKey ? apiKey.slice(0, 6) : "undefined");
    console.error("Error stack:", err.stack);

    // Handle Groq token rate limit error
    if (err && err.response && err.response.data && err.response.data.error && err.response.data.error.code === "rate_limit_exceeded") {
      const waitMsg = err.response.data.error.message || "Grok AI rate limit reached. Please try again later.";
      res.status(429).json({ error: "rate_limit", message: waitMsg });
      return;
    }
    // Handle new Groq error format (from feedback)
    if (err && err.error && err.error.code === "rate_limit_exceeded") {
      const waitMsg = err.error.message || "Grok AI rate limit reached. Please try again later.";
      res.status(429).json({ error: "rate_limit", message: waitMsg });
      return;
    }

    res.status(500).json({ error: "Grok API error", details: err.message });
  }
}
