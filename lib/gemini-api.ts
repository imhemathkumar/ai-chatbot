interface GeminiChatRequest {
  message: string
  session_id?: string
  target_language?: "en" | "hi" | "te" | "ta"
}

interface GeminiChatResponse {
  response: string
  session_id: string
  response_time: number
  timestamp: string
}

interface ApiResponse<T = any> {
  status: "success" | "error"
  message?: string
  data?: T
  timestamp?: string
}

class GeminiApiService {
  // No API key or SDK on the client; we call our server route

  async sendMessage(request: GeminiChatRequest): Promise<ApiResponse<GeminiChatResponse>> {
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", ...request }),
      })
      return (await res.json()) as ApiResponse<GeminiChatResponse>
    } catch (e: any) {
      return { status: "error", message: e?.message || "Network error", timestamp: new Date().toISOString() }
    }
  }

  async translate(text: string, to: "en" | "hi" | "te" | "ta"): Promise<ApiResponse<{ translated: string }>> {
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "translate", text, target_language: to }),
      })
      return (await res.json()) as ApiResponse<{ translated: string }>
    } catch (e: any) {
      return { status: "error", message: e?.message || "Network error", timestamp: new Date().toISOString() }
    }
  }

  async testConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "health" }),
      })
      const json = (await res.json()) as ApiResponse
      return { connected: json.status === "success", error: json.message }
    } catch (e: any) {
      return { connected: false, error: e?.message || "Network error" }
    }
  }

  async healthCheck(): Promise<ApiResponse> {
    const connection = await this.testConnection()
    return {
      status: connection.connected ? "success" : "error",
      message: connection.error,
      timestamp: new Date().toISOString(),
    }
  }

  async getModelStatus(): Promise<ApiResponse> {
    return {
      status: "success",
      data: {
        models: {
          basic: { loaded: true, info: "Gemini-2.5-Flash (via server route)", training_history: [] },
          enhanced: { loaded: true, info: "Gemini-2.5-Pro (alias)", training_history: [] },
        },
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    }
  }
}

export const geminiApiService = new GeminiApiService()
export type { GeminiChatRequest, GeminiChatResponse, ApiResponse }
