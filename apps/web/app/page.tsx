'use client'

import { load } from '@cwl-botd/bot-detection'
import { useEffect, useState } from 'react'

export default function Home() {
  const [logs, setLogs] = useState<any>({})

  useEffect(() => {
    async function test() {
      const state = await load()
      setLogs(state)
    }
    test()
  }, [])

  return (
    <div className="flex flex-col p-10">
      <h1 className="text-3xl font-bold">Bot Detection</h1>
      <div className="space-y-2 mt-6">
        <h2 className="text-xl font-semibold">Logs</h2>
        <div className="bg-slate-600 p-2 rounded-md">
          <p className="text-white text-lg">Collected Data</p>
          <pre className="text-white text-sm overflow-auto">{JSON.stringify(logs.components, null, 2)}</pre>
        </div>
      </div>
    </div>
  )
}
