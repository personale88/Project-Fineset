const DEFAULT_MODEL = "gemini-2.5-flash";

export type GeminiGenerateConfig = {
  maxOutputTokens?: number;
  temperature?: number;
  model?: string;
};

function isAuthorizationApiKey(apiKey: string): boolean {
  return apiKey.startsWith("AQ.");
}

/**
 * Calls Gemini generateContent. Supports legacy AIza keys (?key= query) and
 * Google AI Studio authorization keys (AQ.) via x-goog-api-key header.
 */
export async function geminiGenerateContent(
  apiKey: string,
  prompt: string,
  config: GeminiGenerateConfig = {},
): Promise<string | null> {
  const model = config.model ?? DEFAULT_MODEL;
  const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: config.maxOutputTokens ?? 1024,
      temperature: config.temperature ?? 0.2,
    },
  });

  const attempts: Array<{ url: string; headers: Record<string, string> }> =
    isAuthorizationApiKey(apiKey)
      ? [{ url: baseUrl, headers: { "x-goog-api-key": apiKey } }]
      : [
          { url: baseUrl, headers: { "x-goog-api-key": apiKey } },
          {
            url: `${baseUrl}?key=${encodeURIComponent(apiKey)}`,
            headers: {},
          },
        ];

  for (const attempt of attempts) {
    const response = await fetch(attempt.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...attempt.headers,
      },
      body,
    });

    if (!response.ok) {
      if (process.env.NODE_ENV !== "production") {
        const errBody = await response.text().catch(() => "");
        console.warn("[gemini]", response.status, errBody.slice(0, 300));
      }
      continue;
    }

    const json = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (text) return text;
  }

  return null;
}
