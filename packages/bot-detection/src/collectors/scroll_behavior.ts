const COLLECTION_WINDOW_MS = 500;

export function getScrollBehavior(): Promise<
  { timestamp: number; scrollY: number }[]
> {
  if (typeof window === 'undefined') {
    return Promise.resolve([]);
  }

  return new Promise((resolve) => {
    const events: { timestamp: number; scrollY: number }[] = [];

    const handler = () => {
      events.push({
        timestamp: Date.now(),
        scrollY: window.scrollY,
      });
    };

    window.addEventListener('scroll', handler);

    setTimeout(() => {
      window.removeEventListener('scroll', handler);
      resolve(events);
    }, COLLECTION_WINDOW_MS);
  });
}
