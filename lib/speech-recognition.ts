interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognitionResult {
  transcript: string
  confidence: number
  isFinal: boolean
}

class SpeechRecognitionService {
  private recognition: any = null
  private isSupported = false
  private isListening = false
  private onResult: ((result: SpeechRecognitionResult) => void) | null = null
  private onError: ((error: string) => void) | null = null
  private onStart: (() => void) | null = null
  private onEnd: (() => void) | null = null

  constructor() {
    this.initializeSpeechRecognition()
  }

  private initializeSpeechRecognition() {
    if (typeof window === "undefined") return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (SpeechRecognition) {
      this.isSupported = true
      this.recognition = new SpeechRecognition()

      // Configure recognition settings
      this.recognition.continuous = false
      this.recognition.interimResults = true
      this.recognition.lang = "en-IN" // default to Indian English; UI can override per language
      this.recognition.maxAlternatives = 1

      // Set up event listeners
      this.recognition.onstart = () => {
        this.isListening = true
        this.onStart?.()
      }

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[event.resultIndex]
        const transcript = result[0].transcript
        const confidence = result[0].confidence
        const isFinal = result.isFinal

        this.onResult?.({
          transcript,
          confidence,
          isFinal,
        })
      }

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        this.isListening = false
        let errorMessage = "Speech recognition error"

        switch (event.error) {
          case "no-speech":
            errorMessage = "No speech detected. Please try again."
            break
          case "audio-capture":
            errorMessage = "Microphone not accessible. Please check permissions."
            break
          case "not-allowed":
            errorMessage = "Microphone permission denied. Please allow microphone access."
            break
          case "network":
            errorMessage = "Network error occurred during speech recognition."
            break
          default:
            errorMessage = `Speech recognition error: ${event.error}`
        }

        this.onError?.(errorMessage)
      }

      this.recognition.onend = () => {
        this.isListening = false
        this.onEnd?.()
      }
    }
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
      case "en-us":
      default:
        return "en-IN"
    }
  }

  public startListening(
    onResult: (result: SpeechRecognitionResult) => void,
    onError: (error: string) => void,
    onStart?: () => void,
    onEnd?: () => void,
    language?: "en" | "hi" | "te" | "ta",
  ): boolean {
    if (!this.isSupported || !this.recognition) {
      onError("Speech recognition is not supported in this browser")
      return false
    }

    if (this.isListening) {
      onError("Speech recognition is already active")
      return false
    }

    this.onResult = onResult
    this.onError = onError
    this.onStart = onStart ?? null
    this.onEnd = onEnd ?? null

    const target = this.mapLangToBCP47(language)
    try {
      this.recognition.lang = target
      this.recognition.start()
      return true
    } catch (error) {
      onError("Failed to start speech recognition")
      return false
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
    }
  }

  public isCurrentlyListening(): boolean {
    return this.isListening
  }

  public isSpeechRecognitionSupported(): boolean {
    return this.isSupported
  }

  public async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      return true
    } catch (error) {
      return false
    }
  }
}

export const speechRecognitionService = new SpeechRecognitionService()
export type { SpeechRecognitionResult }
