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
    if (mode === "chatbot") {
      messages = [
        {
          role: "system",
          content: `
You are a professional, friendly, and highly knowledgeable AI career coach. 
- Always respond with specific, actionable, and encouraging advice about jobs, skills, and career growth.
- If the user shares their interests or goals (e.g. "I want to be a pilot" or "I love programming"), suggest concrete next steps, learning paths, or career options.
- Ask follow-up questions to help clarify their goals and provide tailored guidance.
- Never respond with just a number or a generic fallback. Never mention risk scores or AI disruption unless asked directly.
- If the user is unsure, help them explore their interests and strengths.
- Be warm, supportive, and concise (max 120 words).
          `.trim()
        },
        { role: "user", content: jobDescription }
      ];
    } else if (mode === "autocomplete") {
      messages = [
        {
          role: "system",
          content: `
You are an expert AI assistant for a job search platform. Given a partial search input, suggest up to 7 relevant job titles or skills that are popular, in-demand, or trending. Respond with a comma-separated list only, no extra text.
          `.trim()
        },
        { role: "user", content: jobDescription }
      ];
    } else if (mode === "course") {
      messages = [
        {
          role: "system",
          content: `
You are an expert career advisor. Given a skill, search for a real, working online course for learning or improving that skill. Only use major providers (Coursera, edX, Udemy, LinkedIn, etc.) and check that the course is available and not just a landing page. Copy the actual course URL from the provider's catalog. Respond in this format:

[Course Title](URL)  
Provider: ProviderName  
Short Description: (1-2 sentences about what the course covers)

If you cannot find a real, working course, respond with: No real course found.

For example, for "SQL" you might return:
[Databases and SQL for Data Science with Python](https://www.coursera.org/learn/sql-data-science)  
Provider: Coursera  
Short Description: Learn SQL basics, querying, and data analysis using real-world datasets.

Do not invent links. Do not use landing pages. Only copy real course URLs.
          `.trim()
        },
        { role: "user", content: jobDescription }
      ];
    } else if (mode === "company_score") {
      messages = [
        {
          role: "system",
          content: `
You are an expert on workplace culture and employee satisfaction. Given a company name, estimate its employee satisfaction or success rate as a score out of 100, based on public reputation, reviews, innovation, AI adoption, and work environment. Respond in this format:

Score: XX/100

Top reasons:
- Reason 1 (e.g. "Strong reputation for innovation and employee growth")
- Reason 2 (e.g. "Positive employee reviews on Glassdoor")
- Reason 3 (optional, e.g. "Invests in AI and future skills")

Be concise and specific. Do not invent data, but use plausible reasoning based on the company's public image. If you cannot estimate a score, respond with: Score: 70/100

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
    } else {
      messages = [
        { role: "system", content: "You are an expert on the future of work and AI automation." },
        { role: "user", content: `Analyze this job: ${jobTitle}. Description: ${jobDescription}. How safe is it from AI disruption? Respond with a short risk summary, a percentage breakdown (e.g. '70% automatable, 30% human oversight'), and a score from 0 (very at risk) to 100 (very safe). Be concise and clear.` }
      ];
    }

    const groq = new Groq({ apiKey });

    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0.2,
      max_completion_tokens: 300,
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
    res.status(500).json({ error: "Grok API error", details: err.message });
  }
}
