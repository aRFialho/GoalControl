import confetti from "canvas-confetti";

const palette = ["#FF5A36", "#F8A015", "#6AD154", "#2EC9D6", "#17324D"];

export function launchSaleConfetti() {
  confetti({
    particleCount: 95,
    spread: 80,
    startVelocity: 42,
    gravity: 1.15,
    origin: { y: 0.7 },
    colors: palette
  });
}

export function launchExtremeCelebration() {
  const duration = 2400;
  const end = Date.now() + duration;
  const defaults: confetti.Options = {
    startVelocity: 48,
    spread: 360,
    ticks: 90,
    zIndex: 9999,
    colors: palette
  };

  const interval = window.setInterval(() => {
    const remaining = end - Date.now();
    if (remaining <= 0) {
      window.clearInterval(interval);
      return;
    }

    const particleCount = Math.floor(110 * (remaining / duration));

    confetti({
      ...defaults,
      particleCount,
      origin: { x: Math.random() * 0.2 + 0.1, y: Math.random() * 0.5 + 0.1 }
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: Math.random() * 0.2 + 0.7, y: Math.random() * 0.5 + 0.1 }
    });
  }, 280);
}

