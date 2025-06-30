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

    let messages;
    // --- Robust context-aware prompts for each mode ---
    if (mode === "chatbot") {
      messages = [
        {
          role: "system",
          content: `
You are a professional, friendly, and highly knowledgeable AI career coach.
- Always respond with specific, actionable, and encouraging advice about jobs, skills, and career growth.
- Your advice must be based on the user's actual context, goals, and the job market. Do NOT give generic or random advice.
- If the user shares their interests or goals (e.g. "I want to be a pilot" or "I love programming"), suggest concrete next steps, learning paths, or career options.
- Ask follow-up questions to help clarify their goals and provide tailored guidance.
- Never respond with just a number or a generic fallback. Never mention risk scores or AI disruption unless asked directly.
- If the user is unsure, help them explore their interests and strengths.
- Be warm, supportive, and concise (max 120 words).
- If you must infer, state your reasoning.
- Penalize repetition and generic answers.
          `.trim()
        },
        { role: "user", content: jobDescription }
      ];
    } else if (mode === "autocomplete") {
      messages = [
        {
          role: "system",
          content: `
You are an expert AI assistant for a job search platform. Given a partial search input, suggest up to 7 relevant job titles or skills that are popular, in-demand, or trending.
- Your suggestions must be based on the actual input and current job market trends.
- Do NOT give generic or random suggestions.
- Respond with a comma-separated list only, no extra text.
          `.trim()
        },
        { role: "user", content: jobDescription }
      ];
    } else if (mode === "course") {
      // Only send the skill name, not extra context
      messages = [
        {
          role: "system",
          content: `
You are an expert career advisor. Given a skill, search for a real, working online course for learning or improving that skill.
- Only use major providers (Coursera, edX, Udemy, LinkedIn, etc.) and check that the course is available and not just a landing page.
- Copy the actual course URL from the provider's catalog.
- Your recommendation must be based on the actual skill and current course offerings.
- Do NOT invent links. Do NOT use landing pages. Only copy real course URLs.
- Respond in this format:

[Course Title](URL)  
Provider: ProviderName  
Short Description: (1-2 sentences about what the course covers)

If you cannot find a real, working course, respond with: No real course found.

For example, for "SQL" you might return:
[Databases and SQL for Data Science with Python](https://www.coursera.org/learn/sql-data-science)  
Provider: Coursera  
Short Description: Learn SQL basics, querying, and data analysis using real-world datasets.
          `.trim()
        },
        { role: "user", content: jobTitle || jobDescription }
      ];
    } else if (mode === "company_score") {
      // Only send the company name (and optionally job title), not the job description
      messages = [
        {
          role: "system",
          content: `
You are an expert on workplace culture and employee satisfaction. Given a company name, estimate its employee satisfaction or success rate as a score out of 100, based on public reputation, reviews, innovation, AI adoption, and work environment.
- Your score and reasons must be based on the company's actual public reputation, industry, size, and available reviews.
- If you must infer, state your reasoning and make it plausible for the company/industry.
- Never leave the reasons section blank. Always provide at least 3 plausible, company-specific reasons.
- Do NOT give generic or random reasons or numbers.
- Penalize repetition and generic answers.
- Respond in this format:

Score: XX/100

Top reasons:
- Reason 1 (e.g. "Strong reputation for innovation and employee growth")
- Reason 2 (e.g. "Positive employee reviews on Glassdoor")
- Reason 3 (optional, e.g. "Invests in AI and future skills")

If you cannot estimate a score, respond with: Score: 70/100

Example:
Score: 85/100

Top reasons:
- Strong reputation for innovation and employee growth
- Positive employee reviews on Glassdoor
- Invests in AI and future skills
          `.trim()
        },
        { role: "user", content: jobTitle }
      ];
    } else if (mode === "risk_full" || mode === "risk") {
      // For risk scoring, send job title and clean description
      let cleanDesc = jobDescription || "";
      if (/<[a-z][\s\S]*>/i.test(cleanDesc)) {
        cleanDesc = cleanDesc.replace(/<[^>]+>/g, " ");
      }
      cleanDesc = cleanDesc.replace(/\s+/g, " ").trim();
      if (cleanDesc.length > 2000) cleanDesc = cleanDesc.slice(0, 2000);
      messages = [
        { role: "system", content: `
You are an expert on the future of work and AI automation.
- Always provide a nuanced, job-specific analysis.
- Do NOT give the same score or breakdown for every job, even if jobs are similar.
- Use a wide range of scores and breakdowns (not just 60/70/30 or 42/80).
- Your score and reasons must be based on the actual job description, industry, and required skills.
- Analyze the job step by step: first, consider which tasks are automatable and which require human skills, then provide your score and breakdown.
- The AI Safety Score MUST be consistent with the automatability breakdown:
    - If the job is mostly human (low automatability), the AI Safety Score should be high.
    - If the job is mostly automatable, the AI Safety Score should be low.
    - Never contradict these two numbers.
- If you must infer, state your reasoning and make it plausible for the job/industry.
- Give at least 3 concise, bullet-point reasons specific to this job.
- Do NOT use generic phrases; cite actual tasks or skills from the job description.
- Penalize repetition and generic answers.
- Respond in this format:

Score: XX
Automatability: YY% automatable, ZZ% human oversight

Reasons:
1. ...
2. ...
3. ...
          `.trim() },
        { role: "user", content: `Job Title: ${jobTitle}\nDescription: ${cleanDesc}` }
      ];
    } else {
      // Fallback: just echo what was sent
      messages = [
        { role: "system", content: "You are an AI assistant." },
        { role: "user", content: `Job Title: ${jobTitle}\nDescription: ${jobDescription}` }
      ];
    }

    const groq = new Groq({ apiKey });

    // --- Reduce token usage for all calls ---
    let maxTokens = 100;
    let temperature = 0.2;
    if (mode === "risk" || mode === "company_score") {
      maxTokens = 80;
      temperature = 0.8; // More variety for these modes
    }
    if (mode === "risk_full") {
      maxTokens = 120;
      temperature = 0.9; // More variety and detail for risk_full
    }
    if (mode === "course") maxTokens = 80;
    if (mode === "chatbot") maxTokens = 120;

    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: "llama3-70b-8192",
      temperature,
      max_completion_tokens: maxTokens,
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
    } else if (mode === "risk_full") {
      // Always return both score and explanation, even if fallback
      let score = "N/A";
      let explanation = content;
      // Try to extract score from "Score: XX" or "Score: XX/100"
      let match = content.match(/Score:\s*(\d{1,3})/i);
      if (match) {
        score = match[1];
      } else {
        // Try to extract any number 0-100
        match = content.match(/\b([1-9]?[0-9]|100)\b/);
        if (match) score = match[0];
      }
      // Try to extract explanation after "Explanation:" or "Reason:"
      let explanationMatch = content.match(/Explanation:\s*([\s\S]*)/i);
      if (explanationMatch) {
        explanation = explanationMatch[1].trim();
      } else {
        // If not, just use the whole content as explanation
        explanation = content;
      }
      // Fallbacks
      if (score === "N/A") score = "70";
      if (!explanation || explanation.length < 10) explanation = "No detailed AI analysis was available.";
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
    res.status(500).json({ error: "Grok API error", details: err.message });
  }
}
