// NOTE: This fully replaces the previous implementation that included Google TTS paths.

export interface TextToSpeechOptions {
  voice?: SpeechSynthesisVoice
  rate?: number
  pitch?: number
  volume?: number
  lang?: "en" | "hi" | "te" | "ta" | string
}

class TextToSpeechService {
  private synthesis: SpeechSynthesis | null = null
  private isSupported = false
  private voices: SpeechSynthesisVoice[] = []
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private isSpeaking = false
  private preferredVoiceByLang: Record<string, string | undefined> = {}

  constructor() {
    this.initializeTextToSpeech()
  }

  private initializeTextToSpeech() {
    if (typeof window === "undefined") return
    if ("speechSynthesis" in window) {
      this.isSupported = true
      this.synthesis = window.speechSynthesis
      this.loadVoices()
      if (typeof window.speechSynthesis.onvoiceschanged !== "undefined") {
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices()
      }
    }
  }

  private loadVoices() {
    if (!this.synthesis) return
    this.voices = this.synthesis.getVoices()
  }

  private mapLangToBCP47(lang?: string): string {
    switch ((lang || "en").toLowerCase()) {
      case "hi":
      case "hi-in":
        return "hi-IN"
      case "te":
      case "te-in":
        return "te-IN"
      case "ta":
      case "ta-in":
        return "ta-IN"
      case "en":
      case "en-in":
        return "en-IN"
      default:
        return "en-IN"
    }
  }

  private pickBestVoice(targetTag: string): SpeechSynthesisVoice | undefined {
    const voices = this.voices || []
    const lowerTag = targetTag.toLowerCase()
    // 1) exact tag with localService
    let v =
      voices.find((voice) => voice.lang?.toLowerCase() === lowerTag && voice.localService) ||
      voices.find((voice) => voice.lang?.toLowerCase() === lowerTag)
    if (v) return v

    // 2) same base with -IN (prefer local)
    const base = lowerTag.split("-")[0]
    v =
      voices.find(
        (voice) =>
          voice.lang?.toLowerCase().startsWith(base) && voice.lang?.toLowerCase().endsWith("-in") && voice.localService,
      ) ||
      voices.find((voice) => voice.lang?.toLowerCase().startsWith(base) && voice.lang?.toLowerCase().endsWith("-in"))
    if (v) return v

    // 3) any base language (prefer local)
    v =
      voices.find((voice) => voice.lang?.toLowerCase().startsWith(base) && voice.localService) ||
      voices.find((voice) => voice.lang?.toLowerCase().startsWith(base))
    if (v) return v

    // 4) any Indian region voice as last resort
    v =
      voices.find((voice) => voice.lang?.toLowerCase().endsWith("-in") && voice.localService) ||
      voices.find((voice) => voice.lang?.toLowerCase().endsWith("-in"))
    if (v) return v

    // 5) default or first
    return voices.find((voice) => voice.default) || voices[0]
  }

  public speak(
    text: string,
    options: TextToSpeechOptions = {},
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error: string) => void,
  ): boolean {
    if (!this.isSupported || !this.synthesis) {
      onError?.("Text-to-speech is not supported in this browser")
      return false
    }

    // Stop any current speech
    this.stop()

    try {
      const targetTag = this.mapLangToBCP47(options.lang)
      const utterance = new SpeechSynthesisUtterance(text)

      // tuning
      utterance.rate = options.rate ?? 1
      utterance.pitch = options.pitch ?? 1
      utterance.volume = options.volume ?? 1

      const preferred = this.resolvePreferredVoice(targetTag)
      const chosen = options.voice || preferred || this.pickBestVoice(targetTag)
      if (chosen) {
        utterance.voice = chosen
        utterance.lang = chosen.lang || targetTag
      } else {
        utterance.lang = targetTag
      }

      utterance.onstart = () => {
        this.isSpeaking = true
        onStart?.()
      }
      utterance.onend = () => {
        this.isSpeaking = false
        this.currentUtterance = null
        onEnd?.()
      }
      utterance.onerror = (event) => {
        this.isSpeaking = false
        this.currentUtterance = null
        onError?.(`Speech synthesis error: ${event.error}`)
      }

      this.currentUtterance = utterance
      this.synthesis.speak(utterance)
      return true
    } catch {
      onError?.("Failed to start text-to-speech")
      return false
    }
  }

  public stop(): void {
    if (this.synthesis && (this.isSpeaking || this.currentUtterance)) {
      this.synthesis.cancel()
    }
    this.isSpeaking = false
    this.currentUtterance = null
  }

  public pause(): void {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.pause()
    }
  }

  public resume(): void {
    if (this.synthesis) {
      this.synthesis.resume()
    }
  }

  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking
  }

  public isTextToSpeechSupported(): boolean {
    return this.isSupported
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices
  }

  public listVoicesForLanguage(lang?: string): SpeechSynthesisVoice[] {
    const tag = this.mapLangToBCP47(lang)
    const base = tag.split("-")[0]
    const voices = this.voices || []

    const score = (v: SpeechSynthesisVoice) => {
      const l = (v.lang || "").toLowerCase()
      const local = v.localService ? 1 : 0
      if (l === tag.toLowerCase()) return 100 + local
      if (l.startsWith(base) && l.endsWith("-in")) return 80 + local
      if (l.startsWith(base)) return 60 + local
      if (l.endsWith("-in")) return 40 + local
      return 0 + local
    }

    return [...voices]
      .map((v) => ({ v, s: score(v) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s)
      .map(({ v }) => v)
  }

  public setPreferredVoice(lang: string, voiceUri?: string) {
    const tag = this.mapLangToBCP47(lang)
    this.preferredVoiceByLang[tag] = voiceUri
  }

  private resolvePreferredVoice(tag: string): SpeechSynthesisVoice | undefined {
    const uri = this.preferredVoiceByLang[tag]
    if (!uri) return undefined
    return this.voices.find((v) => v.voiceURI === uri || v.name === uri)
  }

  public resolveVoiceByUri(uri?: string): SpeechSynthesisVoice | undefined {
    if (!uri) return undefined
    return this.voices.find((v) => v.voiceURI === uri || v.name === uri)
  }
}

export const textToSpeechService = new TextToSpeechService()
