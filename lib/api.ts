interface ApiResponse<T = any> {
  status: "success" | "error"
  message?: string
  data?: T
  timestamp?: string
}

interface ChatRequest {
  message: string
  model_type?: "basic" | "enhanced"
  session_id?: string
}

interface ChatResponse {
  confidence: number | undefined
  response: string
  session_id: string
  model_type: string
  response_time: number
  timestamp: string
}

interface ModelStatus {
  models: {
    basic: {
      loaded: boolean
      info: any
      training_history: any[]
    }
    enhanced: {
      loaded: boolean
      info: any
    }
  }
  timestamp: string
}

interface TrainingRequest {
  model_type?: "basic" | "enhanced"
}

interface TrainingResponse {
  model_type: string
  results: {
    accuracy: number
    training_samples: number
    vocabulary_size: number
  }
  timestamp: string
}

class ApiService {
  private baseUrl: string
  private timeout: number

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
    this.timeout = 30000 // 30 seconds
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please wait before trying again.")
        }
        if (response.status === 404) {
          throw new Error("API endpoint not found. Please check if the backend is running.")
        }
        if (response.status >= 500) {
          throw new Error("Server error. Please try again later.")
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        status: "success",
        data,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Request timeout. Please check your connection and try again.")
        }
        if (error.message.includes("fetch")) {
          throw new Error(
            "Unable to connect to the backend. Please ensure the Flask server is running on http://localhost:5000",
          )
        }
        throw error
      }

      throw new Error("An unexpected error occurred")
    }
  }

  async healthCheck(): Promise<ApiResponse> {
    return this.makeRequest("/health")
  }

  async getModelStatus(): Promise<ApiResponse<ModelStatus>> {
    return this.makeRequest<ModelStatus>("/model-status")
  }

  async trainModel(request: TrainingRequest): Promise<ApiResponse<TrainingResponse>> {
    return this.makeRequest<TrainingResponse>("/train", {
      method: "POST",
      body: JSON.stringify(request),
    })
  }

  async sendMessage(request: ChatRequest): Promise<ApiResponse<ChatResponse>> {
    return this.makeRequest<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify(request),
    })
  }

  async getChatHistory(sessionId: string, limit?: number): Promise<ApiResponse> {
    const params = limit ? `?limit=${limit}` : ""
    return this.makeRequest(`/chat/history/${sessionId}${params}`)
  }

  async clearChatHistory(sessionId: string): Promise<ApiResponse> {
    return this.makeRequest(`/chat/clear/${sessionId}`, {
      method: "DELETE",
    })
  }

  async getAvailableModels(): Promise<ApiResponse> {
    return this.makeRequest("/models")
  }

  async compareModels(message: string): Promise<ApiResponse> {
    return this.makeRequest("/compare", {
      method: "POST",
      body: JSON.stringify({ message }),
    })
  }

  async getDatasetInfo(): Promise<ApiResponse> {
    return this.makeRequest("/dataset/info")
  }

  // Utility method to test connection
  async testConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      await this.healthCheck()
      return { connected: true }
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}

export const apiService = new ApiService()
export type { ApiResponse, ChatRequest, ChatResponse, ModelStatus, TrainingRequest, TrainingResponse }
