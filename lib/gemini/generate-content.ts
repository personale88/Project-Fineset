const DEFAULT_MODEL = "gemini-2.5-flash";

export type GeminiGenerateConfig = {
  maxOutputTokens?: number;
  temperature?: number;
  model?: string;
  responseMimeType?: "application/json" | "text/plain";
};

export interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

export interface GeminiGenerateResult {
  text: string | null;
  usageMetadata?: GeminiUsageMetadata;
  model: string;
  httpStatus?: number;
  errorMessage?: string;
}

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
): Promise<GeminiGenerateResult> {
  const model = config.model ?? DEFAULT_MODEL;
  const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: config.maxOutputTokens ?? 1024,
      temperature: config.temperature ?? 0.2,
      ...(config.responseMimeType ? { responseMimeType: config.responseMimeType } : {}),
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

  let lastStatus: number | undefined;
  let lastError: string | undefined;

  for (const attempt of attempts) {
    const response = await fetch(attempt.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...attempt.headers,
      },
      body,
    });

    lastStatus = response.status;

    if (!response.ok) {
      lastError = await response.text().catch(() => "");
      if (process.env.NODE_ENV !== "production") {
        console.warn("[gemini]", response.status, lastError.slice(0, 300));
      }
      continue;
    }

    const json = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: GeminiUsageMetadata;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;

    return {
      text,
      usageMetadata: json.usageMetadata,
      model,
      httpStatus: response.status,
    };
  }

  return {
    text: null,
    model,
    httpStatus: lastStatus,
    errorMessage: lastError?.slice(0, 500),
  };
}

export function isGeminiApiKeyConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

// ---------------------------------------------------------------------------
// Streaming variant — yields text chunks as an async generator
// ---------------------------------------------------------------------------

export interface GeminiStreamConfig {
  maxOutputTokens?: number;
  temperature?: number;
  model?: string;
  systemInstruction?: string;
}

/**
 * Calls Gemini streamGenerateContent and yields text tokens as they arrive.
 * Uses SSE/chunked transfer from the REST endpoint.
 *
 * @example
 * for await (const chunk of geminiStreamContent(apiKey, prompt, config)) {
 *   controller.enqueue(encoder.encode(chunk));
 * }
 */
export async function* geminiStreamContent(
  apiKey: string,
  prompt: string,
  config: GeminiStreamConfig = {},
): AsyncGenerator<string, GeminiUsageMetadata | undefined> {
  const model = config.model ?? DEFAULT_MODEL;
  const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

  const bodyObj: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: config.maxOutputTokens ?? 1024,
      temperature: config.temperature ?? 0.7,
    },
  };

  if (config.systemInstruction) {
    bodyObj.systemInstruction = { parts: [{ text: config.systemInstruction }] };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-goog-api-key": apiKey,
  };

  const response = await fetch(baseUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(bodyObj),
  });

  if (!response.ok || !response.body) {
    const errText = await response.text().catch(() => "");
    throw new Error(`[gemini-stream] HTTP ${response.status}: ${errText.slice(0, 300)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastUsage: GeminiUsageMetadata | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE lines arrive as "data: {...JSON...}\n\n"
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // keep the last incomplete line in the buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr || jsonStr === "[DONE]") continue;

      try {
        const chunk = JSON.parse(jsonStr) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          usageMetadata?: GeminiUsageMetadata;
        };
        if (chunk.usageMetadata) {
          lastUsage = chunk.usageMetadata;
        }
        const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) yield text;
      } catch {
        // Malformed SSE chunk — skip silently
      }
    }
  }

  return lastUsage;
}
