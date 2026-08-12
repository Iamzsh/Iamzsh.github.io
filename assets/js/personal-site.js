(() => {
  const root = document.documentElement;
  const themeButton = document.getElementById('personal-theme-toggle');
  const navButton = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-personal-nav]');
  const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const motionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  const ElasticSheet = window.ElasticSheet;
  if (!ElasticSheet) return;

  const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

  const valuesFromZero = (limit, step) => {
    const values = [0];
    for (let value = step; value < limit - 1e-8; value += step) values.push(value);
    if (values[values.length - 1] !== limit) values.push(limit);
    return values;
  };

  class ElasticFieldRenderer {
    constructor(field, canvas, context) {
      this.field = field;
      this.canvas = canvas;
      this.context = context;
      this.width = 1;
      this.height = 1;
      this.spacing = 18;
      this.margin = 24;
      this.innerWidth = 1;
      this.innerHeight = 1;
      this.scale = 1;
      this.Lx = 1;
      this.Ly = 1;
      this.model = null;
      this.horizontalLines = [];
      this.verticalLines = [];
      this.strainCells = [];
      this.displacementScratch = [0, 0];
      this.strainScratch = [0, 0, 0];
      this.principalScratch = [0, 0];
      this.screenScratch = [0, 0];
    }

    resize(bounds) {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      this.width = Math.max(1, Math.floor(bounds.width));
      this.height = Math.max(1, Math.floor(bounds.height));
      this.spacing = clamp(this.width / 30, 15, 19);
      this.margin = this.spacing * 1.5;
      this.innerWidth = Math.max(1, this.width - 2 * this.margin);
      this.innerHeight = Math.max(1, this.height - 2 * this.margin);
      this.scale = this.innerHeight;
      this.Lx = this.innerWidth / this.scale;
      this.Ly = 1;
      this.canvas.width = Math.floor(this.width * pixelRatio);
      this.canvas.height = Math.floor(this.height * pixelRatio);
      this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }

    setModel(model) {
      this.model = model;
      const step = this.spacing / this.scale;
      const xGrid = valuesFromZero(this.Lx, step);
      const yGrid = valuesFromZero(this.Ly, step);
      const horizontalSamples = Math.max(2, Math.ceil(this.innerWidth / (this.spacing * 0.6)) + 1);
      const verticalSamples = Math.max(2, Math.ceil(this.innerHeight / (this.spacing * 0.6)) + 1);

      this.horizontalLines = yGrid.map((y) => this.createLineSamples(y, horizontalSamples, true));
      this.verticalLines = xGrid.map((x) => this.createLineSamples(x, verticalSamples, false));
      this.strainCells = this.createStrainCells();
    }

    createLineSamples(fixedValue, count, horizontal) {
      const samples = [];
      const limit = horizontal ? this.Lx : this.Ly;

      for (let index = 0; index < count; index += 1) {
        const variable = limit * index / (count - 1);
        const x = horizontal ? variable : fixedValue;
        const y = horizontal ? fixedValue : variable;
        samples.push({ x, y, phi: this.model.basisValuesAt(x, y) });
      }

      return samples;
    }

    createStrainCells() {
      const columns = clamp(Math.round(this.innerWidth / 33), 14, 20);
      const rows = clamp(Math.round(this.innerHeight / 33), 12, 17);
      const cells = [];

      for (let row = 0; row < rows; row += 1) {
        const y0 = this.Ly * row / rows;
        const y1 = this.Ly * (row + 1) / rows;
        for (let column = 0; column < columns; column += 1) {
          const x0 = this.Lx * column / columns;
          const x1 = this.Lx * (column + 1) / columns;
          const centerX = 0.5 * (x0 + x1);
          const centerY = 0.5 * (y0 + y1);
          cells.push({
            centerBasis: this.model.basisAt(centerX, centerY),
            corners: [
              { x: x0, y: y0, phi: this.model.basisValuesAt(x0, y0) },
              { x: x1, y: y0, phi: this.model.basisValuesAt(x1, y0) },
              { x: x1, y: y1, phi: this.model.basisValuesAt(x1, y1) },
              { x: x0, y: y1, phi: this.model.basisValuesAt(x0, y1) }
            ]
          });
        }
      }

      return cells;
    }

    pointFromEvent(event) {
      const bounds = this.canvas.getBoundingClientRect();
      const localX = (event.clientX - bounds.left) * this.width / bounds.width;
      const localY = (event.clientY - bounds.top) * this.height / bounds.height;
      return [(localX - this.margin) / this.scale, (localY - this.margin) / this.scale];
    }

    isInside(point) {
      return point[0] >= 0 && point[0] <= this.Lx && point[1] >= 0 && point[1] <= this.Ly;
    }

    mapBasisPoint(q, point, output = this.screenScratch) {
      this.model.evaluateDisplacementFromPhi(q, point.phi, this.displacementScratch);
      output[0] = this.margin + (point.x + this.displacementScratch[0]) * this.scale;
      output[1] = this.margin + (point.y + this.displacementScratch[1]) * this.scale;
      return output;
    }

    mapReferencePoint(q, x, y, output = this.screenScratch) {
      this.model.evaluateDisplacement(q, x, y, this.displacementScratch);
      output[0] = this.margin + (x + this.displacementScratch[0]) * this.scale;
      output[1] = this.margin + (y + this.displacementScratch[1]) * this.scale;
      return output;
    }

    draw(q, state) {
      const dark = root.getAttribute('data-theme') === 'dark';
      const line = dark ? 'rgba(150, 207, 194, 0.40)' : 'rgba(18, 100, 94, 0.33)';
      const softLine = dark ? 'rgba(150, 207, 194, 0.18)' : 'rgba(18, 100, 94, 0.16)';
      const background = dark ? '#1d2929' : '#f5f8f7';
      const context = this.context;

      context.clearRect(0, 0, this.width, this.height);
      context.fillStyle = background;
      context.fillRect(0, 0, this.width, this.height);
      context.lineCap = 'round';
      context.lineJoin = 'round';

      if (state.hasDeformation) this.drawStrainTint(q, dark);
      this.drawGrid(q, line, softLine);
      this.drawHandle(q, state, dark);
    }

    drawGrid(q, horizontalColor, verticalColor) {
      const context = this.context;
      context.lineWidth = 1;
      context.strokeStyle = horizontalColor;
      this.horizontalLines.forEach((samples) => this.strokeSamples(q, samples));
      context.strokeStyle = verticalColor;
      this.verticalLines.forEach((samples) => this.strokeSamples(q, samples));
    }

    strokeSamples(q, samples) {
      const context = this.context;
      context.beginPath();
      samples.forEach((sample, index) => {
        const point = this.mapBasisPoint(q, sample);
        if (index === 0) context.moveTo(point[0], point[1]);
        else context.lineTo(point[0], point[1]);
      });
      context.stroke();
    }

    drawStrainTint(q, dark) {
      const context = this.context;
      const tensile = dark ? [240, 176, 135] : [190, 105, 78];
      const compressive = dark ? [144, 208, 195] : [20, 106, 101];

      this.strainCells.forEach((cell) => {
        this.model.evaluateStrainFromBasis(q, cell.centerBasis, this.strainScratch);
        ElasticSheet.principalStrains(
          this.strainScratch[0],
          this.strainScratch[1],
          this.strainScratch[2],
          this.principalScratch
        );
        const signedStrain = Math.abs(this.principalScratch[0]) >= Math.abs(this.principalScratch[1])
          ? this.principalScratch[0]
          : this.principalScratch[1];
        const intensity = Math.min(Math.abs(signedStrain) / 0.075, 1);
        if (intensity < 0.025) return;

        const color = signedStrain >= 0 ? tensile : compressive;
        const alpha = 0.008 + 0.042 * intensity;
        context.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
        context.beginPath();
        cell.corners.forEach((corner, index) => {
          const point = this.mapBasisPoint(q, corner);
          if (index === 0) context.moveTo(point[0], point[1]);
          else context.lineTo(point[0], point[1]);
        });
        context.closePath();
        context.fill();
      });
    }

    drawHandle(q, state, dark) {
      const handle = state.handle;
      const hover = state.hover;
      const anchor = handle ? handle.anchor : (hover.inside ? hover.point : null);
      if (!anchor) return;

      const context = this.context;
      const displaced = this.mapReferencePoint(q, anchor[0], anchor[1]);
      const radius = this.model.sigma * this.scale;
      const active = state.active;
      const alpha = handle ? (active ? 0.68 : 0.28) : 0.32;
      const stroke = dark ? `rgba(177, 228, 217, ${alpha})` : `rgba(15, 80, 77, ${alpha})`;

      context.save();
      context.strokeStyle = stroke;
      context.fillStyle = dark ? `rgba(144, 208, 195, ${alpha * 0.15})` : `rgba(20, 106, 101, ${alpha * 0.11})`;
      context.lineWidth = 1;
      context.setLineDash(handle ? [3, 3] : [2, 4]);
      context.beginPath();
      context.arc(displaced[0], displaced[1], radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.setLineDash([]);
      context.beginPath();
      context.arc(displaced[0], displaced[1], active ? 2.35 : 1.7, 0, Math.PI * 2);
      context.fillStyle = stroke;
      context.fill();
      context.restore();
    }
  }

  class ElasticFieldController {
    constructor(field) {
      this.field = field;
      this.canvas = field.querySelector('canvas');
      this.context = this.canvas?.getContext('2d');
      this.renderer = this.context ? new ElasticFieldRenderer(field, this.canvas, this.context) : null;
      this.model = null;
      this.frame = 0;
      this.lastTime = 0;
      this.maximumStrain = 0.075;
      this.hover = { inside: false, point: [0, 0] };
      this.drag = {
        active: false,
        pointerId: null,
        handle: null,
        probe: null,
        target: [0, 0],
        display: [0, 0],
        velocity: [0, 0],
        releaseHold: false,
        releaseToken: 0
      };
      this.q = null;
      this.draw = this.draw.bind(this);
      this.resize = this.resize.bind(this);
    }

    connect() {
      if (!this.renderer) return;
      this.canvas.addEventListener('pointerenter', (event) => this.updateHover(event));
      this.canvas.addEventListener('pointermove', (event) => this.movePointer(event));
      this.canvas.addEventListener('pointerleave', () => this.leavePointer());
      this.canvas.addEventListener('pointerdown', (event) => this.startDrag(event));
      this.canvas.addEventListener('pointerup', (event) => this.endDrag(event));
      this.canvas.addEventListener('pointercancel', () => this.releaseDrag(false));
      this.canvas.addEventListener('lostpointercapture', () => {
        if (this.drag.active) this.releaseDrag(false);
      });
      window.addEventListener('pointerup', (event) => this.endDrag(event));
      window.addEventListener('blur', () => this.releaseDrag(false));
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.releaseDrag(false);
      });
      document.addEventListener('personal-theme-change', () => this.requestRender());

      if ('ResizeObserver' in window) {
        new ResizeObserver(this.resize).observe(this.field);
      } else {
        window.addEventListener('resize', this.resize);
      }

      this.resize();
    }

    resize() {
      const bounds = this.field.getBoundingClientRect();
      this.renderer.resize(bounds);
      this.model = new ElasticSheet.SpectralElasticSheet({
        order: 8,
        Lx: this.renderer.Lx,
        Ly: this.renderer.Ly,
        mu: 1,
        nu: 0.35,
        sigma: 0.085 * Math.min(this.renderer.Lx, this.renderer.Ly)
      });
      this.renderer.setModel(this.model);
      this.drag.active = false;
      this.drag.pointerId = null;
      this.drag.handle = null;
      this.drag.probe = null;
      this.drag.target = [0, 0];
      this.drag.display = [0, 0];
      this.drag.velocity = [0, 0];
      this.drag.releaseHold = false;
      this.drag.releaseToken += 1;
      this.q = new Float64Array(this.model.dofCount);
      this.field.classList.remove('is-dragging');
      this.lastTime = 0;
      this.requestRender();
    }

    requestRender() {
      if (!this.frame) this.frame = requestAnimationFrame(this.draw);
    }

    updateHover(event) {
      if (this.drag.active) return;
      const point = this.renderer.pointFromEvent(event);
      this.hover.inside = this.renderer.isInside(point);
      if (this.hover.inside) this.hover.point = point;
      this.requestRender();
    }

    leavePointer() {
      if (this.drag.active) {
        this.releaseDrag(false);
      } else {
        this.hover.inside = false;
        this.requestRender();
      }
    }

    startDrag(event) {
      const point = this.renderer.pointFromEvent(event);
      if (!this.renderer.isInside(point)) return;

      this.drag.active = true;
      this.drag.pointerId = event.pointerId;
      this.drag.handle = this.model.prepareHandle(point);
      // Evaluated once per grab: a denser analytic strain scan makes the UI cap conservative.
      this.drag.probe = this.model.createStrainProbe(this.drag.handle, 33, 25);
      this.drag.target = [0, 0];
      this.drag.display = [0, 0];
      this.drag.velocity = [0, 0];
      this.drag.releaseHold = false;
      this.drag.releaseToken += 1;
      this.hover.inside = false;
      this.canvas.setPointerCapture?.(event.pointerId);
      this.field.classList.add('is-dragging');
      this.requestRender();
    }

    movePointer(event) {
      const point = this.renderer.pointFromEvent(event);

      if (this.drag.active && event.pointerId === this.drag.pointerId) {
        if (!this.renderer.isInside(point)) {
          this.releaseDrag(false);
          return;
        }

        const requested = [
          point[0] - this.drag.handle.anchor[0],
          point[1] - this.drag.handle.anchor[1]
        ];
        const limited = this.model.limitDisplacement(this.drag.probe, requested, this.maximumStrain);
        this.drag.target = limited.displacement;
        // During a drag the constrained solution follows the pointer exactly.
        this.drag.display = [limited.displacement[0], limited.displacement[1]];
        this.drag.velocity = [0, 0];
        this.requestRender();
        return;
      }

      if (!event.buttons) this.updateHover(event);
    }

    endDrag(event) {
      if (!this.drag.active) return;
      if (this.drag.pointerId !== null && event.pointerId !== undefined && event.pointerId !== this.drag.pointerId) return;
      const point = this.renderer.pointFromEvent(event);
      this.releaseDrag(this.renderer.isInside(point), point);
    }

    releaseDrag(restoreHover, point = null) {
      if (!this.drag.active && !this.drag.handle) return;
      const pointerId = this.drag.pointerId;
      this.drag.active = false;
      this.drag.pointerId = null;
      this.field.classList.remove('is-dragging');

      if (pointerId !== null && this.canvas.hasPointerCapture?.(pointerId)) {
        this.canvas.releasePointerCapture(pointerId);
      }

      this.hover.inside = Boolean(restoreHover && point);
      if (this.hover.inside) this.hover.point = point;
      // Keep the final constrained state for one paint before the UI-only relaxation begins.
      this.drag.releaseHold = true;
      const releaseToken = ++this.drag.releaseToken;
      this.requestRender();
      requestAnimationFrame(() => {
        if (releaseToken !== this.drag.releaseToken) return;
        this.drag.releaseHold = false;
        this.drag.target = [0, 0];
        this.requestRender();
      });
    }

    advance(time) {
      const deltaTime = this.lastTime ? Math.min((time - this.lastTime) / 1000, 0.04) : 1 / 60;
      this.lastTime = time;
      const target = this.drag.active || this.drag.releaseHold ? this.drag.target : [0, 0];

      if (this.drag.active || motionReduced) {
        this.drag.display[0] = target[0];
        this.drag.display[1] = target[1];
        this.drag.velocity[0] = 0;
        this.drag.velocity[1] = 0;
      } else {
        const spring = this.drag.releaseHold ? 190 : 150;
        const damping = this.drag.releaseHold ? 23 : 17;
        for (let axis = 0; axis < 2; axis += 1) {
          this.drag.velocity[axis] += (target[axis] - this.drag.display[axis]) * spring * deltaTime;
          this.drag.velocity[axis] *= Math.exp(-damping * deltaTime);
          this.drag.display[axis] += this.drag.velocity[axis] * deltaTime;
        }
      }

      const moving =
        Math.abs(this.drag.display[0] - target[0]) > 1e-6 ||
        Math.abs(this.drag.display[1] - target[1]) > 1e-6 ||
        Math.abs(this.drag.velocity[0]) > 1e-6 ||
        Math.abs(this.drag.velocity[1]) > 1e-6;

      if (!this.drag.active && !this.drag.releaseHold && !moving) {
        this.drag.display = [0, 0];
        this.drag.velocity = [0, 0];
        this.drag.handle = null;
        this.drag.probe = null;
        this.q.fill(0);
      } else if (this.drag.handle) {
        // The displayed state remains a static minimum-energy solution for the interpolated handle displacement.
        this.model.composeDisplacement(this.drag.handle, this.drag.display, this.q);
      }

      return moving;
    }

    draw(time) {
      this.frame = 0;
      const moving = this.advance(time);
      const deformationMagnitude = Math.hypot(this.drag.display[0], this.drag.display[1]);
      this.renderer.draw(this.q, {
        active: this.drag.active,
        handle: this.drag.handle,
        hover: this.hover,
        hasDeformation: deformationMagnitude > 1e-7
      });
      if (moving) this.requestRender();
    }
  }

  document.querySelectorAll('[data-elastic-field]').forEach((field) => {
    new ElasticFieldController(field).connect();
  });
})();
