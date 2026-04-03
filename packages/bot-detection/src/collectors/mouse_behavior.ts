const COLLECTION_WINDOW_MS = 500;

export function getMouseBehavior(): Promise<
  { timestamp: number; x: number; y: number }[]
> {
  if (typeof document === 'undefined') {
    return Promise.resolve([]);
  }

  return new Promise((resolve) => {
    const events: { timestamp: number; x: number; y: number }[] = [];

    const handler = (event: MouseEvent) => {
      events.push({
        timestamp: Date.now(),
        x: event.clientX,
        y: event.clientY,
      });
    };

    document.addEventListener('mousemove', handler);

    setTimeout(() => {
      document.removeEventListener('mousemove', handler);
      resolve(events);
    }, COLLECTION_WINDOW_MS);
  });
}
