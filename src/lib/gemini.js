const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

const delay = (ms) => new Promise(res => setTimeout(res, ms));

export const callGeminiAPI = async (prompt, isJson = false) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  if (isJson) {
    payload.generationConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          courtId: { type: "STRING" },
          startYear: { type: "INTEGER" },
          startMonth: { type: "INTEGER" },
          startDay: { type: "INTEGER" },
          endYear: { type: "INTEGER" },
          endMonth: { type: "INTEGER" },
          endDay: { type: "INTEGER" }
        },
        required: ["title", "courtId", "startYear", "startMonth", "startDay", "endYear", "endMonth", "endDay"]
      }
    };
  }

  const backoff = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return isJson ? JSON.parse(textResponse) : textResponse;
    } catch (error) {
      console.error("Gemini API Error:", error);
      if (i === 4) throw new Error("Failed to connect to AI after multiple attempts.");
      await delay(backoff[i]);
    }
  }
};
