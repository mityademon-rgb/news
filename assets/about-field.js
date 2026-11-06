(() => {
  "use strict";

  let canvas = null;
  let context = null;
  let hero = null;
  let cameraObject = null;
  let animationFrame = 0;
  let resizeObserver = null;
  let visibilityObserver = null;
  let motionQuery = null;
  let field = [];
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let isVisible = false;
  let isReduced = false;
  let gust = 0;
  let pointerX = 0.5;
  let pointerY = 0.5;
  let targetX = 0.5;
  let targetY = 0.5;

  const colors = [
    [114, 239, 255],
    [57, 119, 255],
    [255, 71, 191],
    [255, 122, 26]
  ];

  function seeded(index, salt) {
    const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
    return value - Math.floor(value);
  }

  function buildField() {
    const mobile = width < 680;
    const count = mobile
      ? Math.max(74, Math.min(120, Math.round(width * height / 4300)))
      : Math.max(150, Math.min(290, Math.round(width * height / 5600)));

    field = Array.from({ length: count }, (_, index) => ({
      x: seeded(index, 1),
      depth: seeded(index, 2),
      length: 0.72 + seeded(index, 3) * 0.72,
      phase: seeded(index, 4) * Math.PI * 2,
      thickness: 0.55 + seeded(index, 5) * 1.15,
      color: Math.floor(seeded(index, 6) * colors.length),
      spark: seeded(index, 7) > 0.88
    })).sort((a, b) => a.depth - b.depth);
  }

  function resize() {
    if (!canvas || !hero) return;
    const rect = hero.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    pixelRatio = Math.min(window.devicePixelRatio || 1, width < 700 ? 1.25 : 1.6);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    buildField();
    draw(performance.now());
  }

  function drawGrid(vanishX, horizon) {
    context.save();
    context.lineWidth = 1;
    context.strokeStyle = "rgba(114,239,255,.09)";

    for (let index = -9; index <= 9; index += 1) {
      const bottomX = width * 0.5 + index * width * 0.1;
      context.beginPath();
      context.moveTo(vanishX, horizon);
      context.lineTo(bottomX, height + 12);
      context.stroke();
    }

    for (let index = 1; index <= 10; index += 1) {
      const progress = index / 10;
      const y = horizon + progress * progress * (height - horizon);
      context.globalAlpha = 0.18 + progress * 0.34;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
    context.restore();
  }

  function draw(now) {
    if (!context || !width || !height) return;
    const time = now * 0.001;
    context.clearRect(0, 0, width, height);

    const horizon = height * (width < 680 ? 0.47 : 0.43);
    const vanishX = width * (0.5 + (pointerX - 0.5) * 0.13);
    const glow = context.createRadialGradient(vanishX, horizon, 0, vanishX, horizon, width * 0.58);
    glow.addColorStop(0, "rgba(57,119,255,.18)");
    glow.addColorStop(0.42, "rgba(255,71,191,.07)");
    glow.addColorStop(1, "rgba(7,9,20,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
    drawGrid(vanishX, horizon);

    const wind = 0.7 + gust * 2.8;
    field.forEach((blade, index) => {
      const depth = blade.depth;
      const perspective = 0.2 + depth * 1.18;
      const spread = 0.42 + depth * 1.32;
      const baseX = vanishX + (blade.x - 0.5) * width * spread - (pointerX - 0.5) * width * depth * 0.08;
      const baseY = horizon + depth * depth * (height - horizon + 34);
      const bladeHeight = height * (0.035 + depth * 0.15) * blade.length;
      const wave = Math.sin(time * (0.72 + depth * 0.45) + blade.phase + index * 0.017);
      const secondWave = Math.sin(time * 0.43 + blade.phase * 1.7);
      const cursorPull = (pointerX - 0.5) * (9 + 34 * depth) * (0.4 + pointerY * 0.6);
      const bend = (wave * 0.72 + secondWave * 0.28) * (4 + depth * 23) * wind + cursorPull;
      const tipX = baseX + bend;
      const tipY = baseY - bladeHeight;
      const [red, green, blue] = colors[blade.color];
      const alpha = 0.12 + depth * 0.56;

      context.save();
      context.beginPath();
      context.moveTo(baseX, baseY);
      context.bezierCurveTo(
        baseX + bend * 0.08,
        baseY - bladeHeight * 0.32,
        tipX - bend * 0.25,
        baseY - bladeHeight * 0.74,
        tipX,
        tipY
      );
      context.lineWidth = blade.thickness * perspective;
      context.strokeStyle = `rgba(${red},${green},${blue},${alpha})`;
      if (depth > 0.7 && blade.spark) {
        context.shadowColor = `rgba(${red},${green},${blue},.7)`;
        context.shadowBlur = 8 + depth * 12;
      }
      context.stroke();

      if (blade.spark) {
        context.fillStyle = `rgba(${red},${green},${blue},${0.28 + depth * 0.55})`;
        context.beginPath();
        context.arc(tipX, tipY, 0.8 + depth * 1.8, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    });

    const scanY = horizon + ((time * 0.11) % 1) * (height - horizon);
    const scan = context.createLinearGradient(0, scanY, width, scanY);
    scan.addColorStop(0, "rgba(114,239,255,0)");
    scan.addColorStop(0.45, "rgba(114,239,255,.13)");
    scan.addColorStop(0.72, "rgba(255,71,191,.1)");
    scan.addColorStop(1, "rgba(255,71,191,0)");
    context.fillStyle = scan;
    context.fillRect(0, scanY, width, 1);
  }

  function moveCamera() {
    if (!cameraObject || !hero) return;
    const rect = hero.getBoundingClientRect();
    const scrollProgress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height * 0.7)));
    const rotateY = (pointerX - 0.5) * -15 + scrollProgress * 4;
    const rotateX = (0.5 - pointerY) * 8 - scrollProgress * 2.5;
    const shiftX = (pointerX - 0.5) * -24;
    const shiftY = (pointerY - 0.5) * -16 - scrollProgress * 14;
    cameraObject.style.setProperty("--camera-rx", `${rotateX.toFixed(2)}deg`);
    cameraObject.style.setProperty("--camera-ry", `${rotateY.toFixed(2)}deg`);
    cameraObject.style.setProperty("--camera-x", `${shiftX.toFixed(2)}px`);
    cameraObject.style.setProperty("--camera-y", `${shiftY.toFixed(2)}px`);
    cameraObject.style.setProperty("--camera-scale", (1 + gust * 0.018).toFixed(4));
  }

  function frame(now) {
    if (!canvas || isReduced || !isVisible || document.hidden) {
      animationFrame = 0;
      return;
    }
    pointerX += (targetX - pointerX) * 0.035;
    pointerY += (targetY - pointerY) * 0.035;
    gust = Math.max(0, gust - 0.012);
    draw(now);
    moveCamera();
    animationFrame = requestAnimationFrame(frame);
  }

  function start() {
    if (!animationFrame && canvas && !isReduced && isVisible && !document.hidden) {
      animationFrame = requestAnimationFrame(frame);
    }
  }

  function onPointerMove(event) {
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    targetX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    targetY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
  }

  function onPointerLeave() {
    targetX = 0.5;
    targetY = 0.5;
  }

  function onPointerDown() {
    if (!isReduced) gust = 1;
  }

  function onVisibilityChange() {
    if (!document.hidden) start();
  }

  function destroy() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    motionQuery?.removeEventListener?.("change", resize);
    hero?.removeEventListener("pointermove", onPointerMove);
    hero?.removeEventListener("pointerleave", onPointerLeave);
    hero?.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    canvas = null;
    context = null;
    hero = null;
    cameraObject = null;
    resizeObserver = null;
    visibilityObserver = null;
    motionQuery = null;
    field = [];
  }

  function mount(target) {
    destroy();
    if (!(target instanceof HTMLCanvasElement)) return;
    canvas = target;
    hero = canvas.closest(".about-hero");
    cameraObject = hero?.querySelector("[data-about-camera]") || null;
    context = canvas.getContext("2d", { alpha: true });
    if (!hero || !context) return;

    motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    isReduced = motionQuery.matches;
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(hero);
    visibilityObserver = new IntersectionObserver((entries) => {
      isVisible = entries[0]?.isIntersecting ?? false;
      if (isVisible) start();
    }, { threshold: 0.02 });
    visibilityObserver.observe(hero);
    hero.addEventListener("pointermove", onPointerMove, { passive: true });
    hero.addEventListener("pointerleave", onPointerLeave, { passive: true });
    hero.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    resize();
    moveCamera();
    isVisible = true;
    if (!isReduced) start();
  }

  function inject() {
    if (location.hash !== "#/about" && location.hash !== "#about") return;
    const targetHero = document.querySelector(".about-hero");
    const visual = targetHero?.querySelector(".about-hero-visual");
    if (!targetHero || !visual || targetHero.dataset.aboutEffectMounted === "true") return;

    targetHero.dataset.aboutEffectMounted = "true";
    const signalCanvas = document.createElement("canvas");
    signalCanvas.className = "about-signal-field";
    signalCanvas.dataset.aboutField = "";
    signalCanvas.setAttribute("aria-hidden", "true");
    targetHero.prepend(signalCanvas);
    visual.innerHTML = `
      <div class="about-orbit about-orbit-one"></div>
      <div class="about-orbit about-orbit-two"></div>
      <div class="about-camera-stage">
        <div class="about-camera-halo" aria-hidden="true"></div>
        <figure class="about-camera-object" data-about-camera>
          <img class="about-camera-depth" src="./assets/camera-hero.webp" alt="" aria-hidden="true" />
          <img class="about-camera-main" src="./assets/camera-hero.webp" alt="Профессиональная кинокамера — главный инструмент лаборатории TIMECODE" />
          <figcaption><i></i> REC&nbsp;&nbsp;00:10:00:00</figcaption>
        </figure>
        <div class="about-camera-scan" aria-hidden="true"></div>
      </div>
      <strong class="about-hero-code" aria-hidden="true">TIME<br /><i>:</i>CODE</strong>
      <span class="about-hero-label label-one">СНИМАЕМ</span>
      <span class="about-hero-label label-two">СПРАШИВАЕМ</span>
      <span class="about-hero-label label-three">ВЫПУСКАЕМ</span>`;
    mount(signalCanvas);
  }

  function syncRoute() {
    destroy();
    requestAnimationFrame(() => requestAnimationFrame(inject));
  }

  window.TIMECODE_ABOUT_FIELD = { mount, destroy, inject };
  window.addEventListener("hashchange", syncRoute);
  requestAnimationFrame(() => requestAnimationFrame(inject));
})();
