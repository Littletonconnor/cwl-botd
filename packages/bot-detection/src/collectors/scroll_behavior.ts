export function getScrollBehavior() {
  let scrollEvents: {
    timestamp: number;
    scrollY: number;
  }[] = [];

  window.addEventListener('scroll', (e) => {
    scrollEvents.push({
      timestamp: Date.now(),
      scrollY: window.scrollY,
    });
  });

  return scrollEvents;
}
