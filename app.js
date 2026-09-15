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
    answered: Object.create(null),
    homeTimer: null
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
    clearInterval(state.homeTimer);
    state.homeTimer = null;

    const timeline = lessons.map((lesson, index) => {
      const ready = lesson.status === "ready";
      const body = `
        <article class="timeline-clip ${escapeHtml(lesson.color)}" data-ready="${ready}">
          <span class="clip-time">00:${String(index * 12).padStart(2, "0")}</span>
          <span class="clip-number">${escapeHtml(lesson.number)}</span>
          <div class="clip-copy">
            <span class="clip-label">${ready ? "Смена открыта" : "В производстве"}</span>
            <h3>${escapeHtml(lesson.title)}</h3>
            <p>${escapeHtml(lesson.summary)}</p>
          </div>
          <div class="clip-tags">${lesson.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
          <span class="clip-action">${ready ? "Смотреть →" : "Скоро"}</span>
        </article>`;
      return ready
        ? `<a class="timeline-link" href="#/lesson/${encodeURIComponent(lesson.id)}" aria-label="Открыть занятие: ${escapeHtml(lesson.title)}">${body}</a>`
        : `<div aria-label="Занятие готовится: ${escapeHtml(lesson.title)}">${body}</div>`;
    }).join("");

    main.innerHTML = `
      <section class="studio-entry" aria-labelledby="hero-title">
        <div class="entry-meta">
          <span>Школа медиа · 12+</span>
          <span class="entry-live"><i></i> Съёмочная площадка открыта</span>
          <span>Москва · Онлайн</span>
        </div>

        <div class="production-board">
          <div class="viewfinder" id="viewfinder">
            <div class="shot-feed" id="shot-feed" data-shot="general" role="img" aria-label="Подросток бежит по полю, общий план"></div>
            <div class="viewfinder-shade" aria-hidden="true"></div>
            <div class="frame-corner corner-tl" aria-hidden="true"></div>
            <div class="frame-corner corner-tr" aria-hidden="true"></div>
            <div class="frame-corner corner-bl" aria-hidden="true"></div>
            <div class="frame-corner corner-br" aria-hidden="true"></div>
            <div class="thirds-grid" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
            <div class="focus-mark" aria-hidden="true"><span></span></div>
            <div class="camera-status">
              <span class="record-state"><i></i><b id="record-label">STANDBY</b></span>
              <span id="home-timecode">00:00:00</span>
              <span>4K · 25P</span>
            </div>
            <img class="set-boom" src="./assets/boom-mic-hero.webp" alt="" aria-hidden="true" />

            <div class="viewfinder-copy">
              <p>Первое задание уже началось</p>
              <h1 id="hero-title">Не смотри сайт.<br /><em>Сними первый кадр.</em></h1>
            </div>

            <div class="countdown" id="countdown" aria-live="polite"></div>
            <button class="rec-trigger" id="rec-trigger" type="button">
              <span class="rec-button-dot"></span>
              <span><b>REC</b><small>нажми и войди в кадр</small></span>
            </button>
          </div>

          <aside class="camera-console" aria-label="Пульт оператора">
            <div class="console-brand"><strong>БУМ!</strong><span>КАДР</span></div>
            <div class="console-copy">
              <p class="console-kicker">Картинка говорит раньше тебя</p>
              <h2 id="shot-title">Начни с общего</h2>
              <p id="shot-copy">Он отвечает на первый вопрос зрителя: где всё происходит?</p>
            </div>
            <div class="shot-controls" aria-label="Выбор крупности кадра">
              <button type="button" data-shot="general" aria-pressed="true"><span>01</span> Общий</button>
              <button type="button" data-shot="medium" aria-pressed="false"><span>02</span> Средний</button>
              <button type="button" data-shot="close" aria-pressed="false"><span>03</span> Крупный</button>
            </div>
            <a class="console-next" href="#lessons">Перейти к занятиям <span>↓</span></a>
          </aside>
        </div>
      </section>

      <div class="production-tape" aria-hidden="true">
        <div>СМОТРИ / СЛУШАЙ / ПРОБУЙ / СНИМАЙ / МОНТИРУЙ / РАССКАЗЫВАЙ / СМОТРИ / СЛУШАЙ / ПРОБУЙ / СНИМАЙ / МОНТИРУЙ / РАССКАЗЫВАЙ /</div>
      </div>

      <section class="roles-rig" aria-labelledby="roles-title">
        <header class="rig-header">
          <div>
            <p class="eyebrow">Одна площадка — разные глаза</p>
            <h2 id="roles-title">Кем ты будешь<br />сегодня?</h2>
          </div>
          <p>На площадке нет главных и второстепенных. Каждый управляет своей частью истории.</p>
        </header>
        <div class="role-machine">
          <div class="role-switches" role="tablist" aria-label="Съёмочные профессии">
            <button type="button" role="tab" aria-selected="true" data-role="operator" data-word="ВИЖУ" data-copy="Решаю, что попадёт в кадр — и что зритель никогда не увидит."><span>01</span> Оператор</button>
            <button type="button" role="tab" aria-selected="false" data-role="reporter" data-word="СПРАШИВАЮ" data-copy="Нахожу вопрос, после которого человек перестаёт отвечать шаблоном."><span>02</span> Репортёр</button>
            <button type="button" role="tab" aria-selected="false" data-role="sound" data-word="СЛЫШУ" data-copy="Ловлю голос, паузу, шум и тот самый БУМ, который делает сцену живой."><span>03</span> Звук</button>
            <button type="button" role="tab" aria-selected="false" data-role="editor" data-word="СОБИРАЮ" data-copy="Соединяю кадры так, чтобы из кусочков появилась история."><span>04</span> Монтаж</button>
          </div>
          <div class="role-output" id="role-output" data-role="operator">
            <span class="role-code">ROLE_01</span>
            <strong id="role-word">ВИЖУ</strong>
            <div class="role-signal" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
            <p id="role-copy">Решаю, что попадёт в кадр — и что зритель никогда не увидит.</p>
          </div>
        </div>
      </section>

      <section class="cut-room" id="lessons" aria-labelledby="lessons-title">
        <header class="cut-header">
          <div>
            <p class="eyebrow">Курс собирается как фильм</p>
            <h2 id="lessons-title">Съёмочные<br />смены</h2>
          </div>
          <p>Не лекции и не папка с файлами. Каждый выпуск начинается с вопроса, продолжается экспериментом и заканчивается кадром, который сделал ты.</p>
        </header>
        <div class="timeline-ruler" aria-hidden="true"><span>00:00</span><span>00:12</span><span>00:24</span><span>00:36</span><span>00:48</span></div>
        <div class="lesson-timeline">${timeline}</div>
      </section>

      <section class="production-proof" id="about" aria-labelledby="about-title">
        <div class="proof-number"><strong>10</strong><span>лет<br />в эфире</span></div>
        <div class="proof-copy">
          <p class="eyebrow">Не имитация взрослой профессии</p>
          <h2 id="about-title">Из медиацентра —<br />в маленький продакшн.</h2>
          <p>Мы снимаем, выпускаем эфиры и учим детей работать по-настоящему: договариваться, ошибаться, переснимать и отвечать за результат.</p>
          <div class="proof-strip">
            <span><b>Камера</b> в руках</span>
            <span><b>Практика</b> с первого дня</span>
            <span><b>История</b> важнее кнопок</span>
          </div>
          <p class="proof-origin">БУМ.КАДР — образовательный проект команды Медиацентра Марфино.</p>
        </div>
      </section>`;

    document.body.classList.remove("teacher-mode");
    bindHomeInteractions();
    if (scrollTarget) {
      requestAnimationFrame(() => document.querySelector(scrollTarget)?.scrollIntoView({ block: "start" }));
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }

  function bindHomeInteractions() {
    const viewfinder = document.querySelector("#viewfinder");
    const recTrigger = document.querySelector("#rec-trigger");
    const countdown = document.querySelector("#countdown");
    const feed = document.querySelector("#shot-feed");
    const shotTitle = document.querySelector("#shot-title");
    const shotCopy = document.querySelector("#shot-copy");
    const recordLabel = document.querySelector("#record-label");
    const timecode = document.querySelector("#home-timecode");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shots = {
      general: {
        title: "Начни с общего",
        copy: "Он отвечает на первый вопрос зрителя: где всё происходит?",
        alt: "Подросток бежит по полю, общий план"
      },
      medium: {
        title: "Подойди ближе",
        copy: "Средний план показывает действие. Теперь мы понимаем, что делает герой.",
        alt: "Подросток бежит по полю, средний план"
      },
      close: {
        title: "Покажи человека",
        copy: "Крупный план впускает зрителя в эмоцию: дыхание, усилие, взгляд.",
        alt: "Лицо бегущего подростка, крупный план"
      }
    };

    if (viewfinder && !reducedMotion) {
      viewfinder.addEventListener("pointermove", (event) => {
        const rect = viewfinder.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        viewfinder.style.setProperty("--focus-x", `${x}%`);
        viewfinder.style.setProperty("--focus-y", `${y}%`);
      });
    }

    recTrigger?.addEventListener("click", () => {
      if (viewfinder.classList.contains("is-live")) return;
      recTrigger.disabled = true;
      viewfinder.classList.add("is-arming");
      const sequence = ["3", "2", "1", "СНИМАЕМ"];
      sequence.forEach((value, index) => {
        window.setTimeout(() => {
          countdown.textContent = value;
          if (index === sequence.length - 1) {
            viewfinder.classList.remove("is-arming");
            viewfinder.classList.add("is-live");
            recordLabel.textContent = "REC";
            recTrigger.querySelector("small").textContent = "камера работает";
            recTrigger.disabled = false;
            let seconds = 0;
            clearInterval(state.homeTimer);
            state.homeTimer = window.setInterval(() => {
              seconds += 1;
              timecode.textContent = `00:00:${String(seconds).padStart(2, "0")}`;
            }, 1000);
          }
        }, reducedMotion ? index * 80 : index * 520);
      });
    });

    document.querySelectorAll("[data-shot]").forEach((button) => {
      if (button === feed) return;
      button.addEventListener("click", () => {
        const shot = button.dataset.shot;
        if (!shots[shot]) return;
        feed.dataset.shot = shot;
        feed.setAttribute("aria-label", shots[shot].alt);
        shotTitle.textContent = shots[shot].title;
        shotCopy.textContent = shots[shot].copy;
        document.querySelectorAll(".shot-controls [data-shot]").forEach((item) => {
          item.setAttribute("aria-pressed", String(item === button));
        });
        viewfinder.classList.add("is-live");
        recordLabel.textContent = "REC";
      });
    });

    document.querySelectorAll("[data-role]").forEach((button) => {
      if (!button.matches(".role-switches button")) return;
      button.addEventListener("click", () => {
        document.querySelectorAll(".role-switches button").forEach((item) => {
          item.setAttribute("aria-selected", String(item === button));
        });
        const output = document.querySelector("#role-output");
        output.dataset.role = button.dataset.role;
        document.querySelector("#role-word").textContent = button.dataset.word;
        document.querySelector("#role-copy").textContent = button.dataset.copy;
        output.animate(
          [{ opacity: 0.25, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }],
          { duration: reducedMotion ? 1 : 280, easing: "cubic-bezier(.2,.8,.2,1)" }
        );
      });
    });
  }

  function renderLesson(lessonId) {
    clearInterval(state.homeTimer);
    state.homeTimer = null;
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
