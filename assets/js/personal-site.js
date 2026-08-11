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

    const hover = { inside: false, strength: 0, x: 0, y: 0 };
    const drag = {
      active: false,
      detached: false,
      pointerId: null,
      anchorX: 0,
      anchorY: 0,
      targetX: 0,
      targetY: 0,
      displacementX: 0,
      displacementY: 0,
      velocityX: 0,
      velocityY: 0
    };
    let width = 0;
    let height = 0;
    let spacing = 0;
    let margin = 0;
    let frame = 0;
    let lastTime = 0;

    const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

    const pointFromEvent = (event) => {
      const bounds = canvas.getBoundingClientRect();
      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };

    const isInsideGrid = (point) => {
      return point.x >= margin && point.x <= width - margin && point.y >= margin && point.y <= height - margin;
    };

    const releasePointer = () => {
      if (drag.pointerId !== null && canvas.hasPointerCapture?.(drag.pointerId)) {
        canvas.releasePointerCapture(drag.pointerId);
      }
      drag.pointerId = null;
    };

    const requestRender = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };

    const resize = () => {
      const bounds = field.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.floor(bounds.width));
      height = Math.max(1, Math.floor(bounds.height));
      spacing = Math.max(15, Math.min(19, width / 30));
      margin = spacing * 1.5;
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      lastTime = 0;
      requestRender();
    };

    const updateHover = (point) => {
      hover.x = clamp(point.x, margin, width - margin);
      hover.y = clamp(point.y, margin, height - margin);
      hover.inside = isInsideGrid(point) && !drag.active && !drag.detached;
      requestRender();
    };

    const detach = () => {
      drag.active = false;
      drag.detached = true;
      hover.inside = false;
      releasePointer();
      requestRender();
    };

    const endDrag = (event) => {
      if (!drag.active && !drag.detached) return;
      if (drag.pointerId !== null && event.pointerId !== undefined && event.pointerId !== drag.pointerId) return;
      const point = pointFromEvent(event);
      drag.active = false;
      drag.detached = false;
      releasePointer();
      if (isInsideGrid(point)) updateHover(point);
      else {
        hover.inside = false;
        requestRender();
      }
    };

    const startDrag = (event) => {
      const point = pointFromEvent(event);
      if (!isInsideGrid(point)) return;

      drag.active = true;
      drag.detached = false;
      drag.pointerId = event.pointerId;
      drag.anchorX = point.x;
      drag.anchorY = point.y;
      drag.targetX = 0;
      drag.targetY = 0;
      hover.inside = false;
      canvas.setPointerCapture?.(event.pointerId);
      requestRender();
    };

    const movePointer = (event) => {
      const point = pointFromEvent(event);

      if (drag.active && event.pointerId === drag.pointerId) {
        if (!isInsideGrid(point)) {
          detach();
          return;
        }

        const dx = point.x - drag.anchorX;
        const dy = point.y - drag.anchorY;
        const magnitude = Math.hypot(dx, dy);
        const boundaryDistance = Math.min(
          drag.anchorX - margin,
          width - margin - drag.anchorX,
          drag.anchorY - margin,
          height - margin - drag.anchorY
        );
        const maximumPull = Math.max(28, Math.min(boundaryDistance * 0.72, Math.min(width, height) * 0.34));
        const scale = magnitude > maximumPull ? maximumPull / magnitude : 1;
        drag.targetX = dx * scale;
        drag.targetY = dy * scale;
        requestRender();
        return;
      }

      if (!drag.detached || !event.buttons) {
        drag.detached = false;
        updateHover(point);
      }
    };

    const gridValues = (start, end) => {
      const values = [start];
      for (let value = start + spacing; value < end - 0.5; value += spacing) values.push(value);
      values.push(end);
      return values;
    };

    const advance = (time) => {
      const deltaTime = lastTime ? Math.min((time - lastTime) / 1000, 0.04) : 1 / 60;
      lastTime = time;
      const hoverTarget = hover.inside && !drag.active ? 1 : 0;

      if (motionReduced) {
        hover.strength = hoverTarget;
        drag.displacementX = drag.active ? drag.targetX : 0;
        drag.displacementY = drag.active ? drag.targetY : 0;
        drag.velocityX = 0;
        drag.velocityY = 0;
        return false;
      }

      const hoverBlend = 1 - Math.exp(-deltaTime * (hoverTarget ? 18 : 14));
      hover.strength += (hoverTarget - hover.strength) * hoverBlend;

      const spring = drag.detached ? 150 : 105;
      const damping = drag.detached ? 15 : 19;
      const targetX = drag.active ? drag.targetX : 0;
      const targetY = drag.active ? drag.targetY : 0;
      drag.velocityX += (targetX - drag.displacementX) * spring * deltaTime;
      drag.velocityY += (targetY - drag.displacementY) * spring * deltaTime;
      drag.velocityX *= Math.exp(-damping * deltaTime);
      drag.velocityY *= Math.exp(-damping * deltaTime);
      drag.displacementX += drag.velocityX * deltaTime;
      drag.displacementY += drag.velocityY * deltaTime;

      const motionRemaining = Math.abs(hoverTarget - hover.strength) > 0.002 ||
        Math.abs(drag.displacementX - targetX) > 0.03 ||
        Math.abs(drag.displacementY - targetY) > 0.03 ||
        Math.abs(drag.velocityX) > 0.03 ||
        Math.abs(drag.velocityY) > 0.03;

      if (!drag.active && !drag.detached && !hover.inside && Math.hypot(drag.displacementX, drag.displacementY) < 0.03) {
        drag.displacementX = 0;
        drag.displacementY = 0;
        drag.velocityX = 0;
        drag.velocityY = 0;
      }

      return motionRemaining;
    };

    const draw = (time) => {
      frame = 0;
      const keepAnimating = advance(time);
      const dark = root.getAttribute('data-theme') === 'dark';
      const line = dark ? 'rgba(150, 207, 194, 0.40)' : 'rgba(18, 100, 94, 0.33)';
      const softLine = dark ? 'rgba(150, 207, 194, 0.18)' : 'rgba(18, 100, 94, 0.16)';
      const background = dark ? '#1d2929' : '#f5f8f7';
      const innerWidth = Math.max(1, width - margin * 2);
      const innerHeight = Math.max(1, height - margin * 2);
      const hoverScale = Math.min(innerWidth, innerHeight) * 0.18;
      const dragScale = Math.min(innerWidth, innerHeight) * 0.23;

      context.clearRect(0, 0, width, height);
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
      context.lineCap = 'round';
      context.lineJoin = 'round';

      const mapPoint = (x, y) => {
        const normalizedX = clamp((x - margin) / innerWidth, 0, 1);
        const normalizedY = clamp((y - margin) / innerHeight, 0, 1);
        const boundaryWeight = Math.pow(Math.sin(Math.PI * normalizedX) * Math.sin(Math.PI * normalizedY), 0.72);
        let displacementX = 0;
        let displacementY = 0;

        if (hover.strength > 0.001) {
          const dx = x - hover.x;
          const dy = y - hover.y;
          const radiusSquared = dx * dx + dy * dy;
          const radius = Math.sqrt(radiusSquared + hoverScale * hoverScale * 0.16);
          const influence = Math.exp(-radiusSquared / (2 * hoverScale * hoverScale));
          const amplitude = hover.strength * influence * boundaryWeight * 13;
          displacementX -= (dx / radius) * amplitude;
          displacementY -= (dy / radius) * amplitude;
        }

        if (Math.abs(drag.displacementX) > 0.001 || Math.abs(drag.displacementY) > 0.001) {
          const dx = x - drag.anchorX;
          const dy = y - drag.anchorY;
          const radiusSquared = dx * dx + dy * dy;
          const influence = Math.exp(-radiusSquared / (2 * dragScale * dragScale));
          const transmission = influence * boundaryWeight;
          displacementX += drag.displacementX * transmission;
          displacementY += drag.displacementY * transmission;
        }

        return { x: x + displacementX, y: y + displacementY };
      };

      const xValues = gridValues(margin, width - margin);
      const yValues = gridValues(margin, height - margin);

      context.strokeStyle = line;
      context.lineWidth = 1;
      yValues.forEach((y) => {
        context.beginPath();
        xValues.forEach((x, index) => {
          const point = mapPoint(x, y);
          if (index === 0) context.moveTo(point.x, point.y);
          else context.lineTo(point.x, point.y);
        });
        context.stroke();
      });

      context.strokeStyle = softLine;
      xValues.forEach((x) => {
        context.beginPath();
        yValues.forEach((y, index) => {
          const point = mapPoint(x, y);
          if (index === 0) context.moveTo(point.x, point.y);
          else context.lineTo(point.x, point.y);
        });
        context.stroke();
      });

      if (keepAnimating) requestRender();
    };

    canvas.addEventListener('pointerenter', movePointer);
    canvas.addEventListener('pointermove', movePointer);
    canvas.addEventListener('pointerleave', (event) => {
      if (drag.active) detach();
      else {
        hover.inside = false;
        requestRender();
      }
      if (drag.detached && !event.buttons) drag.detached = false;
    });
    canvas.addEventListener('pointerdown', startDrag);
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', detach);
    canvas.addEventListener('lostpointercapture', () => {
      if (drag.active) detach();
    });
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('pointercancel', detach);
    window.addEventListener('blur', detach);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) detach();
    });
    document.addEventListener('personal-theme-change', requestRender);

    if ('ResizeObserver' in window) {
      new ResizeObserver(resize).observe(field);
    } else {
      window.addEventListener('resize', resize);
    }

    resize();
  });
})();
