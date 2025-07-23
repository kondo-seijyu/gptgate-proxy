'use client'

import { useState } from 'react'

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [temperature, setTemperature] = useState(1.0)
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setOutput('')
    setLoading(true)

    const res = await fetch('/api/gateway', {
      method: 'POST',
      body: JSON.stringify({ prompt, temperature }),
      headers: { 'Content-Type': 'application/json' },
    })

    const reader = res.body?.getReader()
    const decoder = new TextDecoder()

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
          setOutput(prev => prev + content)
        } catch (err) {
          console.warn('Failed to parse chunk:', jsonStr)
        }
      }
    }

    setLoading(false)
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
    </main>
  )
}