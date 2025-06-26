export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { jobTitle, jobDescription, mode } = req.body;
    const apiKey = process.env.GROK_API_KEY;

    let messages;
    if (mode === "chatbot") {
      // Use the jobDescription as the full chat prompt/context from the frontend
      messages = [
        { role: "system", content: "You are an expert AI career coach. Be conversational, supportive, and provide actionable advice about jobs, skills, and career growth. Never mention risk scores or AI disruption unless asked directly." },
        { role: "user", content: jobDescription }
      ];
    } else {
      // Default: risk analysis for job safety
      messages = [
        { role: "system", content: "You are an expert on the future of work and AI automation." },
        { role: "user", content: `Analyze this job: ${jobTitle}. Description: ${jobDescription}. How safe is it from AI disruption? Respond with a short risk summary and a score from 0 (very at risk) to 100 (very safe).` }
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
