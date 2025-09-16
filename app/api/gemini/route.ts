import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Utility to read API key on the server only
function getApiKey(): string | null {
  const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY || null
  return key
}

function getModel(genAI: GoogleGenerativeAI) {
  // Keep model aligned with client expectations
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
}

const LANG_LABEL: Record<"en" | "hi" | "te" | "ta", string> = {
  en: "English",
  hi: "Hindi",
  te: "Telugu",
  ta: "Tamil",
}

export async function POST(req: NextRequest) {
  const started = Date.now()
  try {
    const body = await req.json().catch(() => ({}))
    const { action, message, session_id, target_language, text } = body as {
      action?: "send" | "translate" | "health" | "status"
      message?: string
      session_id?: string
      target_language?: "en" | "hi" | "te" | "ta"
      text?: string
    }

    const apiKey = getApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { status: "error", message: "Gemini API key missing on server", timestamp: new Date().toISOString() },
        { status: 200 },
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = getModel(genAI)

    // health/status checks
    if (action === "health" || action === "status") {
      try {
        const res = await model.generateContent("ping")
        const ok = !!res.response.text()
        return NextResponse.json(
          {
            status: ok ? "success" : "error",
            data: ok ? { ok: true } : undefined,
            message: ok ? undefined : "Gemini health check failed",
            timestamp: new Date().toISOString(),
          },
          { status: 200 },
        )
      } catch (e: any) {
        return NextResponse.json(
          { status: "error", message: e?.message || "Gemini health check error", timestamp: new Date().toISOString() },
          { status: 200 },
        )
      }
    }

    // translation
    if (action === "translate") {
      if (!text || !target_language) {
        return NextResponse.json(
          { status: "error", message: "Missing text or target_language", timestamp: new Date().toISOString() },
          { status: 200 },
        )
      }
      try {
        const label = LANG_LABEL[target_language]
        const prompt = `Translate the following text to ${label} using native script, preserving meaning and formatting. Do not add commentary.\n\nText:\n"""${text}"""`
        const res = await model.generateContent(prompt)
        const translated = res.response.text()
        return NextResponse.json(
          { status: "success", data: { translated }, timestamp: new Date().toISOString() },
          { status: 200 },
        )
      } catch (e: any) {
        return NextResponse.json(
          {
            status: "error",
            message: e?.message || "Gemini translation error",
            timestamp: new Date().toISOString(),
          },
          { status: 200 },
        )
      }
    }

    // default: send
    if (!message) {
      return NextResponse.json(
        { status: "error", message: "Missing message", timestamp: new Date().toISOString() },
        { status: 200 },
      )
    }

    const sid = session_id || Math.random().toString(36).substring(2, 10)

    const instr =
      target_language && LANG_LABEL[target_language]
        ? `You are a helpful assistant. Always respond in ${LANG_LABEL[target_language]} using native script. Keep code or commands in original form.`
        : undefined

    const composed = instr ? `${instr}\n\nUser message:\n"""${message}"""` : message

    try {
      const result = await model.generateContent(composed)
      const responseText = result.response.text()
      const responseTime = (Date.now() - started) / 1000
      const timestamp = new Date().toISOString()

      return NextResponse.json(
        {
          status: "success",
          data: { response: responseText, session_id: sid, response_time: responseTime, timestamp },
          timestamp,
        },
        { status: 200 },
      )
    } catch (e: any) {
      return NextResponse.json(
        { status: "error", message: e?.message || "Gemini API Error", timestamp: new Date().toISOString() },
        { status: 200 },
      )
    }
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error?.message || "Bad request", timestamp: new Date().toISOString() },
      { status: 200 },
    )
  }
}
