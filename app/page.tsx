"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ConnectionStatus } from "@/components/connection-status"
import { ErrorBoundary } from "@/components/error-boundary"
import { hybridChatService, type HybridChatRequest } from "@/lib/hybrid-chat-service"
import { speechRecognitionService, type SpeechRecognitionResult } from "@/lib/speech-recognition"
import { textToSpeechService } from "@/lib/text-to-speech"

interface Message {
  id: string
  content: string
  sender: "user" | "bot"
  timestamp: Date
  model?: string
  responseTime?: number
  source?: "dataset" | "gemini"
  confidence?: number
}

function ChatbotInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [modelType, setModelType] = useState<"basic" | "enhanced">("enhanced")
  const [sessionId, setSessionId] = useState("")
  const [isModelReady, setIsModelReady] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState("")
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [ttsSupported, setTtsSupported] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [useDataset, setUseDataset] = useState(true)
  const [datasetConnected, setDatasetConnected] = useState(false)
  const [geminiConnected, setGeminiConnected] = useState(false)
  const [language, setLanguage] = useState<"en" | "hi" | "te" | "ta">("en")
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string | undefined>(undefined)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSessionId(Math.random().toString(36).substring(7))
    createParticles()
    setMessages([
      {
        id: "1",
        content:
          "Hello! I'm your AI assistant powered by both a trained customer support dataset and Google Gemini. I can help you with customer support queries using my specialized training data, or answer general questions using Gemini AI. You can type your message or use the microphone button to speak. I can also read my responses aloud if you enable voice output. How can I assist you today?",
        sender: "bot",
        timestamp: new Date(),
        source: "dataset",
      },
    ])
    checkHybridConnection()
    setSpeechSupported(speechRecognitionService.isSpeechRecognitionSupported())
    setTtsSupported(textToSpeechService.isTextToSpeechSupported())
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  useEffect(() => {
    if (!ttsSupported) return

    const syncVoices = async () => {
      const list = await textToSpeechService.listVoicesForLanguage(language)
      setAvailableVoices(list)
      // keep prior selection if still available; otherwise pick first
      if (!list.find((v) => v.voiceURI === selectedVoiceUri)) {
        const next = list[0]
        setSelectedVoiceUri(next?.voiceURI)
        if (next) textToSpeechService.setPreferredVoice(language, next.voiceURI)
      }
    }

    // initial attempt
    syncVoices()
    // retry if empty (some browsers load later)
    const t = setTimeout(() => {
      syncVoices()
    }, 500)

    return () => clearTimeout(t)
  }, [language, ttsSupported])

  const checkHybridConnection = async () => {
    try {
      const healthCheck = await hybridChatService.healthCheck()
      const data = healthCheck.data

      setDatasetConnected(data?.dataset_backend || false)
      setGeminiConnected(data?.gemini_api || false)
      setIsConnected(data?.dataset_backend || data?.gemini_api || false)
      setIsModelReady(data?.hybrid_mode || data?.dataset_backend || data?.gemini_api || false)

      if (!data?.dataset_backend && !data?.gemini_api) {
        setError("Neither dataset backend nor Gemini API are available")
      } else {
        setError(null)
      }
    } catch (error) {
      console.error("Failed to check hybrid connection:", error)
      setIsConnected(false)
      setIsModelReady(false)
      setDatasetConnected(false)
      setGeminiConnected(false)
      setError("Failed to connect to chat services")
    }
  }

  const createParticles = () => {
    if (!particlesRef.current) return

    const particleCount = 20
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement("div")
      particle.className = "particle animate-particle-float"
      particle.style.left = Math.random() * 100 + "%"
      particle.style.animationDelay = Math.random() * 15 + "s"
      particle.style.animationDuration = 15 + Math.random() * 10 + "s"
      particlesRef.current.appendChild(particle)
    }
  }

  const refreshConnection = async () => {
    await checkHybridConnection()
  }

  const speakText = (text: string) => {
    if (!ttsEnabled || !ttsSupported) return

    const voice = textToSpeechService.resolveVoiceByUri(selectedVoiceUri)
    textToSpeechService.speak(
      text,
      { rate: 0.95, pitch: 1, volume: 0.9, lang: language, voice },
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      (error) => {
        setError(`Voice output error: ${error}`)
        setIsSpeaking(false)
      },
    )
  }

  const stopSpeaking = () => {
    textToSpeechService.stop()
    setIsSpeaking(false)
  }

  const startListening = async () => {
    if (!speechSupported) {
      setError("Speech recognition is not supported in this browser")
      return
    }

    const hasPermission = await speechRecognitionService.requestMicrophonePermission()
    if (!hasPermission) {
      setError("Microphone permission is required for voice input")
      return
    }

    const success = speechRecognitionService.startListening(
      (result: SpeechRecognitionResult) => {
        if (result.isFinal) {
          setInputMessage(result.transcript)
          setInterimTranscript("")
        } else {
          setInterimTranscript(result.transcript)
        }
      },
      (error: string) => {
        setError(error)
        setIsListening(false)
        setInterimTranscript("")
      },
      () => {
        setIsListening(true)
        setError(null)
      },
      () => {
        setIsListening(false)
        setInterimTranscript("")
      },
      language, // pass current language here
    )

    if (!success) {
      setError("Failed to start speech recognition")
    }
  }

  const stopListening = () => {
    speechRecognitionService.stopListening()
    setIsListening(false)
    setInterimTranscript("")
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    if (!isConnected) {
      setError("Cannot send message: No chat services available")
      return
    }

    const userMessage = inputMessage.trim()
    setInputMessage("")
    setIsLoading(true)
    setError(null)

    addMessage(userMessage, "user")

    try {
      const request: HybridChatRequest = {
        message: userMessage,
        session_id: sessionId,
        use_dataset: useDataset,
        model_type: modelType,
      }

      const response = await hybridChatService.sendMessage(request)

      if (response.status === "success" && response.data) {
        const sourceLabel = response.data.source === "dataset" ? "Dataset AI" : "Gemini Pro"
        addMessage(
          response.data.response,
          "bot",
          response.data.response_time,
          sourceLabel,
          response.data.source,
          response.data.confidence,
        )
        if (ttsEnabled && ttsSupported) {
          speakText(response.data.response)
        }
      } else {
        throw new Error(response.message || "Failed to get response")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send message"
      setError(errorMessage)
      addMessage(`Sorry, I encountered an error: ${errorMessage}`, "bot")
    } finally {
      setIsLoading(false)
    }
  }

  const addMessage = (
    content: string,
    sender: "user" | "bot",
    responseTime?: number,
    model?: string,
    source?: "dataset" | "gemini",
    confidence?: number,
  ) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      sender,
      timestamp: new Date(),
      responseTime,
      model,
      source,
      confidence,
    }
    setMessages((prev) => [...prev, newMessage])
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleConnectionChange = (connected: boolean) => {
    setIsConnected(connected)
    if (!connected) {
      setError("Chat services connection lost")
    } else {
      setError(null)
    }
  }

  const handleVoiceChange = (uri: string) => {
    setSelectedVoiceUri(uri)
    textToSpeechService.setPreferredVoice(language, uri)
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 gradient-background animate-gradient-shift" />
      <div ref={particlesRef} className="fixed inset-0 pointer-events-none" />

      <div className="relative z-10 min-h-screen p-4">
        <div className="max-w-6xl mx-auto">
          <div className="holographic-card rounded-xl p-6 mb-6 animate-float">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center animate-pulse-glow">
                    <span className="text-primary-foreground text-xl">✨</span>
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold font-sans text-foreground">
                    
                      AI Chatbot
                    
                  </h1>
                  <p className="text-muted-foreground">Powered by Dataset AI + Google Gemini - Voice Enabled</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="dark-mode" className="text-foreground">
                    Dark Mode
                  </Label>
                  <Switch id="dark-mode" checked={darkMode} onCheckedChange={setDarkMode} />
                </div>
                <Badge variant={isModelReady ? "default" : "secondary"}>
                  {datasetConnected && geminiConnected
                    ? "Hybrid Ready"
                    : datasetConnected
                      ? "Dataset Ready"
                      : geminiConnected
                        ? "Gemini Ready"
                        : "Not Ready"}
                </Badge>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6 holographic-card">
              <span className="text-destructive">⚠️</span>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <ConnectionStatus onConnectionChange={handleConnectionChange} />

              <Card className="holographic-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-sans text-card-foreground">
                    <span>⚙️</span>
                    Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-card-foreground">AI Model</Label>
                    <Tabs value={modelType} onValueChange={(value) => setModelType(value as "basic" | "enhanced")}>
                      <TabsList className="grid w-full grid-cols-2 bg-muted">
                        <TabsTrigger value="basic" className="text-xs">
                          <span className="mr-1">⚡</span>
                          Basic
                        </TabsTrigger>
                        <TabsTrigger value="enhanced" className="text-xs">
                          <span className="mr-1">🧠</span>
                          Enhanced
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="use-dataset" className="text-sm font-medium text-card-foreground">
                      Prefer Dataset AI
                    </Label>
                    <Switch
                      id="use-dataset"
                      checked={useDataset}
                      onCheckedChange={setUseDataset}
                      disabled={!datasetConnected}
                    />
                  </div>

                  <Separator className="bg-border" />

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-card-foreground">Language</Label>
                    <select
                      aria-label="Response language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as "en" | "hi" | "te" | "ta")}
                      className="w-full rounded-md border border-border bg-transparent p-2 text-sm text-foreground"
                    >
                      <option className="holographic-card" value="en">English (India)</option>
                      <option className="holographic-card" value="hi">हिंदी (India)</option>
                      <option className="holographic-card" value="te">తెలుగు (India)</option>
                      <option className="holographic-card" value="ta">தமிழ் (India)</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Bot replies and voice will use native Indian locale.
                    </p>
                  </div>

                  {ttsSupported && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-card-foreground">Voice (native preferred)</Label>
                      <select
                        aria-label="Voice selection"
                        value={selectedVoiceUri || ""}
                        onChange={(e) => handleVoiceChange(e.target.value)}
                        className="w-full rounded-md border border-border bg-transparent p-2 text-sm text-foreground"
                      >
                        {availableVoices.length === 0 && <option value="">System default</option>}
                        {availableVoices.map((v) => (
                          <option className="holographic-card" key={v.voiceURI} value={v.voiceURI}>
                            {v.name} — {v.lang} {v.localService ? "(local)" : ""}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Voices are provided by your OS/browser. Indian voices (xx-IN) are prioritized.
                      </p>
                    </div>
                  )}

                  <Separator className="bg-border" />

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-card-foreground">Voice Controls</Label>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="tts-enabled" className="text-xs text-muted-foreground">
                        Voice Output
                      </Label>
                      <Switch
                        id="tts-enabled"
                        checked={ttsEnabled}
                        onCheckedChange={setTtsEnabled}
                        disabled={!ttsSupported}
                      />
                    </div>
                    {isSpeaking && (
                      <Button
                        onClick={stopSpeaking}
                        variant="outline"
                        size="sm"
                        className="w-full text-xs bg-transparent"
                      >
                        <span className="mr-1">🔇</span>
                        Stop Speaking
                      </Button>
                    )}
                  </div>

                  <Separator className="bg-border" />

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-card-foreground">Status</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Dataset Backend</span>
                        <Badge variant={datasetConnected ? "default" : "secondary"} className="text-xs">
                          {datasetConnected ? "Connected" : "Disconnected"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Gemini API</span>
                        <Badge variant={geminiConnected ? "default" : "secondary"} className="text-xs">
                          {geminiConnected ? "Connected" : "Disconnected"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Voice Input</span>
                        <Badge variant={speechSupported ? "default" : "secondary"} className="text-xs">
                          {speechSupported ? "Supported" : "Not Supported"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Voice Output</span>
                        <Badge variant={ttsSupported ? "default" : "secondary"} className="text-xs">
                          {ttsSupported ? "Supported" : "Not Supported"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={refreshConnection}
                    disabled={!isConnected}
                    className="w-full animate-pulse-glow"
                    size="sm"
                  >
                    Refresh Connection
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3">
              <Card className="holographic-card h-[1025px] flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <CardTitle className="flex items-center gap-2 font-sans text-card-foreground">
                    <span>💬</span>
                    Chat Interface
                    <Badge variant="outline" className="ml-auto border-border">
                      {datasetConnected && geminiConnected
                        ? "Hybrid Mode"
                        : datasetConnected
                          ? "Dataset AI"
                          : geminiConnected
                            ? "Gemini Pro"
                            : "Offline"}
                    </Badge>
                    {isSpeaking && (
                      <Badge variant="secondary" className="animate-pulse">
                        <span className="mr-1">🔊</span>
                        Speaking
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex-1 min-h-0 flex flex-col p-0">
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                        >
                          {message.sender === "bot" && (
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 animate-pulse-glow">
                              <span className="text-primary-foreground">🤖</span>
                            </div>
                          )}

                          <div className={`max-w-[80%] ${message.sender === "user" ? "order-first" : ""}`}>
                            <div
                              className={`p-3 rounded-lg ${
                                message.sender === "user"
                                  ? "bg-primary text-primary-foreground ml-auto"
                                  : "holographic-card text-card-foreground"
                              }`}
                            >
                              <p className="text-sm leading-relaxed">{message.content}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {message.responseTime && (
                                  <span className="text-xs opacity-70">Response: {message.responseTime}s</span>
                                )}
                                {message.source && (
                                  <Badge variant="outline" className="text-xs opacity-70">
                                    {message.source === "dataset" ? "📚 Dataset" : "🧠 Gemini"}
                                  </Badge>
                                )}
                                {message.confidence && (
                                  <span className="text-xs opacity-70">
                                    Confidence: {Math.round(message.confidence * 100)}%
                                  </span>
                                )}
                              </div>
                              {message.sender === "bot" && ttsSupported && (
                                <Button
                                  onClick={() => speakText(message.content)}
                                  variant="ghost"
                                  size="sm"
                                  className="mt-2 h-6 px-2 text-xs opacity-70 hover:opacity-100"
                                  disabled={isSpeaking}
                                >
                                  <span className="mr-1">🔊</span>
                                  Replay
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 px-3">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>

                          {message.sender === "user" && (
                            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-secondary-foreground">👤</span>
                            </div>
                          )}
                        </div>
                      ))}

                      {isLoading && (
                        <div className="flex gap-3 justify-start">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center animate-pulse-glow">
                            <span className="text-primary-foreground">🤖</span>
                          </div>
                          <div className="holographic-card p-3 rounded-lg">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                              <div
                                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                                style={{ animationDelay: "0.1s" }}
                              />
                              <div
                                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                                style={{ animationDelay: "0.2s" }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                  <div className="p-4 border-t border-border">
                    {interimTranscript && (
                      <div className="mb-2 p-2 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground italic">Listening: {interimTranscript}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={
                          isConnected ? "Type your message or use voice input..." : "Chat services not connected..."
                        }
                        disabled={isLoading || !isConnected}
                        className="flex-1 holographic-card border-0 text-foreground placeholder:text-muted-foreground"
                      />
                      {speechSupported && (
                        <Button
                          onClick={isListening ? stopListening : startListening}
                          disabled={isLoading || !isConnected}
                          variant={isListening ? "destructive" : "secondary"}
                          className={isListening ? "animate-pulse" : ""}
                        >
                          <span>{isListening ? "🔴" : "🎤"}</span>
                        </Button>
                      )}
                      <Button
                        onClick={sendMessage}
                        disabled={isLoading || !inputMessage.trim() || !isConnected}
                        className="animate-pulse-glow"
                      >
                        <span>➤</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <ErrorBoundary>
      <ChatbotInterface />
    </ErrorBoundary>
  )
}
