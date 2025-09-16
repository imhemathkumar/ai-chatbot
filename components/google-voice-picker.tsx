"use client"

import { useEffect, useMemo } from "react"
import useSWR from "swr"
import { type GoogleVoice, toIndianLocale } from "@/lib/google-tts"

type Props = {
  language: "en-IN" | "hi-IN" | "te-IN" | "ta-IN" | string
  value?: string // selected Google voice name
  onChange?: (voiceName: string | undefined) => void
  className?: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function GoogleVoicePicker({ language, value, onChange, className }: Props) {
  const lang = toIndianLocale(language)
  const { data, isLoading, error, mutate } = useSWR<{ voices: GoogleVoice[] }>(
    `/api/tts/google/voices?languageCode=${encodeURIComponent(lang)}`,
    fetcher,
    { revalidateOnFocus: false },
  )

  // Only show picker for languages where Google provides native Indian voices (Telugu/Tamil, also works for hi-IN/en-IN)
  const showPicker = useMemo(() => ["te-IN", "ta-IN", "hi-IN", "en-IN"].includes(lang), [lang])

  const voices = data?.voices || []

  useEffect(() => {
    // Revalidate when language changes
    mutate()
  }, [lang, mutate])

  if (!showPicker) return null

  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-1">Google Voice (native preferred)</label>
      <select
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value || undefined)}
        className="w-full border rounded px-2 py-1 text-sm"
      >
        <option value="">{voices.length ? "Auto (Google best)" : "No Google voices found"}</option>
        {voices.map((v) => (
          <option key={v.name} value={v.name}>
            {v.name} · {v.ssmlGender || "NEUTRAL"}
          </option>
        ))}
      </select>
      {isLoading ? <p className="text-xs text-muted-foreground mt-1">Loading voices…</p> : null}
      {error ? (
        <p className="text-xs text-red-500 mt-1">Could not load Google voices. Check GOOGLE_TTS_API_KEY.</p>
      ) : null}
    </div>
  )
}
