"use client"

import { useState, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react"
import { hybridChatService } from "@/lib/hybrid-chat-service"

interface ConnectionStatusProps {
  onConnectionChange?: (connected: boolean) => void
}

export function ConnectionStatus({ onConnectionChange }: ConnectionStatusProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [datasetConnected, setDatasetConnected] = useState<boolean>(false)
  const [geminiConnected, setGeminiConnected] = useState<boolean>(false)

  const lastHealthCheckRef = useRef<{ result: any; timestamp: number } | null>(null)
  const lastGoodRef = useRef<{ result: any; timestamp: number } | null>(null)
  const consecutiveFailuresRef = useRef(0)

  const CACHE_DURATION = 60000 // 1 minute cache
  const POLL_INTERVAL = 120000 // Check every 2 minutes instead of 30 seconds
  const FAIL_THRESHOLD = 2 // require 2 consecutive failures before marking Offline

  const checkConnection = async (forceRefresh = false) => {
    if (!forceRefresh && lastHealthCheckRef.current) {
      const { result, timestamp } = lastHealthCheckRef.current
      if (Date.now() - timestamp < CACHE_DURATION) {
        console.log("[v0] Using cached connection status")
        updateConnectionState(result)
        return
      }
    }

    setIsChecking(true)
    setError(null)

    try {
      console.log("[v0] === CONNECTION STATUS CHECK ===")
      console.log("[v0] Checking hybrid chat service health...")

      const healthCheck = await hybridChatService.healthCheck()
      const data = healthCheck.data

      lastHealthCheckRef.current = {
        result: data,
        timestamp: Date.now(),
      }

      updateConnectionState(data)
    } catch (err) {
      console.error("[v0] Connection check failed:", err)
      setIsConnected(false)
      setDatasetConnected(false)
      setGeminiConnected(false)
      setError(err instanceof Error ? err.message : "Connection test failed")
      onConnectionChange?.(false)
    } finally {
      setIsChecking(false)
    }
  }

  const updateConnectionState = (data: any) => {
    console.log("[v0] Health check result:", data)
    console.log("[v0] Dataset connected:", data?.dataset_backend)
    console.log("[v0] Gemini connected:", data?.gemini_api)

    const anyUp = Boolean(data?.dataset_backend || data?.gemini_api)

    if (anyUp) {
      consecutiveFailuresRef.current = 0
      lastGoodRef.current = { result: data, timestamp: Date.now() }
      setDatasetConnected(Boolean(data?.dataset_backend))
      setGeminiConnected(Boolean(data?.gemini_api))
      setIsConnected(true)
    } else {
      consecutiveFailuresRef.current += 1
      const canUseLastGood = lastGoodRef.current && Date.now() - lastGoodRef.current.timestamp < 5 * 60 * 1000 // 5 min grace

      if (consecutiveFailuresRef.current < FAIL_THRESHOLD && canUseLastGood) {
        const last = lastGoodRef.current!.result
        setDatasetConnected(Boolean(last?.dataset_backend))
        setGeminiConnected(Boolean(last?.gemini_api))
        setIsConnected(Boolean(last?.dataset_backend || last?.gemini_api))
      } else {
        setDatasetConnected(false)
        setGeminiConnected(false)
        setIsConnected(false)
      }
    }

    setLastChecked(new Date())

    if (!data?.dataset_backend && !data?.gemini_api && consecutiveFailuresRef.current >= FAIL_THRESHOLD) {
      setError("❌ Neither dataset backend nor Gemini API are available. Check your API key!")
    } else {
      setError(null)
    }

    onConnectionChange?.(Boolean(data?.dataset_backend || data?.gemini_api))
  }

  useEffect(() => {
    checkConnection()

    const interval = setInterval(() => checkConnection(), POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  const handleManualRefresh = () => {
    checkConnection(true)
  }

  const getStatusColor = () => {
    if (isConnected === null) return "secondary"
    return isConnected ? "default" : "destructive"
  }

  const getStatusIcon = () => {
    if (isChecking) return <RefreshCw className="w-4 h-4 animate-spin" />
    if (isConnected === null) return <AlertTriangle className="w-4 h-4" />
    return isConnected ? <CheckCircle className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />
  }

  const getStatusText = () => {
    if (isChecking) return "Checking..."
    if (isConnected === null) return "Unknown"
    if (datasetConnected && geminiConnected) return "Hybrid Ready"
    if (datasetConnected) return "Dataset Only"
    if (geminiConnected) return "Gemini Only"
    return "Disconnected"
  }

  return (
    <Card className="holographic-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wifi className="w-4 h-4" />
          Service Status
          <Button variant="ghost" size="sm" onClick={handleManualRefresh} disabled={isChecking} className="ml-auto">
            <RefreshCw className={`w-3 h-3 ${isChecking ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant={getStatusColor()} className="flex items-center gap-1">
            {getStatusIcon()}
            {getStatusText()}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isChecking}>
            <RefreshCw className={`w-3 h-3 ${isChecking ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Dataset Backend:</span>
            <Badge variant={datasetConnected ? "default" : "secondary"} className="text-xs">
              {datasetConnected ? "Connected" : "Offline"}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Gemini API:</span>
            <Badge variant={geminiConnected ? "default" : "secondary"} className="text-xs">
              {geminiConnected ? "Connected" : "Offline"}
            </Badge>
          </div>
        </div>

        {lastChecked && (
          <p className="text-xs text-muted-foreground">Last checked: {lastChecked.toLocaleTimeString()}</p>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {!datasetConnected && !geminiConnected && !isChecking && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Add your Gemini API key in Project Settings → Environment Variables as GEMINI_API_KEY to enable Gemini AI
              responses. You can create a key at aistudio.google.com.
            </AlertDescription>
          </Alert>
        )}

        {!geminiConnected && datasetConnected && !isChecking && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Gemini connection issue detected. Ensure a valid GEMINI_API_KEY is set in Project Settings → Environment
              Variables (keys from aistudio.google.com typically start with "AIzaSy").
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
