'use client'

import { useState, useEffect, useRef } from 'react'
import clsx from 'clsx'

type ChatLog = {
  id: string
  prompt: string
  temperature: number
  system: string
  response: string
  timestamp: number
}

type CustomPreset = {
  id: string
  name: string
  temperature: number
  system: string
}

function groupLogsByDate(logs: ChatLog[]) {
  return logs.reduce((acc: Record<string, ChatLog[]>, log) => {
    const date = new Date(log.timestamp).toLocaleDateString()
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(log)
    return acc
  }, {})
}

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [temperature, setTemperature] = useState(1.0)
  const [systemPrompt, setSystemPrompt] = useState('あなたは創造的なアシスタントです。')
  const [searchQuery, setSearchQuery] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<ChatLog[]>([])
  const [selectedMode, setSelectedMode] = useState('default')
  const [autoScroll, setAutoScroll] = useState(true)
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([])
  const [newPresetName, setNewPresetName] = useState('')
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null)
  const [newPresetSystem, setNewPresetSystem] = useState('')
  const [newPresetTemp, setNewPresetTemp] = useState(1.0)


  const outputRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output, autoScroll])

  useEffect(() => {
    const stored = localStorage.getItem('chatLogs')
    if (stored) {
      const parsed: ChatLog[] = JSON.parse(stored)
      setLogs(parsed)
      const expanded = Object.fromEntries(parsed.map((log) => [log.id, false]))
      setExpandedLogs(expanded)
    }
    const savedPresets = localStorage.getItem('customPresets')
    if (savedPresets) {
      setCustomPresets(JSON.parse(savedPresets))
    }
  }, [])

  const saveLog = (response: string) => {
    const newLog: ChatLog = {
      id: crypto.randomUUID(),
      prompt,
      temperature,
      system: systemPrompt,
      response,
      timestamp: Date.now(),
    }
    const updatedLogs = [newLog, ...logs]
    setLogs(updatedLogs)
    localStorage.setItem('chatLogs', JSON.stringify(updatedLogs))
    setExpandedLogs((prev) => ({ ...prev, [newLog.id]: false }))
  }

  const deleteLog = (id: string) => {
    const updated = logs.filter((log) => log.id !== id)
    setLogs(updated)
    localStorage.setItem('chatLogs', JSON.stringify(updated))
  }

  const presets = {
    default: {
      label: 'ノーマル 🧠',
      temperature: 1.0,
      system: 'あなたは創造的なアシスタントです。',
    },
    logical: {
      label: '論理官（低温）🧊',
      temperature: 0.3,
      system: 'あなたは論理的な判断を優先する厳格なAIです。',
    },
    poet: {
      label: '詩人（高温）🔥',
      temperature: 1.7,
      system: 'あなたは詩的かつ感情豊かな創作を得意とするAIです。',
    },
    chaos: {
      label: '壊れGPT（超高温）💥',
      temperature: 2.0,
      system: 'あなたは理性を捨てた無限の混沌から生まれたGPTです。',
    },
    custom: {
      label: 'カスタム ✏️',
      temperature: 1.0,
      system: '',
    },
  }

  const handleResend = (log: ChatLog) => {
    setPrompt(log.prompt)
    setTemperature(log.temperature)
    setSystemPrompt(log.system)
    setSelectedMode('custom')
    handleSubmit()
  }

  const handleExportLogs = () => {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    a.href = url
    a.download = `chatlogs_${dateStr}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportLogs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const imported: ChatLog[] = JSON.parse(ev.target?.result as string)
        const merged = [...imported, ...logs]
        setLogs(merged)
        localStorage.setItem('chatLogs', JSON.stringify(merged))
        const expanded = Object.fromEntries(merged.map((log) => [log.id, false]))
        setExpandedLogs(expanded)
        alert(`${imported.length}件のログをインポートしました！`)
      } catch (err) {
        alert('読み込みに失敗しました：無効なフォーマットです')
      }
      if (e.target) e.target.value = ''
    }
    reader.readAsText(file)
  }

  const handleSubmit = async () => {
    setOutput('')
    setLoading(true)

    const res = await fetch('/api/gateway', {
      method: 'POST',
      body: JSON.stringify({ prompt, temperature, system: systemPrompt }),
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

  const handleAddOrUpdateCustomPreset = () => {
    if (editingPresetId) {
      const updated = customPresets.map((p) =>
        p.id === editingPresetId ? {
          ...p,
          name: newPresetName,
          system: newPresetSystem,
          temperature: newPresetTemp,
        } : p
      )
      setCustomPresets(updated)
      localStorage.setItem('customPresets', JSON.stringify(updated))
      setEditingPresetId(null)
    } else {
      const newPreset: CustomPreset = {
        id: crypto.randomUUID(),
        name: newPresetName,
        temperature: newPresetTemp,
        system: newPresetSystem,
      }
      const updatedPresets = [...customPresets, newPreset]
      setCustomPresets(updatedPresets)
      localStorage.setItem('customPresets', JSON.stringify(updatedPresets))
    }

    setNewPresetName('')
    setNewPresetSystem('')
    setNewPresetTemp(1.0)
  }

  const handleDeleteCustomPreset = (id: string) => {
    const updated = customPresets.filter(p => p.id !== id)
    setCustomPresets(updated)
    localStorage.setItem('customPresets', JSON.stringify(updated))
  }


  const filteredLogs = logs.filter(
    (log) =>
      log.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.response.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const groupedLogs = groupLogsByDate(filteredLogs)

  return (
    <main style={{ padding: 40 }}>
      <h1>🌡️ 温度可変 GPT プロキシ</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: '1rem', flexWrap: 'wrap' }}>
        {Object.entries(presets).map(([key, val]) => (
          <button
            key={key}
            className={clsx('px-4 py-2 rounded border', {
              'bg-blue-200 border-blue-500': selectedMode === key,
              'bg-white border-gray-300': selectedMode !== key,
            })}
            onClick={() => {
              setSelectedMode(key)
              setTemperature(val.temperature)
              setSystemPrompt(val.system)
            }}
          >
            {val.label}
          </button>
        ))}

        {customPresets.map((preset) => (
          <div key={preset.id} className="flex items-center gap-2">
            <button
              className={clsx('px-4 py-2 rounded border', {
                'bg-blue-200 border-blue-500': selectedMode === preset.id,
                'bg-white border-gray-300': selectedMode !== preset.id,
              })}
              onClick={() => {
                setSelectedMode(preset.id)
                setTemperature(preset.temperature)
                setSystemPrompt(preset.system)
              }}
            >
              {preset.name} 🌟
            </button>
            <button
              onClick={() => {
                setEditingPresetId(preset.id)
                setNewPresetName(preset.name)
                setNewPresetSystem(preset.system)
                setNewPresetTemp(preset.temperature)
              }}
            >✏️</button>
            <button onClick={() => handleDeleteCustomPreset(preset.id)}>🗑</button>
          </div>
        ))}
      </div>

      <div className="mb-4 p-4 border rounded">
        <h3>🧪 カスタムモード作成</h3>
        <input
          type="text"
          placeholder="モード名"
          value={newPresetName}
          onChange={(e) => setNewPresetName(e.target.value)}
          className="block mb-2 w-full border p-2"
        />
        <textarea
          rows={2}
          placeholder="System Prompt"
          value={newPresetSystem}
          onChange={(e) => setNewPresetSystem(e.target.value)}
          className="block mb-2 w-full border p-2"
        />
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={newPresetTemp}
          onChange={(e) => setNewPresetTemp(parseFloat(e.target.value))}
          className="block mb-2 w-full"
        />
        <button
          onClick={handleAddOrUpdateCustomPreset}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          {editingPresetId ? '💾 保存' : '＋追加'}
        </button>
      </div>

      <div className="relative mb-4">
        <textarea
          rows={4}
          className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="例：未来の教育についてどう思いますか？"
        />
        <span className="absolute bottom-2 right-3 text-sm text-gray-400">
          {prompt.length}文字
        </span>
      </div>
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
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">💬 出力</h2>
        <div className="flex items-center justify-between mb-4">
          <input
            type="text"
            placeholder="ログを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <button
            onClick={handleExportLogs}
            className="ml-2 text-sm text-green-600 hover:underline"
          >
            📦 ログをエクスポート
          </button>
          <label className="ml-2 text-sm text-blue-600 hover:underline cursor-pointer">
            📂 ログをインポート
            <input
              type="file"
              accept="application/json"
              onChange={handleImportLogs}
              className="hidden"
            />
          </label>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(output)}
          className="text-sm text-blue-500 hover:underline"
        >
          📋 コピー
        </button>
      </div>
      <div className="mb-2">
        <label className="text-sm">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={() => setAutoScroll(!autoScroll)}
            className="mr-2"
          />
          出力に自動スクロール
        </label>
      </div>
      <pre
        className="whitespace-pre-wrap p-4 bg-gray-100 rounded-lg max-h-60 overflow-auto"
        ref={outputRef}
      >
        {output}
        {loading && <span className="animate-pulse">...</span>}
      </pre>

      <hr style={{ margin: '3rem 0' }} />
      <h2>🕒 出力ログ</h2>
      <ul>


        {Object.entries(groupedLogs).map(([date, logs]) => (
          <div key={date} className="mb-6">
            <h3 className="text-md font-bold mb-2">{date}</h3>
            <ul>
              {logs.map((log) => (
                <li key={log.id} style={{ marginBottom: '1rem' }}>
                  <div className="flex justify-between items-center">
                    <strong>{new Date(log.timestamp).toLocaleString()}</strong>
                    <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 rounded">
                      T: {log.temperature.toFixed(1)}
                    </span>
                    <div>
                      <button
                        className="text-sm text-blue-500 mr-2"
                        onClick={() =>
                          setExpandedLogs((prev) => ({ ...prev, [log.id]: !prev[log.id] }))
                        }
                      >
                        {expandedLogs[log.id] ? '▲ 閉じる' : '▼ 展開'}
                      </button>
                      <button
                        className="text-sm text-red-500"
                        onClick={() => deleteLog(log.id)}
                      >
                        🗑 削除
                      </button>
                    </div>
                  </div>

                  {expandedLogs[log.id] && (
                    <div className="mt-2">
                      <em>Prompt:</em> {log.prompt}<br />
                      <button
                        className="text-xs text-blue-400 hover:underline ml-2"
                        onClick={() => setPrompt(log.prompt)}
                      >
                        📋 Promptをセット
                      </button>
                      <em>T:</em> {log.temperature}<br />
                      <em>System:</em> {log.system}<br />
                      <em>Response:</em><br />
                      <pre style={{ whiteSpace: 'pre-wrap' }}>{log.response}</pre>
                      <button
                        className="text-sm text-green-500 mt-2"
                        onClick={() => handleResend(log)}
                      >
                        🔁 再送信
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </ul>
    </main>
  )
}