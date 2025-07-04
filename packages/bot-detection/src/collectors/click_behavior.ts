export function getClickBehavior() {
  const clickEvents: {
    timestamp: number;
    x: number;
    y: number;
    target: string | null;
  }[] = [];

  document.addEventListener('click', (event) => {
    clickEvents.push({
      timestamp: Date.now(),
      x: event.clientX,
      y: event.clientY,
      target: event.target instanceof Element ? event.target.tagName : null,
    });
  });

  return clickEvents;
}
