(() => {
  const root = document.documentElement;
  const themeButton = document.getElementById('personal-theme-toggle');
  const navButton = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-personal-nav]');
  const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)');

  const setTheme = (theme, persist = false) => {
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }

    if (persist) localStorage.setItem('theme', theme);
    document.dispatchEvent(new CustomEvent('personal-theme-change'));
  };

  const storedTheme = localStorage.getItem('theme');
  setTheme(storedTheme || (preferredTheme.matches ? 'dark' : 'light'));

  if (themeButton) {
    themeButton.addEventListener('click', () => {
      const nextTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setTheme(nextTheme, true);
    });
  }

  preferredTheme.addEventListener('change', (event) => {
    if (!localStorage.getItem('theme')) setTheme(event.matches ? 'dark' : 'light');
  });

  if (navButton && nav) {
    navButton.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      navButton.setAttribute('aria-expanded', String(isOpen));
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('is-open');
        navButton.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const motionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('[data-elastic-field]').forEach((field) => {
    const canvas = field.querySelector('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    const sources = [];
    const maximumSources = 8;
    const pulseDuration = 450;
    let width = 0;
    let height = 0;
    let frame = 0;

    const resize = () => {
      const bounds = field.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.floor(bounds.width));
      height = Math.max(1, Math.floor(bounds.height));
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      draw(performance.now());
    };

    const placeSource = (event) => {
      const bounds = canvas.getBoundingClientRect();
      sources.push({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
        createdAt: performance.now()
      });
      if (sources.length > maximumSources) sources.shift();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      draw(performance.now());
    };

    const draw = (time) => {
      const dark = root.getAttribute('data-theme') === 'dark';
      const line = dark ? 'rgba(150, 207, 194, 0.38)' : 'rgba(18, 100, 94, 0.30)';
      const softLine = dark ? 'rgba(150, 207, 194, 0.15)' : 'rgba(18, 100, 94, 0.12)';
      const background = dark ? '#1d2929' : '#f5f8f7';
      const spacing = Math.max(16, Math.min(22, width / 24));
      const margin = spacing * 1.5;

      context.clearRect(0, 0, width, height);
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      const displacementAt = (x, y, axis) => {
        return sources.reduce((offset, source) => {
          const dx = x - source.x;
          const dy = y - source.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const softenedDistance = Math.sqrt(dx * dx + dy * dy + 1600);
          const influence = Math.exp(-(distance * distance) / 24000);
          const direction = axis === 'x' ? dx / softenedDistance : dy / softenedDistance;
          const settled = direction * influence * 9;
          const age = Math.max(0, time - source.createdAt);

          if (motionReduced || age >= pulseDuration) return offset + settled;

          const envelope = Math.exp(-(age / pulseDuration) * 4.3);
          const ripple = Math.sin(age * 0.026 - distance * 0.14) * direction * influence * 9 * envelope;
          return offset + settled + ripple;
        }, 0);
      };

      for (let y = margin; y <= height - margin; y += spacing) {
        context.beginPath();
        for (let x = margin; x <= width - margin; x += spacing) {
          const offset = displacementAt(x, y, 'y');
          if (x === margin) context.moveTo(x, y + offset);
          else context.lineTo(x, y + offset);
        }
        context.strokeStyle = line;
        context.lineWidth = 1;
        context.stroke();
      }

      for (let x = margin; x <= width - margin; x += spacing) {
        context.beginPath();
        for (let y = margin; y <= height - margin; y += spacing) {
          const offset = displacementAt(x, y, 'x');
          if (y === margin) context.moveTo(x + offset, y);
          else context.lineTo(x + offset, y);
        }
        context.strokeStyle = softLine;
        context.lineWidth = 1;
        context.stroke();
      }

      const hasActivePulse = !motionReduced && sources.some((source) => time - source.createdAt < pulseDuration);
      frame = hasActivePulse ? requestAnimationFrame(draw) : 0;
    };

    canvas.addEventListener('click', placeSource);
    document.addEventListener('personal-theme-change', () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      draw(performance.now());
    });

    if ('ResizeObserver' in window) {
      new ResizeObserver(resize).observe(field);
    } else {
      window.addEventListener('resize', resize);
    }

    resize();
  });
})();
