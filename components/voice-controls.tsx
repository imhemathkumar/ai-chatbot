"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

type VoiceControlsProps = {
  // Language code like 'en', 'hi', 'te', 'ta'
  language: "en" | "hi" | "te" | "ta"
  // Latest assistant text (we'll auto-speak when this changes)
  assistantText?: string
  // Optional: set user input text from speech recognition
  onDictationResult?: (text: string) => void
}

type SupportedLang = VoiceControlsProps["language"]

function getBCP47(lang: SupportedLang): string {
  // Map app language to BCP-47 tags commonly used by SpeechSynthesis
  // We'll try India locales first, then general.
  switch (lang) {
    case "hi":
      return "hi-IN"
    case "te":
      return "te-IN"
    case "ta":
      return "ta-IN"
    default:
      return "en-US"
  }
}

function pickBestVoice(voices: SpeechSynthesisVoice[], targetTag: string) {
  // Try exact match
  let v = voices.find((voice) => voice.lang.toLowerCase() === targetTag.toLowerCase())
  if (v) return v
  // Try startsWith language (hi, te, ta, en)
  const base = targetTag.split("-")[0]
  v = voices.find((voice) => voice.lang.toLowerCase().startsWith(base))
  if (v) return v
  // Fallback: any default voice
  return voices.find((voice) => voice.default) || voices[0]
}

export function VoiceControls({ language, assistantText, onDictationResult }: VoiceControlsProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [enabled, setEnabled] = useState<boolean>(true)
  const [speaking, setSpeaking] = useState<boolean>(false)
  const [recognizing, setRecognizing] = useState<boolean>(false)

  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== "undefined" ? window.speechSynthesis : null)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)
  const recognitionRef = useRef<any>(null)

  // Load voices (they can arrive asynchronously)
  useEffect(() => {
    if (!synthRef.current) return

    function loadVoices() {
      const v = synthRef.current?.getVoices() || []
      setVoices(v)
    }

    loadVoices()
    if (typeof window !== "undefined") {
      window.speechSynthesis?.addEventListener("voiceschanged", loadVoices)
      return () => window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices)
    }
  }, [])

  const targetBCP47 = useMemo(() => getBCP47(language), [language])
  const selectedVoice = useMemo(() => pickBestVoice(voices, targetBCP47), [voices, targetBCP47])

  // Speak the latest assistant message automatically when enabled
  useEffect(() => {
    if (!enabled || !assistantText || !synthRef.current) return
    if (!selectedVoice) return

    // Cancel any ongoing speech
    synthRef.current.cancel()

    const utter = new SpeechSynthesisUtterance(assistantText)
    utter.lang = selectedVoice.lang
    utter.voice = selectedVoice
    utter.rate = 1
    utter.pitch = 1
    utter.volume = 1

    utter.onstart = () => setSpeaking(true)
    utter.onend = () => setSpeaking(false)
    utter.onerror = () => setSpeaking(false)

    utterRef.current = utter
    synthRef.current.speak(utter)
  }, [assistantText, enabled, selectedVoice])

  function handleStop() {
    if (!synthRef.current) return
    synthRef.current.cancel()
    setSpeaking(false)
  }

  function handleTestSpeak() {
    if (!synthRef.current || !selectedVoice) return
    const sample =
      language === "hi"
        ? "नमस्ते! मैं आपकी कैसे सहायता कर सकता हूँ?"
        : language === "te"
          ? "నమస్కారం! నేను మీకు ఎలా సహాయం చేయగలను?"
          : language === "ta"
            ? "வணக்கம்! நான் எப்படி உதவலாம்?"
            : "Hello! How can I help you today?"
    const u = new SpeechSynthesisUtterance(sample)
    u.lang = selectedVoice.lang
    u.voice = selectedVoice
    u.onstart = () => setSpeaking(true)
    u.onend = () => setSpeaking(false)
    synthRef.current.speak(u)
  }

  // Optional: Speech-to-Text using webkitSpeechRecognition (Chrome)
  function ensureRecognition() {
    if (recognitionRef.current) return recognitionRef.current
    if (typeof window === "undefined") return null
    const WSR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!WSR) return null
    const rec = new WSR()
    rec.lang = targetBCP47
    rec.continuous = false
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript
      if (transcript && onDictationResult) onDictationResult(transcript)
    }
    rec.onerror = () => setRecognizing(false)
    rec.onend = () => setRecognizing(false)
    recognitionRef.current = rec
    return rec
  }

  function startDictation() {
    const rec = ensureRecognition()
    if (!rec) return
    setRecognizing(true)
    rec.start()
  }

  function stopDictation() {
    const rec = recognitionRef.current
    if (!rec) return
    rec.stop()
    setRecognizing(false)
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm">Voice</label>
        <Button variant={enabled ? "default" : "outline"} size="sm" onClick={() => setEnabled((v) => !v)}>
          {enabled ? "On" : "Off"}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={handleTestSpeak} aria-label="Test voice">
          Test
        </Button>
        <Button size="sm" variant="outline" onClick={handleStop} disabled={!speaking} aria-label="Stop speaking">
          Stop
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={recognizing ? "default" : "outline"}
          onClick={recognizing ? stopDictation : startDictation}
          aria-label="Toggle dictation"
        >
          {recognizing ? "Stop Mic" : "Start Mic"}
        </Button>
      </div>
    </div>
  )
}
