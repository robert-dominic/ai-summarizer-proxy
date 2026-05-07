const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    const { content, mode } = req.body;

    if (!content || !content.title || !content.content) {
        return res.status(400).json({ error: "Invalid request. Content is required." });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "Server misconfiguration. API key not set." });
    }

    // Trim content to reduce token usage
    const trimmedContent = {
        title: content.title,
        content: content.content.slice(0, 6000)
    };

    const prompt =
        mode === "brief"
            ? `Summarize this webpage in exactly 3 bullet points. Each bullet must be one sentence only, maximum 20 words. No intro, no outro, just the 3 bullets.

Format exactly like this:
- First key point here
- Second key point here
- Third key point here

Title: ${trimmedContent.title}
Content: ${trimmedContent.content}`

            : `Analyze this webpage and respond in this exact structure. Keep each section tight and concise.

**Summary**
Write 2-3 sentences max. Plain prose, no bullets.

**Key Insights**
- First important takeaway in one sentence
- Second important takeaway in one sentence
- Third important takeaway in one sentence
- Fourth important takeaway in one sentence (if relevant)

**Estimated Reading Time**
X min read

Title: ${trimmedContent.title}
Content: ${trimmedContent.content}`;

    try {
        const groqResponse = await fetch(GROQ_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3,
                max_tokens: mode === "brief" ? 300 : 2048
            })
        });

        if (!groqResponse.ok) {
            const error = await groqResponse.json();
            return res
                .status(groqResponse.status)
                .json({ error: error?.error?.message || "Groq API request failed." });
        }

        const data = await groqResponse.json();
        const summary = data.choices[0].message.content;

        return res.status(200).json({ summary });
    } catch (err) {
        return res.status(500).json({ error: err.message || "Unexpected server error." });
    }
}