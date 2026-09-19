(function () {
  "use strict";

  const lessons = window.TIMECODE_LESSONS || window.BOOM_LESSONS || [];
  const main = document.querySelector("#main");
  const soundButton = document.querySelector("#sound-check");
  const year = document.querySelector("#year");
  const state = {
    lesson: null,
    scene: 0,
    teacherMode: false,
    answered: Object.create(null),
    homeTimer: null,
    sceneTimer: null
  };

  year.textContent = new Date().getFullYear();

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const teacherNote = (type, customText) => {
    const notes = {
      cover: "Не объясняйте тему заранее. Прочитайте обещание результата и сразу переходите к следующему экрану.",
      compare: "Сначала соберите ответы детей. Нажимайте вариант только после того, как прозвучат их аргументы.",
      rule: "Не заучиваем формулировки. Просим привести один собственный пример на каждый пункт.",
      practice: "Дайте чёткий лимит времени. После съёмки выберите 2–3 работы без публичного разбора ошибок конкретного ребёнка.",
      choice: "Просите не только выбрать ответ, но и закончить фразу: «Я выбрал так, потому что…».",
      "choice-image": "Дайте десять секунд на молчаливое решение, затем попросите показать ответ одновременно.",
      finish: "В финале каждый называет одно правило, которое применит в следующей съёмке."
    };
    return `<aside class="teacher-note"><strong>Режиссура занятия.</strong> ${escapeHtml(customText || notes[type] || notes.rule)}</aside>`;
  };

  function clearSceneTimer() {
    if (state.sceneTimer) clearInterval(state.sceneTimer);
    state.sceneTimer = null;
  }

  function renderHomeLegacy(scrollTarget) {
    clearSceneTimer();
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
          <span>Лаборатория креативных медиа · 12+</span>
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
            <div class="console-brand"><strong>TIME</strong><span>:CODE</span></div>
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
            <button type="button" role="tab" aria-selected="false" data-role="sound" data-word="СЛЫШУ" data-copy="Ловлю голос, паузу, шум и тот самый момент, который делает сцену живой."><span>03</span> Звук</button>
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
          <p class="proof-origin">TIMECODE — лаборатория креативных медиа Медиацентра Марфино.</p>
        </div>
      </section>`;

    document.body.classList.remove("teacher-mode");
    bindHomeInteractionsLegacy();
    if (scrollTarget) {
      requestAnimationFrame(() => document.querySelector(scrollTarget)?.scrollIntoView({ block: "start" }));
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }

  function bindHomeInteractionsLegacy() {
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

  function renderHome(scrollTarget) {
    clearSceneTimer();
    clearInterval(state.homeTimer);
    state.homeTimer = null;

    const readyLessons = lessons.filter((lesson) => lesson.status === "ready");
    const latestLesson = readyLessons.at(-1) || lessons[0];
    const cards = lessons.map((lesson) => {
      const ready = lesson.status === "ready";
      const card = `
        <article class="course-card course-card-${escapeHtml(lesson.color)}" data-ready="${ready}">
          <div class="course-card-photo">
            <img src="${escapeHtml(lesson.cover || "./assets/camera-hero.webp")}" alt="" loading="lazy" />
            <span class="course-card-number">${escapeHtml(lesson.number)}</span>
            <span class="course-card-status">${ready ? "Можно смотреть" : "Скоро"}</span>
          </div>
          <div class="course-card-copy">
            <p>${escapeHtml(lesson.eyebrow)}</p>
            <h3>${escapeHtml(lesson.title)}</h3>
            <div class="course-card-tags">${lesson.tags.slice(0, 3).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
            <span class="course-card-action">${ready ? "Открыть урок" : "Готовим урок"}<b>${ready ? "→" : "…"}</b></span>
          </div>
        </article>`;
      return ready
        ? `<a class="course-card-link" href="#/lesson/${encodeURIComponent(lesson.id)}" aria-label="Открыть урок ${escapeHtml(lesson.number)}: ${escapeHtml(lesson.title)}">${card}</a>`
        : `<div class="course-card-link is-disabled" aria-label="Урок ${escapeHtml(lesson.number)} готовится">${card}</div>`;
    }).join("");

    const latestLink = latestLesson && latestLesson.status === "ready"
      ? `#/lesson/${encodeURIComponent(latestLesson.id)}`
      : "#lessons";
    const latestTitle = latestLesson ? latestLesson.title : "Первый урок скоро";
    const latestNumber = latestLesson ? latestLesson.number : "01";

    main.innerHTML = `
      <section class="title-stage" aria-labelledby="hero-title">
        <div class="title-stage-copy">
          <div class="title-badges" aria-label="Лаборатория креативных медиа, возраст 12 плюс">
            <span>Медиацентр Марфино</span><b>12+</b><i><em></em> Лаборатория в эфире</i>
          </div>
          <h1 class="timecode-title" id="hero-title" aria-label="TIMECODE — лаборатория креативных медиа">
            <span class="timecode-title-mark" aria-hidden="true"><i></i><i></i></span>
            <strong>TIME<span>:</span>CODE</strong>
            <small>Лаборатория креативных медиа</small>
          </h1>
          <p class="title-action-line"><b>Смотри.</b><b>Слушай.</b><b>Снимай.</b></p>
          <div class="title-buttons">
            <a class="title-primary" href="${latestLink}"><span>Урок ${escapeHtml(latestNumber)}</span>${escapeHtml(latestTitle)} <b>→</b></a>
            <a class="title-secondary" href="#lessons">Все уроки ↓</a>
          </div>
        </div>

        <div class="title-stage-picture" aria-hidden="true">
          <div class="camera-flash"></div>
          <img class="title-camera" src="./assets/camera-hero.webp" alt="" />
          <img class="title-mic" src="./assets/boom-mic-hero.webp" alt="" />
          <span class="title-sticker sticker-rec"><i></i> REC</span>
          <span class="title-sticker sticker-take">ДУБЛЬ 1</span>
          <span class="title-sticker sticker-ready">ГОТОВЫ?</span>
          <div class="title-frame"><i></i><i></i><i></i><i></i></div>
        </div>
      </section>

      <div class="boom-ticker" aria-hidden="true">
        <div>КАМЕРА · МИКРОФОН · СВЕТ · ИДЕЯ · ИНТЕРВЬЮ · МОНТАЖ · КАМЕРА · МИКРОФОН · СВЕТ · ИДЕЯ · ИНТЕРВЬЮ · МОНТАЖ ·</div>
      </div>

      <section class="course-library" id="lessons" aria-labelledby="lessons-title">
        <header class="library-header">
          <div>
            <p class="eyebrow">Библиотека будет расти</p>
            <h2 id="lessons-title">Выбирай<br />урок</h2>
          </div>
          <p><strong>${readyLessons.length}</strong> готово · <strong>${lessons.length}</strong> в программе</p>
        </header>
        <div class="course-grid">${cards}</div>
      </section>

      <section class="studio-about" id="about" aria-labelledby="about-title">
        <div class="about-splash" aria-hidden="true"><span>10</span><b>лет<br />в эфире</b></div>
        <div class="about-copy">
          <p class="eyebrow">Лаборатория TIMECODE</p>
          <h2 id="about-title">Здесь не играют<br />в телевидение.</h2>
          <p>Здесь снимают, задают вопросы, ошибаются, переснимают и выпускают настоящие истории.</p>
          <div class="about-chips">
            <span>Камера в руках</span><span>Практика сразу</span><span>История важнее кнопок</span>
          </div>
        </div>
      </section>`;

    document.body.classList.remove("teacher-mode", "lesson-active");
    document.body.classList.add("home-active");
    bindTitleInteractions();
    if (scrollTarget) {
      requestAnimationFrame(() => document.querySelector(scrollTarget)?.scrollIntoView({ block: "start" }));
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }

  function bindTitleInteractions() {
    const stage = document.querySelector(".title-stage-picture");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (stage && !reducedMotion) {
      stage.addEventListener("pointermove", (event) => {
        const rect = stage.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        stage.style.setProperty("--hero-x", `${(x - 50) / 50}`);
        stage.style.setProperty("--hero-y", `${(y - 50) / 50}`);
      });
    }
  }

  function renderLesson(lessonId) {
    clearSceneTimer();
    clearInterval(state.homeTimer);
    state.homeTimer = null;
    const lesson = lessons.find((item) => item.id === lessonId && item.status === "ready");
    if (!lesson) {
      renderHome();
      return;
    }

    state.lesson = lesson;
    document.body.classList.remove("home-active");
    document.body.classList.add("lesson-active");
    const storedValue = localStorage.getItem(`timecode:${lesson.id}:scene`)
      ?? localStorage.getItem(`boom-kadr:${lesson.id}:scene`);
    const stored = Number(storedValue);
    state.scene = Number.isInteger(stored) && stored >= 0 && stored < lesson.scenes.length ? stored : 0;

    main.innerHTML = `
      <section class="lesson-shell lesson-${escapeHtml(lesson.color)} lesson-${escapeHtml(lesson.id)}" aria-label="Занятие ${escapeHtml(lesson.number)}: ${escapeHtml(lesson.title)}">
        <div class="lesson-toolbar">
          <a class="back-link" href="#/">← Уроки</a>
          <span class="lesson-code">УРОК ${escapeHtml(lesson.number)}</span>
          <div class="progress-wrap">
            <span class="progress-caption">Монтажная линия</span>
            <div class="progress-track" aria-hidden="true"><div class="progress-bar" id="progress-bar"></div></div>
            <span class="progress-label" id="progress-label"></span>
          </div>
          <button class="fullscreen-toggle" id="fullscreen-toggle" type="button" aria-pressed="false" aria-label="Развернуть занятие на весь экран" title="На весь экран (F)"><span aria-hidden="true">⛶</span><b>На весь экран</b></button>
          <button class="teacher-toggle" id="teacher-toggle" type="button" aria-pressed="false" aria-label="Включить подсказки педагогу">Педагогу</button>
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
    document.querySelector("#fullscreen-toggle").addEventListener("click", toggleFullscreen);
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
    if (event.key.toLowerCase() === "f") toggleFullscreen();
    if (event.key === "Escape" && document.body.classList.contains("presentation-mode")) {
      document.body.classList.remove("presentation-mode");
      updateFullscreenButton();
    }
  }

  function fullscreenActive() {
    return Boolean(document.fullscreenElement || document.webkitFullscreenElement || document.body.classList.contains("presentation-mode"));
  }

  function updateFullscreenButton() {
    const button = document.querySelector("#fullscreen-toggle");
    if (!button) return;
    const active = fullscreenActive();
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", active ? "Выйти из полноэкранного режима" : "Развернуть занятие на весь экран");
    button.title = active ? "Выйти из полноэкранного режима (F)" : "На весь экран (F)";
    button.querySelector("span").textContent = active ? "↙" : "⛶";
    button.querySelector("b").textContent = active ? "Выйти" : "На весь экран";
  }

  async function toggleFullscreen() {
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
    if (fullscreenElement) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) await exit.call(document);
      return;
    }

    if (document.body.classList.contains("presentation-mode")) {
      document.body.classList.remove("presentation-mode");
      updateFullscreenButton();
      showToast("Обычный режим");
      return;
    }

    const target = document.querySelector(".lesson-shell");
    const request = target?.requestFullscreen || target?.webkitRequestFullscreen;
    if (request) {
      try {
        await request.call(target, { navigationUI: "hide" });
        window.setTimeout(updateFullscreenButton, 300);
        return;
      } catch (error) {
        try {
          await request.call(target);
          window.setTimeout(updateFullscreenButton, 300);
          return;
        } catch (fallbackError) {
          // Some mobile browsers expose the method but reject non-video elements.
        }
      }
    }

    document.body.classList.add("presentation-mode");
    updateFullscreenButton();
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast("Включён режим показа");
  }

  function toggleTeacherMode() {
    state.teacherMode = !state.teacherMode;
    document.body.classList.toggle("teacher-mode", state.teacherMode);
    const button = document.querySelector("#teacher-toggle");
    button.setAttribute("aria-pressed", String(state.teacherMode));
    button.textContent = state.teacherMode ? "Ученику" : "Педагогу";
    button.setAttribute("aria-label", state.teacherMode ? "Скрыть подсказки педагогу" : "Включить подсказки педагогу");
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
    localStorage.setItem(`timecode:${state.lesson.id}:scene`, String(state.scene));
    drawScene();
  }

  function drawScene() {
    clearSceneTimer();
    const scene = state.lesson.scenes[state.scene];
    const target = document.querySelector("#scene-content");
    target.innerHTML = sceneTemplate(scene);
    bindSceneActions(scene);

    const progress = ((state.scene + 1) / state.lesson.scenes.length) * 100;
    document.querySelector("#progress-bar").style.width = `${progress}%`;
    document.querySelector("#progress-label").textContent = `КАДР ${String(state.scene + 1).padStart(2, "0")} / ${String(state.lesson.scenes.length).padStart(2, "0")}`;
    document.querySelector("#prev-scene").disabled = state.scene === 0;
    const next = document.querySelector("#next-scene");
    next.textContent = state.scene === state.lesson.scenes.length - 1 ? "К занятиям →" : "Дальше →";
    document.querySelector("#scene-dots").innerHTML = state.lesson.scenes
      .map((_, index) => `<span class="scene-dot ${index === state.scene ? "active" : ""}"></span>`)
      .join("");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function sceneTemplate(scene) {
    const sceneLabels = {
      cover: "Вход в тему",
      compare: "Смотрим и сравниваем",
      rule: "Разбираем приём",
      practice: "Снимаем сами",
      choice: "Решение редакции",
      "choice-image": "Визуальный тест",
      finish: "Смена закрыта",
      magic: "Визуальная история"
    };
    const sceneNumber = String(state.scene + 1).padStart(2, "0");
    const totalScenes = String(state.lesson.scenes.length).padStart(2, "0");
    const copy = `
      <div class="scene-copy">
        <div class="scene-meta"><span>КАДР ${sceneNumber} / ${totalScenes}</span><span>${escapeHtml(sceneLabels[scene.type] || "Задание")}</span></div>
        <p class="eyebrow">${escapeHtml(scene.kicker || "TIMECODE")}</p>
        <h2>${escapeHtml(scene.title)}</h2>
        ${scene.text ? `<p>${escapeHtml(scene.text)}</p>` : ""}
        ${scene.accent ? `<div class="scene-accent">${escapeHtml(scene.accent)}</div>` : ""}
        ${teacherNote(scene.type, scene.teacher)}
      </div>`;

    if (scene.type === "cover") {
      return `<article class="scene scene-cover">${copy}<div class="cover-slate" aria-hidden="true">
        <img src="${escapeHtml(state.lesson.cover || "./assets/camera-hero.webp")}" alt="" />
        <div class="cover-slate-shade"></div>
        <span class="cover-rec"><i></i> REC</span>
        <span class="cover-number">${escapeHtml(state.lesson.number)}</span>
        <div class="cover-frame"><i></i><i></i><i></i><i></i></div>
        <div class="cover-caption"><b>TIMECODE</b><span>${escapeHtml(state.lesson.title)}</span></div>
      </div></article>`;
    }

    if (scene.type === "magic") {
      return magicSceneTemplate(scene, copy);
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

  function magicSceneTemplate(scene, copy) {
    const layout = scene.layout || "statement";
    const image = (extraClass = "") => scene.image
      ? `<div class="magic-photo ${extraClass}"><img src="${escapeHtml(scene.image)}" alt="${escapeHtml(scene.imageAlt || scene.title)}" />${scene.badge ? `<span class="magic-badge">${escapeHtml(scene.badge)}</span>` : ""}</div>`
      : "";
    const hint = scene.nextHint ? `<p class="next-answer-hint"><span>→</span>${escapeHtml(scene.nextHint)}</p>` : "";
    const pickButtons = (scene.options || []).map((option, index) => `<button type="button" data-pick="${index}"><span>${escapeHtml(option)}</span></button>`).join("");
    let stage = "";

    if (layout === "promise" || layout === "statement") {
      stage = `<div class="magic-type-card"><span class="magic-spark">✦</span><strong>${escapeHtml(scene.accent || scene.text || "Смотрите внимательнее")}</strong><i></i><i></i><i></i></div>`;
    } else if (layout === "image") {
      stage = image("magic-photo-wide");
    } else if (layout === "question") {
      const pictures = scene.images
        ? `<div class="magic-compare">${scene.images.map((item) => `<figure><img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.label)}" /><figcaption>${escapeHtml(item.label)}</figcaption></figure>`).join("")}</div>`
        : image("magic-photo-question");
      stage = `${pictures}<div class="magic-picks">${pickButtons}</div><p class="pick-feedback" aria-live="polite"></p>${hint}`;
    } else if (layout === "answer-cards") {
      stage = `<div class="magic-answer-grid">${scene.items.map((item, index) => `<div><span>0${index + 1}</span><strong>${escapeHtml(item[0])}</strong><p>${escapeHtml(item[1])}</p></div>`).join("")}</div>`;
    } else if (layout === "plans") {
      stage = `${image("magic-photo-wide")}<div class="magic-label-row">${scene.labels.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}</div>`;
    } else if (layout === "plan") {
      stage = `<div class="plan-focus">${image()}<div class="plan-question"><span>${escapeHtml(scene.question)}</span><p>${escapeHtml(scene.text)}</p></div></div>`;
    } else if (layout === "steps") {
      stage = `<div class="magic-steps">${scene.items.map((item) => `<div><span>${escapeHtml(item[0])}</span><strong>${escapeHtml(item[1])}</strong></div>`).join("")}</div>`;
    } else if (layout === "timer") {
      const seconds = Number(scene.seconds) || 420;
      stage = `<div class="lesson-timer" data-seconds="${seconds}" data-remaining="${seconds}"><span class="timer-display">${formatTime(seconds)}</span><div class="timer-ring" aria-hidden="true"><i></i></div><div class="timer-actions"><button type="button" data-timer-start>Запустить таймер</button><button type="button" data-timer-reset>Сбросить</button></div></div>`;
    } else if (layout === "check") {
      stage = `<div class="magic-checks">${scene.items.map((item) => `<div><span>✓</span><strong>${escapeHtml(item[0])}</strong><p>${escapeHtml(item[1])}</p></div>`).join("")}</div>`;
    } else if (layout === "big-question") {
      stage = `${image("magic-photo-question")}<div class="question-mark">?</div>${hint}`;
    } else if (layout === "grid") {
      stage = `<div class="magic-photo grid-photo"><img src="${escapeHtml(scene.image)}" alt="${escapeHtml(scene.imageAlt)}" /><div class="composition-grid" aria-hidden="true"><i></i><i></i><i></i><i></i></div><span class="grid-point p1"></span><span class="grid-point p2"></span><span class="grid-point p3"></span><span class="grid-point p4"></span></div>`;
    } else if (layout === "answer-photo") {
      stage = `${image("magic-photo-answer")}<ol class="photo-callouts">${scene.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
    } else if (layout === "gaze") {
      stage = `<div class="magic-photo gaze-photo"><img src="${escapeHtml(scene.image)}" alt="${escapeHtml(scene.imageAlt)}" /><div class="gaze-air"><span>место для взгляда</span><i>→</i></div></div>`;
    } else if (layout === "air") {
      stage = `<div class="air-compare">${scene.images.map((item, index) => `<figure class="${index ? "good" : "bad"}"><img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.label)}" /><figcaption>${escapeHtml(item.label)}</figcaption></figure>`).join("")}</div>`;
    } else if (layout === "before-after") {
      stage = `${image("magic-photo-wide")}<div class="before-after-labels"><span>${escapeHtml(scene.labels[0])}</span><span>${escapeHtml(scene.labels[1])}</span></div>`;
    } else if (layout === "game-intro") {
      stage = `<div class="game-orbit"><span>1</span><span>2</span><span>3</span><strong>?</strong></div>`;
    } else if (layout === "shots-question") {
      stage = `${image("magic-photo-wide")}<div class="shot-word-bank">${scene.options.map((option) => `<span>${escapeHtml(option)}</span>`).join("")}</div>${hint}`;
    } else if (layout === "shots-answer") {
      stage = `${image("magic-photo-wide")}<div class="shot-answer-labels">${scene.labels.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}</div>`;
    } else if (layout === "storyboard") {
      stage = `${image("magic-photo-wide video-storyboard")}<div class="video-shot-strip">${scene.labels.map((label, index) => `<span><b>${index + 1}</b>${escapeHtml(label)}</span>`).join("")}</div>`;
    } else if (layout === "sequence-builder") {
      const shuffled = scene.shuffle || [3, 0, 5, 2, 1, 4];
      const sequenceStyle = `--sequence-image:url('${escapeHtml(scene.image)}')`;
      stage = `<div class="sequence-builder" data-sequence-builder style="${sequenceStyle}">
        <div class="sequence-player">
          <div class="sequence-frame" data-sequence-frame data-shot="0"></div>
          <div class="sequence-player-bar"><span>REC</span><strong data-sequence-status>Нажимайте кадры в нужном порядке</strong></div>
        </div>
        <div class="sequence-order" data-sequence-order>${scene.labels.map((_, index) => `<span>${index + 1}</span>`).join("")}</div>
        <div class="sequence-cards">${shuffled.map((shot) => `<button type="button" class="sequence-card" data-sequence-shot="${shot}"><span class="video-shot" data-shot="${shot}"></span><b>${escapeHtml(scene.labels[shot])}</b><i></i></button>`).join("")}</div>
        <div class="sequence-actions"><button type="button" data-sequence-reset>Сбросить</button><button type="button" class="sequence-play" data-sequence-play disabled>Собрать и включить ▶</button></div>
        <p class="sequence-feedback" data-sequence-feedback aria-live="polite">Сначала выберите все шесть кадров.</p>
      </div>`;
    } else if (layout === "quiz") {
      stage = `<div class="magic-quiz">${pickButtons}</div><p class="pick-feedback" aria-live="polite"></p>${hint}`;
    }

    const layoutClass = layout === "steps"
      ? "magic-step-screen"
      : layout === "quiz"
        ? "magic-quiz-screen"
        : `magic-${escapeHtml(layout)}`;
    return `<article class="scene scene-magic ${layoutClass}">${copy}<div class="scene-visual magic-stage">${stage}</div></article>`;
  }

  function formatTime(totalSeconds) {
    const safe = Math.max(0, Number(totalSeconds) || 0);
    return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
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

    document.querySelectorAll("[data-pick]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-pick]").forEach((item) => item.classList.remove("is-selected"));
        button.classList.add("is-selected");
        const feedback = document.querySelector(".pick-feedback");
        if (feedback) feedback.textContent = "Выбор зафиксирован. Проверяем в следующем кадре →";
        document.querySelector("#next-scene")?.classList.add("is-ready");
        showToast("Выбор принят. Ответ — дальше.");
      });
    });

    const sequenceBuilder = document.querySelector("[data-sequence-builder]");
    if (sequenceBuilder) {
      const cards = Array.from(sequenceBuilder.querySelectorAll("[data-sequence-shot]"));
      const slots = Array.from(sequenceBuilder.querySelectorAll("[data-sequence-order] span"));
      const playButton = sequenceBuilder.querySelector("[data-sequence-play]");
      const resetButton = sequenceBuilder.querySelector("[data-sequence-reset]");
      const preview = sequenceBuilder.querySelector("[data-sequence-frame]");
      const status = sequenceBuilder.querySelector("[data-sequence-status]");
      const feedback = sequenceBuilder.querySelector("[data-sequence-feedback]");
      const order = [];
      const correctOrder = scene.correctOrder || [0, 1, 2, 3, 4, 5];

      const resetSequence = () => {
        clearSceneTimer();
        order.splice(0, order.length);
        cards.forEach((card) => {
          card.disabled = false;
          card.classList.remove("is-selected");
          card.querySelector("i").textContent = "";
        });
        slots.forEach((slot, index) => {
          slot.textContent = String(index + 1);
          slot.classList.remove("is-filled");
        });
        sequenceBuilder.classList.remove("is-correct", "is-wrong", "is-playing");
        preview.dataset.shot = "0";
        status.textContent = "Нажимайте кадры в нужном порядке";
        feedback.textContent = "Сначала выберите все шесть кадров.";
        playButton.disabled = true;
      };

      cards.forEach((card) => {
        card.addEventListener("click", () => {
          const shot = Number(card.dataset.sequenceShot);
          if (order.includes(shot) || order.length >= correctOrder.length) return;
          order.push(shot);
          card.classList.add("is-selected");
          card.querySelector("i").textContent = String(order.length);
          slots[order.length - 1].textContent = scene.labels[shot];
          slots[order.length - 1].classList.add("is-filled");
          playButton.disabled = order.length !== correctOrder.length;
          feedback.textContent = order.length === correctOrder.length
            ? "Последовательность готова. Включаем?"
            : `Выбрано ${order.length} из ${correctOrder.length}.`;
        });
      });

      resetButton.addEventListener("click", resetSequence);
      playButton.addEventListener("click", () => {
        clearSceneTimer();
        cards.forEach((card) => { card.disabled = true; });
        playButton.disabled = true;
        sequenceBuilder.classList.add("is-playing");
        let cursor = 0;
        const showShot = () => {
          const shot = order[cursor];
          preview.dataset.shot = String(shot);
          status.textContent = `${cursor + 1}/6 · ${scene.labels[shot]}`;
          cursor += 1;
          if (cursor < order.length) return;
          clearSceneTimer();
          sequenceBuilder.classList.remove("is-playing");
          const correct = order.every((shot, index) => shot === correctOrder[index]);
          sequenceBuilder.classList.add(correct ? "is-correct" : "is-wrong");
          status.textContent = correct ? "Сцена читается!" : "История прыгает";
          feedback.textContent = correct
            ? "Да: место → герой → деталь → реакция → действие → финал."
            : "Порядок пока сбивает смысл. Сбросьте и попробуйте выстроить причину и реакцию.";
          if (correct) markAnswered();
          cards.forEach((card) => { card.disabled = correct; });
          playButton.disabled = correct;
        };
        showShot();
        state.sceneTimer = window.setInterval(showShot, 900);
      });
    }

    const timer = document.querySelector(".lesson-timer");
    const timerStart = document.querySelector("[data-timer-start]");
    const timerReset = document.querySelector("[data-timer-reset]");
    const updateTimer = () => {
      if (!timer) return;
      const remaining = Number(timer.dataset.remaining);
      timer.querySelector(".timer-display").textContent = formatTime(remaining);
      timer.style.setProperty("--timer-progress", String(1 - (remaining / Number(timer.dataset.seconds))));
      timer.classList.toggle("is-urgent", remaining <= 30);
    };
    const pauseTimer = () => {
      clearSceneTimer();
      timer?.classList.remove("is-running");
      if (timerStart) timerStart.textContent = "Продолжить";
    };
    timerStart?.addEventListener("click", () => {
      if (state.sceneTimer) {
        pauseTimer();
        return;
      }
      timer.classList.add("is-running");
      timerStart.textContent = "Пауза";
      state.sceneTimer = window.setInterval(() => {
        const remaining = Math.max(0, Number(timer.dataset.remaining) - 1);
        timer.dataset.remaining = String(remaining);
        updateTimer();
        if (remaining === 0) {
          pauseTimer();
          timerStart.textContent = "Время вышло";
          playBoom();
          showToast("Стоп! Выбираем лучшие кадры.");
        }
      }, 1000);
    });
    timerReset?.addEventListener("click", () => {
      clearSceneTimer();
      if (!timer) return;
      timer.dataset.remaining = timer.dataset.seconds;
      timer.classList.remove("is-running", "is-urgent");
      timerStart.textContent = "Запустить таймер";
      updateTimer();
    });
    updateTimer();
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
    document.body.classList.remove("presentation-mode");
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

  soundButton?.addEventListener("click", playBoom);
  document.querySelectorAll(".mobile-menu a").forEach((link) => {
    link.addEventListener("click", () => link.closest("details")?.removeAttribute("open"));
  });
  window.addEventListener("hashchange", route);
  document.addEventListener("fullscreenchange", updateFullscreenButton);
  document.addEventListener("webkitfullscreenchange", updateFullscreenButton);
  route();
})();
