export type GoogleVoice = {
  name: string
  languageCodes: string[]
  ssmlGender?: "MALE" | "FEMALE" | "NEUTRAL" | "SSML_VOICE_GENDER_UNSPECIFIED"
  naturalSampleRateHertz?: number
}

export async function listGoogleVoices(languageCode?: string): Promise<GoogleVoice[]> {
  const qs = languageCode ? `?languageCode=${encodeURIComponent(languageCode)}` : ""
  const res = await fetch(`/api/tts/google/voices${qs}`, { cache: "no-store" })
  if (!res.ok) {
    return []
  }
  const data = await res.json()
  return data.voices || []
}

function base64ToBlob(base64: string, contentType = "audio/mpeg"): Blob {
  const byteChars = atob(base64)
  const byteNumbers = new Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: contentType })
}

let currentAudio: HTMLAudioElement | null = null

export async function synthesizeAndPlay(params: {
  text: string
  languageCode: "ta-IN" | "te-IN" | "hi-IN" | "en-IN" | string
  voiceName?: string
  speakingRate?: number
  pitch?: number
  onStart?: () => void
  onEnd?: () => void
  onError?: (e: any) => void
}) {
  try {
    const res = await fetch("/api/tts/google/synthesize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: params.text,
        languageCode: params.languageCode,
        voiceName: params.voiceName,
        speakingRate: params.speakingRate ?? 1.0,
        pitch: params.pitch ?? 0.0,
        audioEncoding: "MP3",
      }),
    })
    if (!res.ok) {
      const detail = await res.text()
      params.onError?.(detail)
      return
    }
    const data = await res.json()
    const blob = base64ToBlob(data.audioContent, "audio/mpeg")
    const url = URL.createObjectURL(blob)

    if (currentAudio) {
      currentAudio.pause()
      currentAudio.src = ""
      currentAudio = null
    }

    const audio = new Audio(url)
    currentAudio = audio
    audio.addEventListener("ended", () => {
      params.onEnd?.()
      URL.revokeObjectURL(url)
    })
    audio.addEventListener("play", () => params.onStart?.())
    audio.addEventListener("error", (e) => params.onError?.(e))
    await audio.play()
  } catch (e) {
    params.onError?.(e)
  }
}

export function stopGooglePlayback() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
}

export function toIndianLocale(lang: string): string {
  // Prefer Indian locales
  switch (lang) {
    case "en":
    case "en-IN":
    case "en_US":
    case "en-GB":
      return "en-IN"
    case "hi":
    case "hi-IN":
      return "hi-IN"
    case "te":
    case "te-IN":
      return "te-IN"
    case "ta":
    case "ta-IN":
      return "ta-IN"
    default:
      return lang
  }
}
