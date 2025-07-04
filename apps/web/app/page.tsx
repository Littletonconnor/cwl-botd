'use client';

import { load } from '@cwl-botd/bot-detection';
import { useEffect, useState } from 'react';
import BotDetector from '../../../packages/bot-detection/src/detector';

interface BotDState {
  collections: any;
  detections: any;
}

export default function Home() {
  const [state, onUpdate] = useBotDetection();

  return (
    <div className="flex flex-col p-10">
      <h1 className="text-3xl font-bold">Bot Detection</h1>
      <div className="space-y-2 mt-6">
        <div className="flex justify-between">
          <h2 className="text-xl font-semibold">Logs</h2>
          <button onClick={onUpdate} className="cursor-pointer py-2 px-3 rounded-sm  bg-slate-600 text-white">
            Click
          </button>
        </div>
        <div className="bg-slate-600 p-2 rounded-md">
          <pre className="text-white text-sm overflow-auto">{JSON.stringify(state.collections, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}

export function useBotDetection(): [BotDState, () => void] {
  const [botD, setBotD] = useState<BotDetector>();
  const [state, setState] = useState<BotDState | object>({});
  const [update, setUpdate] = useState(0);

  const onUpdate = () => setUpdate((s) => s + 1);

  useEffect(() => {
    async function init() {
      const detector = await load();
      const collections = detector.getCollections();
      const detections = detector.getDetections();

      setBotD(detector);
      setState({
        collections,
        detections,
      });
    }

    init();
  }, []);

  useEffect(() => {
    const collections = botD?.getCollections();
    const detections = botD?.getDetections();

    setState({
      collections,
      detections,
    });
  }, [update]);

  return [state as BotDState, onUpdate];
}
