'use client'

import { useState, useEffect } from 'react'

type ChatLog = {
  id: string
  prompt: string
  temperature: number
  system: string
  response: string
  timestamp: number
}

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [temperature, setTemperature] = useState(1.0)
  const [modeType, setModeType] = useState<'preset' | 'custom'>('preset')
  const [systemPrompt, setSystemPrompt] = useState('あなたは創造的なアシスタントです。')
  const [customSystemPrompt, setCustomSystemPrompt] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<ChatLog[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('chatLogs')
    if (stored) {
      setLogs(JSON.parse(stored))
    }
  }, [])

  const saveLog = (response: string) => {
    const system = modeType === 'custom' ? customSystemPrompt : systemPrompt
    const newLog: ChatLog = {
      id: crypto.randomUUID(),
      prompt,
      temperature,
      system,
      response,
      timestamp: Date.now(),
    }
    const updatedLogs = [newLog, ...logs]
    setLogs(updatedLogs)
    localStorage.setItem('chatLogs', JSON.stringify(updatedLogs))
  }

  const presets = {
    default: {
      label: 'ノーマル',
      temperature: 1.0,
      system: 'あなたは創造的なアシスタントです。',
    },
    logical: {
      label: '論理官（低温）',
      temperature: 0.3,
      system: 'あなたは論理的な判断を優先する厳格なAIです。',
    },
    poet: {
      label: '詩人（高温）',
      temperature: 1.7,
      system: 'あなたは詩的かつ感情豊かな創作を得意とするAIです。',
    },
    chaos: {
      label: '壊れGPT（超高温）',
      temperature: 2.0,
      system: 'あなたは理性を捨てた無限の混沌から生まれたGPTです。',
    },
  }

  const handleSubmit = async () => {
    setOutput('')
    setLoading(true)

    const effectiveSystemPrompt = modeType === 'custom' ? customSystemPrompt : systemPrompt

    const res = await fetch('/api/gateway', {
      method: 'POST',
      body: JSON.stringify({ prompt, temperature, system: effectiveSystemPrompt }),
      headers: { 'Content-Type': 'application/json' },
    })

    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    let finalOutput = ''

    while (true) {
      const { done, value } = await reader!.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(line => line.startsWith('data:'))

      for (const line of lines) {
        const jsonStr = line.replace(/^data:\s*/, '').trim()
        if (jsonStr === '[DONE]') continue

        try {
          const parsed = JSON.parse(jsonStr)
          const content = parsed.choices?.[0]?.delta?.content || ''
          finalOutput += content
          setOutput(prev => prev + content)
        } catch (err) {
          console.warn('Failed to parse chunk:', jsonStr)
        }
      }
    }

    setLoading(false)
    saveLog(finalOutput)
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>🌡️ 温度可変 GPT プロキシ</h1>
      <textarea
        rows={4}
        cols={60}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="プロンプトを入力"
        style={{ display: 'block', marginBottom: '1rem' }}
      />

      <fieldset style={{ marginBottom: '1rem' }}>
        <legend>🧠 人格プロンプトの選択：</legend>
        <label>
          <input
            type="radio"
            name="modeType"
            value="preset"
            checked={modeType === 'preset'}
            onChange={() => setModeType('preset')}
          /> プリセット
        </label>
        <label style={{ marginLeft: '1rem' }}>
          <input
            type="radio"
            name="modeType"
            value="custom"
            checked={modeType === 'custom'}
            onChange={() => setModeType('custom')}
          /> カスタム入力
        </label>
      </fieldset>

      {modeType === 'preset' ? (
        <select
          onChange={(e) => {
            const preset = presets[e.target.value as keyof typeof presets]
            setTemperature(preset.temperature)
            setSystemPrompt(preset.system)
          }}
          style={{ display: 'block', marginBottom: '1rem' }}
        >
          {Object.entries(presets).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      ) : (
        <textarea
          rows={3}
          cols={60}
          value={customSystemPrompt}
          onChange={(e) => setCustomSystemPrompt(e.target.value)}
          placeholder="カスタムの人格プロンプトを入力"
          style={{ display: 'block', marginBottom: '1rem' }}
        />
      )}

      <label>
        Temperature: {temperature.toFixed(1)}
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          style={{ display: 'block', width: '100%' }}
        />
      </label>

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? '送信中...' : '送信'}
      </button>

      <pre style={{ whiteSpace: 'pre-wrap', marginTop: '2rem' }}>{output}</pre>

      <hr style={{ margin: '3rem 0' }} />
      <h2>🕒 出力ログ</h2>
      <ul>
        {logs.map((log) => (
          <li key={log.id} style={{ marginBottom: '1rem' }}>
            <strong>{new Date(log.timestamp).toLocaleString()}</strong><br />
            <em>Prompt:</em> {log.prompt}<br />
            <em>T:</em> {log.temperature}<br />
            <em>System:</em> {log.system}<br />
            <em>Response:</em><br />
            <pre style={{ whiteSpace: 'pre-wrap' }}>{log.response}</pre>
          </li>
        ))}
      </ul>
    </main>
  )
}