export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { jobTitle, jobDescription } = req.body;
  const apiKey = process.env.GROK_API_KEY;

  const grokRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "mixtral-8x7b-32768",
      messages: [
        { role: "system", content: "You are an expert on the future of work and AI automation." },
        { role: "user", content: `Analyze this job: ${jobTitle}. Description: ${jobDescription}. How safe is it from AI disruption? Respond with a short risk summary and a score from 0 (very at risk) to 100 (very safe).` }
      ],
      max_tokens: 100,
      temperature: 0.2
    })
  });

  const data = await grokRes.json();
  const analysis = data.choices?.[0]?.message?.content || "No result.";
  res.status(200).json({ analysis });
}
