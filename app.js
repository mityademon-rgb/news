(function () {
  "use strict";

  const lessons = window.BOOM_LESSONS || [];
  const main = document.querySelector("#main");
  const soundButton = document.querySelector("#sound-check");
  const year = document.querySelector("#year");
  const state = {
    lesson: null,
    scene: 0,
    teacherMode: false,
    answered: Object.create(null)
  };

  year.textContent = new Date().getFullYear();

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const teacherNote = (type) => {
    const notes = {
      cover: "Не объясняйте тему заранее. Прочитайте обещание результата и сразу переходите к следующему экрану.",
      compare: "Сначала соберите ответы детей. Нажимайте вариант только после того, как прозвучат их аргументы.",
      rule: "Не заучиваем формулировки. Просим привести один собственный пример на каждый пункт.",
      practice: "Дайте чёткий лимит времени. После съёмки выберите 2–3 работы без публичного разбора ошибок конкретного ребёнка.",
      choice: "Просите не только выбрать ответ, но и закончить фразу: «Я выбрал так, потому что…».",
      "choice-image": "Дайте десять секунд на молчаливое решение, затем попросите показать ответ одновременно.",
      finish: "В финале каждый называет одно правило, которое применит в следующей съёмке."
    };
    return `<aside class="teacher-note"><strong>Режиссура занятия.</strong> ${notes[type] || notes.rule}</aside>`;
  };

  function renderHome(scrollTarget) {
    const cards = lessons.map((lesson) => {
      const ready = lesson.status === "ready";
      const body = `
        <article class="lesson-card ${escapeHtml(lesson.color)}" data-ready="${ready}">
          <div class="lesson-meta">
            <span class="lesson-number">${escapeHtml(lesson.number)}</span>
            <span class="lesson-status">${ready ? lesson.duration : "готовим"}</span>
          </div>
          <h3>${escapeHtml(lesson.title)}</h3>
          <p>${escapeHtml(lesson.summary)}</p>
          <div class="lesson-tags">${lesson.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
          <div class="lesson-open">
            <span>${ready ? "Открыть занятие" : "Скоро в курсе"}</span>
            ${ready ? '<span class="arrow" aria-hidden="true">↗</span>' : ""}
          </div>
        </article>`;
      return ready
        ? `<a href="#/lesson/${encodeURIComponent(lesson.id)}" aria-label="Открыть занятие: ${escapeHtml(lesson.title)}">${body}</a>`
        : `<div aria-label="Занятие готовится: ${escapeHtml(lesson.title)}">${body}</div>`;
    }).join("");

    main.innerHTML = `
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">Школа изображения, звука и историй</p>
          <h1 id="hero-title"><span class="boom-word">БУМ!</span><span class="frame-word">КАДР</span></h1>
          <p class="hero-lead">Здесь не читают лекции о медиа. Здесь берут телефон, микрофон, камеру — и учатся рассказывать так, чтобы хотелось смотреть.</p>
          <div class="hero-actions">
            <a class="button button-primary" href="#/lesson/beautiful-frame">Начать с красивого кадра <span aria-hidden="true">→</span></a>
            <a class="button button-secondary" href="#lessons">Все занятия</a>
          </div>
        </div>
        <div class="hero-visual" aria-hidden="true">
          <img class="boom-hero" src="./assets/boom-mic-hero.webp" alt="" />
          <img class="camera-hero" src="./assets/camera-hero.webp" alt="" />
          <div class="take-stamp">Можно<br />снимать</div>
        </div>
      </section>
      <div class="ticker" aria-hidden="true">
        <div class="ticker-track">СМОТРИ → СЛУШАЙ → ПРОБУЙ → СНИМАЙ → МОНТИРУЙ → РАССКАЗЫВАЙ → СМОТРИ → СЛУШАЙ → ПРОБУЙ → СНИМАЙ → МОНТИРУЙ → РАССКАЗЫВАЙ → </div>
      </div>
      <section class="section" id="lessons" aria-labelledby="lessons-title">
        <div class="section-head">
          <div>
            <p class="eyebrow">Курс растёт вместе с группой</p>
            <h2 id="lessons-title">Не темы.<br />Съёмочные смены.</h2>
          </div>
          <p>Каждое занятие — короткое объяснение, визуальный эксперимент и работа руками. Новые выпуски появляются здесь по мере прохождения курса.</p>
        </div>
        <div class="lessons-grid">${cards}</div>
      </section>
      <section class="section about-panel" id="about" aria-labelledby="about-title">
        <div class="about-number" aria-label="10 лет">10</div>
        <div class="about-copy">
          <p class="eyebrow">Опыт настоящей редакции</p>
          <h2 id="about-title">Мы выросли из медиацентра</h2>
          <p>И стали небольшой продакшн-командой, которая снимает, выпускает эфиры и учит детей работать по-настоящему — без скучной имитации взрослой профессии.</p>
          <p class="about-note">БУМ.КАДР — новый образовательный проект команды Медиацентра Марфино.</p>
        </div>
      </section>`;

    document.body.classList.remove("teacher-mode");
    bindHeroMotion();
    if (scrollTarget) {
      requestAnimationFrame(() => document.querySelector(scrollTarget)?.scrollIntoView({ block: "start" }));
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }

  function bindHeroMotion() {
    const hero = document.querySelector(".hero");
    if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    hero.addEventListener("pointermove", (event) => {
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 28;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 24;
      hero.style.setProperty("--pointer-x", `${x}px`);
      hero.style.setProperty("--pointer-y", `${y}px`);
    });
    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--pointer-x", "0px");
      hero.style.setProperty("--pointer-y", "0px");
    });
  }

  function renderLesson(lessonId) {
    const lesson = lessons.find((item) => item.id === lessonId && item.status === "ready");
    if (!lesson) {
      renderHome();
      return;
    }

    state.lesson = lesson;
    const stored = Number(localStorage.getItem(`boom-kadr:${lesson.id}:scene`));
    state.scene = Number.isInteger(stored) && stored >= 0 && stored < lesson.scenes.length ? stored : 0;

    main.innerHTML = `
      <section class="lesson-shell" aria-label="Занятие ${escapeHtml(lesson.number)}: ${escapeHtml(lesson.title)}">
        <div class="lesson-toolbar">
          <a class="back-link" href="#/">← Занятия</a>
          <div class="progress-wrap">
            <div class="progress-track" aria-hidden="true"><div class="progress-bar" id="progress-bar"></div></div>
            <span class="progress-label" id="progress-label"></span>
          </div>
          <button class="teacher-toggle" id="teacher-toggle" type="button" aria-pressed="false">Режим педагога</button>
        </div>
        <div class="scene-stage">
          <div id="scene-content"></div>
          <nav class="lesson-nav" aria-label="Навигация по занятию">
            <button class="nav-button" id="prev-scene" type="button">← Назад</button>
            <div class="scene-dots" id="scene-dots" aria-hidden="true"></div>
            <button class="nav-button next" id="next-scene" type="button">Дальше →</button>
          </nav>
        </div>
      </section>
      <div class="scene-toast" id="scene-toast" role="status" aria-live="polite"></div>`;

    document.querySelector("#teacher-toggle").addEventListener("click", toggleTeacherMode);
    document.querySelector("#prev-scene").addEventListener("click", () => changeScene(-1));
    document.querySelector("#next-scene").addEventListener("click", () => changeScene(1));
    document.addEventListener("keydown", lessonKeydown);
    drawScene();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function lessonKeydown(event) {
    if (!state.lesson || event.altKey || event.metaKey || event.ctrlKey) return;
    if (event.key === "ArrowRight") changeScene(1);
    if (event.key === "ArrowLeft") changeScene(-1);
  }

  function toggleTeacherMode() {
    state.teacherMode = !state.teacherMode;
    document.body.classList.toggle("teacher-mode", state.teacherMode);
    const button = document.querySelector("#teacher-toggle");
    button.setAttribute("aria-pressed", String(state.teacherMode));
    button.textContent = state.teacherMode ? "Режим ученика" : "Режим педагога";
    showToast(state.teacherMode ? "Подсказки педагогу включены" : "Подсказки скрыты");
  }

  function changeScene(delta) {
    if (!state.lesson) return;
    const nextIndex = state.scene + delta;
    if (nextIndex < 0) return;
    if (nextIndex >= state.lesson.scenes.length) {
      location.hash = "#/";
      return;
    }
    state.scene = nextIndex;
    localStorage.setItem(`boom-kadr:${state.lesson.id}:scene`, String(state.scene));
    drawScene();
  }

  function drawScene() {
    const scene = state.lesson.scenes[state.scene];
    const target = document.querySelector("#scene-content");
    target.innerHTML = sceneTemplate(scene);
    bindSceneActions(scene);

    const progress = ((state.scene + 1) / state.lesson.scenes.length) * 100;
    document.querySelector("#progress-bar").style.width = `${progress}%`;
    document.querySelector("#progress-label").textContent = `${state.scene + 1} / ${state.lesson.scenes.length}`;
    document.querySelector("#prev-scene").disabled = state.scene === 0;
    const next = document.querySelector("#next-scene");
    next.textContent = state.scene === state.lesson.scenes.length - 1 ? "К занятиям →" : "Дальше →";
    document.querySelector("#scene-dots").innerHTML = state.lesson.scenes
      .map((_, index) => `<span class="scene-dot ${index === state.scene ? "active" : ""}"></span>`)
      .join("");
  }

  function sceneTemplate(scene) {
    const copy = `
      <div class="scene-copy">
        <p class="eyebrow">${escapeHtml(scene.kicker || "БУМ.КАДР")}</p>
        <h2>${escapeHtml(scene.title)}</h2>
        ${scene.text ? `<p>${escapeHtml(scene.text)}</p>` : ""}
        ${scene.accent ? `<div class="scene-accent">${escapeHtml(scene.accent)}</div>` : ""}
        ${teacherNote(scene.type)}
      </div>`;

    if (scene.type === "cover") {
      return `<article class="scene">${copy}<div class="finish-mark" aria-hidden="true"><span>REC<br />●</span></div></article>`;
    }

    if (scene.type === "compare") {
      const media = scene.images.map((item) => `
        <div class="media-card">
          <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.label)}" />
          <div class="media-label">${escapeHtml(item.label)}</div>
        </div>`).join("");
      const options = scene.answer === "Б" ? ["А", "Б"] : ["Крупность", "Место героя", "Камера"];
      return `<article class="scene">${copy}<div class="scene-visual">
        <div class="compare-grid ${scene.images.length === 1 ? "single" : ""}">${media}</div>
        <div class="answer-panel">
          <strong>${escapeHtml(scene.prompt)}</strong>
          <div class="answer-buttons">${options.map((option) => `<button class="answer-button" type="button" data-answer="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join("")}</div>
          <p class="feedback" hidden></p>
        </div>
      </div></article>`;
    }

    if (scene.type === "rule") {
      const rules = `<div class="rule-list">${scene.items.map((item) => `<div class="rule-item"><strong>${escapeHtml(item[0])}</strong><span>${escapeHtml(item[1])}</span></div>`).join("")}</div>`;
      const visual = scene.image
        ? `<div class="media-card"><img src="${escapeHtml(scene.image)}" alt="Примеры для правила: ${escapeHtml(scene.title)}" /></div>${rules}`
        : scene.gridDemo
          ? `<div class="thirds-demo" aria-label="Сетка правила третей с главным объектом на пересечении линий"></div>${rules}`
          : rules;
      return `<article class="scene">${copy}<div class="scene-visual">${visual}</div></article>`;
    }

    if (scene.type === "practice") {
      return `<article class="scene">${copy}<div class="scene-visual"><div class="practice-card"><ul class="checklist">${scene.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></div></article>`;
    }

    if (scene.type === "choice" || scene.type === "choice-image") {
      const image = scene.image ? `<div class="media-card"><img src="${escapeHtml(scene.image)}" alt="Изображение к вопросу: ${escapeHtml(scene.title)}" /></div>` : "";
      return `<article class="scene">${copy}<div class="scene-visual">${image}<div class="answer-panel">
        <div class="choice-buttons">${scene.options.map((option, index) => `<button class="choice-button" type="button" data-index="${index}">${escapeHtml(option)}</button>`).join("")}</div>
        <p class="feedback" hidden></p>
      </div></div></article>`;
    }

    if (scene.type === "finish") {
      return `<article class="scene">${copy}<div class="finish-mark"><span>${escapeHtml(scene.takeaway)}</span></div></article>`;
    }

    return `<article class="scene">${copy}</article>`;
  }

  function bindSceneActions(scene) {
    document.querySelectorAll("[data-answer]").forEach((button) => {
      button.addEventListener("click", () => {
        const correct = button.dataset.answer === scene.answer;
        document.querySelectorAll("[data-answer]").forEach((item) => item.classList.remove("is-correct", "is-wrong"));
        button.classList.add(correct ? "is-correct" : "is-wrong");
        const feedback = document.querySelector(".feedback");
        feedback.hidden = false;
        feedback.textContent = correct ? scene.feedback : "Посмотрите ещё раз и попробуйте объяснить разницу точнее.";
        if (correct) markAnswered();
      });
    });

    document.querySelectorAll("[data-index]").forEach((button) => {
      button.addEventListener("click", () => {
        const correct = Number(button.dataset.index) === scene.correct;
        document.querySelectorAll("[data-index]").forEach((item) => item.classList.remove("is-correct", "is-wrong"));
        button.classList.add(correct ? "is-correct" : "is-wrong");
        const feedback = document.querySelector(".feedback");
        feedback.hidden = false;
        feedback.textContent = correct ? scene.success : scene.fail;
        if (correct) markAnswered();
      });
    });
  }

  function markAnswered() {
    state.answered[`${state.lesson.id}:${state.scene}`] = true;
    showToast("Есть! Кадр принят.");
  }

  let toastTimer;
  function showToast(message) {
    const toast = document.querySelector("#scene-toast");
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function playBoom() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(115, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(42, context.currentTime + 0.32);
    filter.type = "lowpass";
    filter.frequency.value = 360;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.32, context.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42);
    oscillator.connect(filter).connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.45);
    soundButton.animate(
      [
        { transform: "scale(1) rotate(0)" },
        { transform: "scale(1.12) rotate(-2deg)", background: "#f4ff37", color: "#090b0f" },
        { transform: "scale(1) rotate(0)" }
      ],
      { duration: 420, easing: "cubic-bezier(.2,.9,.2,1)" }
    );
  }

  function route() {
    document.removeEventListener("keydown", lessonKeydown);
    state.lesson = null;
    const hash = location.hash || "#/";
    const lessonMatch = hash.match(/^#\/lesson\/([^/]+)$/);
    if (lessonMatch) {
      renderLesson(decodeURIComponent(lessonMatch[1]));
      return;
    }
    if (hash === "#lessons") renderHome("#lessons");
    else if (hash === "#about") renderHome("#about");
    else renderHome();
  }

  soundButton.addEventListener("click", playBoom);
  window.addEventListener("hashchange", route);
  route();
})();
