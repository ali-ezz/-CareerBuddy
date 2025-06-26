// --- AI Chatbot and AI Scoring: Correct API Usage ---
// This snippet ensures the frontend sends the correct mode for chat and scoring

// ... (rest of your CareerPlatform and AIAssistant code above) ...

// Replace the getAIResponse method in AIAssistant with:
async getAIResponse(userMessage) {
  try {
    const prompt = this.buildChatPrompt(userMessage);

    const response = await fetch('https://career-buddy-with-ai.vercel.app/api/grok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobTitle: "AI Career Coach Response",
        jobDescription: prompt,
        mode: "chatbot" // <-- ENSURE THIS IS PRESENT
      })
    });

    const data = await response.json();
    let aiResponse = data.analysis || "I'm not sure how to help with that. Could you tell me more about your career goals?";
    // Remove any risk summary/score if present
    aiResponse = aiResponse.replace(/Risk Summary:.*$/i, '').replace(/Risk Score:.*$/i, '').trim();
    if (/^\s*\d+\s*$/.test(aiResponse)) {
      aiResponse = "I'm here to help with your career questions. Could you tell me more about your goals, interests, or what you're looking for?";
    }
    return aiResponse || "I'm here to help with your career questions. What would you like to know?";
  } catch (error) {
    return "I'm having trouble connecting right now. Could you try asking your question again?";
  }
}

// In your job scoring logic (fetchJobAIScore or similar), ensure you DO NOT send mode: "chatbot":
async fetchJobAIScore(job, retryCount = 0) {
  // ...other code...
  const response = await fetch('https://career-buddy-with-ai.vercel.app/api/grok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobTitle: job.title,
      jobDescription: job.description || job.title
      // DO NOT send mode: "chatbot" here!
    })
  });
  // ...rest of your logic...
}

// --- Layout Fix for Job Cards ---
// Make sure your jobs container is a grid and each card is a direct child
// In your HTML:
// <div class="jobs-container" id="jobs-container"></div>
// Each job card is rendered as a direct child of this container

// In your CSS (already updated):
// .jobs-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 28px; ... }
// .job-card { ... } // as previously updated

// --- End of snippet ---
