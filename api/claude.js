export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    var messages = req.body.messages || [];
    var system   = req.body.system;
    var openaiMessages = [];
    if (system) {
      openaiMessages.push({ role: "system", content: system });
    }
    for (var i = 0; i < messages.length; i++) {
      openaiMessages.push({
        role:    messages[i].role,
        content: messages[i].content
      });
    }
    var response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model:      "gpt-4o-mini",
        max_tokens: 1000,
        messages:   openaiMessages,
      }),
    });
    var data = await response.json();
    res.status(200).json({
      content: [{ type: "text", text: data.choices[0].message.content }]
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to reach OpenAI API" });
  }
}
