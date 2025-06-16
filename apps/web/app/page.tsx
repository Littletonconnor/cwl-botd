'use client';

import { load } from '@cwl-botd/bot-detection';
import { useEffect, useState } from 'react';

interface BotDState {
  collections: any;
  detections: any;
}

export default function Home() {
  const state: BotDState = useBotDetection();

  return (
    <div className="flex flex-col p-10">
      <h1 className="text-3xl font-bold">Bot Detection</h1>
      <div className="space-y-2 mt-6">
        <h2 className="text-xl font-semibold">Logs</h2>
        <div className="bg-slate-600 p-2 rounded-md">
          <p className="text-white text-lg">Collected Data</p>
          <pre className="text-white text-sm overflow-auto">{JSON.stringify(state.collections, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}

export function useBotDetection(): BotDState {
  const [state, setState] = useState<BotDState | object>({});

  useEffect(() => {
    async function init() {
      const detector = await load();
      const collections = detector.getCollections();
      const detections = detector.getDetections();

      setState({
        collections,
        detections,
      });
    }

    init();
  }, []);

  return state as BotDState;
}
