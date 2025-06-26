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
        { role: "user", content: `Analyze this job: ${jobTitle}. Description: ${jobDescription}. How safe is it from AI disruption? Respond in this exact format: "Risk Summary: [short summary]. Risk Score: [number from 0 (very at risk) to 100 (very safe)]".` }
      ];
    }

    const grokRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages,
        max_tokens: 300,
        temperature: 0.2
      })
    });

    if (!grokRes.ok) {
      const errText = await grokRes.text();
      console.error("Grok API error:", errText);
      return res.status(500).json({ error: "Grok API error", details: errText });
    }

    const data = await grokRes.json();
    const content = data.choices?.[0]?.message?.content || "No result.";
    if (mode === "chatbot") {
      res.status(200).json({ analysis: content });
    } else {
      // Extract the risk summary and score from the response
      const summaryMatch = content.match(/Risk Summary:(.*?)(?:\.|$)/i);
      const scoreMatch = content.match(/Risk Score:\s*([0-9]{1,3})/i);
      const summary = summaryMatch ? summaryMatch[1].trim() : "";
      const score = scoreMatch ? scoreMatch[1] : "N/A";
      res.status(200).json({ analysis: `Risk Summary: ${summary}. Risk Score: ${score}` });
    }
  } catch (err) {
    console.error("Grok API error:", err);
    res.status(500).json({ error: "Grok API error", details: err.message });
  }
}
