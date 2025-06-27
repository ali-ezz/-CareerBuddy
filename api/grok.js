export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { jobTitle, jobDescription, mode } = req.body;
    const apiKey = process.env.GROK_API_KEY;

    let messages;
    if (mode === "chatbot") {
      // Use the jobDescription as the full chat prompt/context from the frontend
      messages = [
        { role: "user", content: jobDescription }
      ];
    } else {
      // Default: risk analysis for job safety
      messages = [
        { role: "user", content: `Analyze this job: ${jobTitle}. Description: ${jobDescription}. How safe is it from AI disruption? Respond with a short risk summary and a score from 0 (very at risk) to 100 (very safe).` }
      ];
    }

    console.log("Request payload:", {
        model: "meta-llama/llama-prompt-guard-2-86m",
        messages,
        max_tokens: 300,
        temperature: 0.2
      });
    import { Groq } from 'groq-sdk';

const groq = new Groq();

const chatCompletion = await groq.chat.completions.create({
  "messages": messages,
  "model": "meta-llama/llama-4-scout-17b-16e-instruct",
  "temperature": 1,
  "max_completion_tokens": 1024,
  "top_p": 1,
  "stream": true,
  "stop": null
});

let content = '';
for await (const chunk of chatCompletion) {
  content += chunk.choices[0]?.delta?.content || '';
}

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
