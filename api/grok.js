export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { jobTitle, jobDescription, mode } = req.body;
    const apiKey = process.env.GROK_API_KEY;

    let messages;
    if (mode === "chatbot") {
      // Use the jobDescription as the full chat prompt/context from the frontend
      messages = [
        { role: "system", content: `
You are a professional, friendly, and highly knowledgeable AI career coach. 
- Always respond with specific, actionable, and encouraging advice about jobs, skills, and career growth.
- If the user shares their interests or goals (e.g. "I want to be a pilot" or "I love programming"), suggest concrete next steps, learning paths, or career options.
- Ask follow-up questions to help clarify their goals and provide tailored guidance.
- Never respond with just a number or a generic fallback. Never mention risk scores or AI disruption unless asked directly.
- If the user is unsure, help them explore their interests and strengths.
- Be warm, supportive, and concise (max 120 words).
        `.trim() },
        { role: "user", content: jobDescription }
      ];
    } else {
      // Default: risk analysis for job safety
      messages = [
        { role: "system", content: "You are an expert on the future of work and AI automation." },
        { role: "user", content: `Analyze this job: ${jobTitle}. Description: ${jobDescription}. How safe is it from AI disruption? Respond with a short risk summary and a score from 0 (very at risk) to 100 (very safe).` }
      ];
    }

    // Try primary model, then fallback if rate limit or quota error
    const models = ["llama-3.1-8b-instant", "llama3-8b-8192", "llama-3.3-70b-versatile"];
    let grokRes, data, content, lastErrText;
    for (let i = 0; i < models.length; i++) {
      grokRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: models[i],
          messages,
          max_tokens: 300,
          temperature: 0.2
        })
      });

      if (grokRes.ok) {
        data = await grokRes.json();
        content = data.choices?.[0]?.message?.content || "No result.";
        break;
      } else {
        lastErrText = await grokRes.text();
        // Only retry on rate limit or quota errors
        if (
          !/rate limit|quota|too many requests|overloaded|429/i.test(lastErrText)
        ) {
          console.error("Grok API error:", lastErrText);
          return res.status(500).json({ error: "Grok API error", details: lastErrText });
        }
      }
    }

    if (!content) {
      console.error("Grok API error:", lastErrText);
      return res.status(500).json({ error: "Grok API error", details: lastErrText });
    }

    if (mode === "chatbot") {
      res.status(200).json({ analysis: content });
    } else {
      // Extract the first number 0-100 from the response
      const match = content.match(/\b([1-9]?[0-9]|100)\b/);
      const score = match ? match[0] : "N/A";
      res.status(200).json({ analysis: score });
    }
  } catch (err) {
    console.error("Grok API error:", err);
    res.status(500).json({ error: "Grok API error", details: err.message });
  }
}
