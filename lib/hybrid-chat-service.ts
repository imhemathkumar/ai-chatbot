import { geminiApiService, type ApiResponse } from "./gemini-api"
import { apiService } from "./api"

interface HybridChatRequest {
  message: string
  session_id?: string
  use_dataset?: boolean
  model_type?: "basic" | "enhanced"
}

interface HybridChatResponse {
  response: string
  source: "dataset" | "gemini"
  session_id: string
  response_time: number
  timestamp: string
  confidence?: number
}

class HybridChatService {
  async sendMessage(request: HybridChatRequest): Promise<ApiResponse<HybridChatResponse>> {
    const startTime = Date.now()
    const sessionId = request.session_id || Math.random().toString(36).substring(7)

    try {
      if (!request.use_dataset || !this.isCustomerSupportQuery(request.message)) {
        console.log("[v0] Trying Gemini first for general query")
        try {
          const geminiResponse = await geminiApiService.sendMessage({
            message: request.message,
            session_id: sessionId,
          })

          if (geminiResponse.status === "success" && geminiResponse.data) {
            const responseTime = (Date.now() - startTime) / 1000
            return {
              status: "success",
              data: {
                response: geminiResponse.data.response,
                source: "gemini",
                session_id: sessionId,
                response_time: responseTime,
                timestamp: new Date().toISOString(),
              },
              timestamp: new Date().toISOString(),
            }
          }
        } catch (error) {
          console.log("[v0] Gemini failed, trying dataset fallback:", error)
        }
      }

      // Try dataset if preferred or Gemini failed
      if (request.use_dataset || this.isCustomerSupportQuery(request.message)) {
        try {
          const datasetResponse = await apiService.sendMessage({
            message: request.message,
            session_id: sessionId,
            model_type: request.model_type || "enhanced",
          })

          if (datasetResponse.status === "success" && datasetResponse.data) {
            const responseTime = (Date.now() - startTime) / 1000
            return {
              status: "success",
              data: {
                response: datasetResponse.data.response,
                source: "dataset",
                session_id: sessionId,
                response_time: responseTime,
                timestamp: new Date().toISOString(),
                confidence: datasetResponse.data.confidence,
              },
              timestamp: new Date().toISOString(),
            }
          }
        } catch (error) {
          console.log("[v0] Dataset API failed, falling back to Gemini:", error)
        }
      }

      console.log("[v0] Using Gemini as final fallback")
      const geminiResponse = await geminiApiService.sendMessage({
        message: request.message,
        session_id: sessionId,
      })

      if (geminiResponse.status === "success" && geminiResponse.data) {
        const responseTime = (Date.now() - startTime) / 1000
        return {
          status: "success",
          data: {
            response: geminiResponse.data.response,
            source: "gemini",
            session_id: sessionId,
            response_time: responseTime,
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        }
      }

      return {
        status: "success",
        data: {
          response:
            "I'm having trouble connecting to my AI services right now. Please check that your Gemini API key is properly configured in Project Settings → Environment Variables. You can get a free API key from Google AI Studio (aistudio.google.com).",
          source: "gemini",
          session_id: sessionId,
          response_time: (Date.now() - startTime) / 1000,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error("Hybrid chat service error:", error)
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to get response from any AI service",
        timestamp: new Date().toISOString(),
      }
    }
  }

  private isCustomerSupportQuery(message: string): boolean {
    const supportKeywords = [
      "help",
      "support",
      "problem",
      "issue",
      "error",
      "bug",
      "complaint",
      "refund",
      "return",
      "cancel",
      "billing",
      "payment",
      "account",
      "login",
      "password",
      "reset",
      "contact",
      "phone",
      "email",
    ]

    const lowerMessage = message.toLowerCase()
    return supportKeywords.some((keyword) => lowerMessage.includes(keyword))
  }

  async healthCheck(): Promise<ApiResponse> {
    const [datasetHealth, geminiHealth] = await Promise.allSettled([
      apiService.healthCheck(),
      geminiApiService.healthCheck(),
    ])

    const datasetStatus = datasetHealth.status === "fulfilled" && datasetHealth.value.status === "success"
    const geminiStatus = geminiHealth.status === "fulfilled" && geminiHealth.value.status === "success"

    return {
      status: datasetStatus || geminiStatus ? "success" : "error",
      data: {
        dataset_backend: datasetStatus,
        gemini_api: geminiStatus,
        hybrid_mode: datasetStatus && geminiStatus,
      },
      message:
        datasetStatus && geminiStatus
          ? "Both services available"
          : datasetStatus
            ? "Dataset backend only"
            : geminiStatus
              ? "Gemini API only"
              : "No services available",
      timestamp: new Date().toISOString(),
    }
  }

  async getModelStatus(): Promise<ApiResponse> {
    try {
      const [datasetStatus, geminiStatus] = await Promise.allSettled([
        apiService.getModelStatus(),
        geminiApiService.getModelStatus(),
      ])

      return {
        status: "success",
        data: {
          dataset_models: datasetStatus.status === "fulfilled" ? datasetStatus.value.data : null,
          gemini_model: geminiStatus.status === "fulfilled" ? geminiStatus.value.data : null,
          hybrid_mode: datasetStatus.status === "fulfilled" && geminiStatus.status === "fulfilled",
        },
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        status: "error",
        message: "Failed to get model status",
        timestamp: new Date().toISOString(),
      }
    }
  }
}

const hybridChatService = new HybridChatService()

export { hybridChatService }
export type { HybridChatRequest, HybridChatResponse }
