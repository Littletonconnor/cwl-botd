export function getMouseBehavior() {
  let mouseEvents: {
    timestamp: number;
    x: number;
    y: number;
  }[] = [];

  document.addEventListener('mousemove', (event) => {
    mouseEvents.push({
      timestamp: Date.now(),
      x: event.clientX,
      y: event.clientY,
    });
  });

  return mouseEvents;
}
