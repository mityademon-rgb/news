# Устройство бота

Карта проверенных компонентов на 16.10.2026; конфигурация может измениться.

## Источники истины

| Область | Где |
|---|---|
| Реально исполняемые модули | `/opt/timecode-bot/timecode-bot` на production |
| Кодовая ветка | `mityademon-rgb/media-center-bot`, `feature/timecode-media-bot`, `timecode-bot/` |
| Operational CI, история, оператор сайта | `mityademon-rgb/news`, `boom-kadr-deploy` |
| База | `/var/lib/timecode-bot/timecode.db` |
| Секреты и runtime env | `/etc/timecode-bot.env`, читать/использовать только внутри разрешённой серверной операции, не выводить |
| Production паспорт | `/opt/timecode-bot/timecode-bot/PROJECT_AI_HANDBOOK.md` |

Production не воспроизводим одним старым HEAD: server.py modified, модули untracked. 16.10 подтверждён ранее работавший HEAD `799d465512286f1316cc5c0cb2d871badc82a359`; это не версия всех live-байтов. Исправление truth_game от 15 октября хранится в news scripts и runtime; не предполагать, что оно уже перенесено в canonical source.

## Runtime
Один Python процесс: HTTP Mini App, Telegram polling и scheduler; MAX webhook через HTTP. SQLite хранит пользователей, переклички, игровые состояния, расписание и outbox. Nginx проксирует `/tc/` на `127.0.0.1:8097`. Kimi вызывается через Moonshot. Watchdog/health guard могут автоматически перезапускать сервис и выполнять catch-up; не запускать их вручную для просмотра.

| Модуль | Назначение |
|---|---|
| server.py | Базовые функции HTTP/API, polling, scheduler, schema |
| notification_delivery.py | Текстовый/photo outbox, retries, недоступные адресаты |
| shared_media.py | Получение и перенос фото Telegram ↔ MAX, кэш |
| max_transport.py | MAX API, identity mapping, клавиатуры |
| playful_checkins.py | Настроения, фотоохота, переклички |
| creative_digest.py | Авторские am/pm выпуски, подписи, редакционная проверка, durable retry jobs |
| editorial_voice.py | Исторический редакционный слой, часть функций переопределяется |
| truth_game.py | Ежедневный факт/вымысел, ответ и публичный счёт |
| daily_status.py | Значки, ежедневные награды, история |
| chef_voice.py / CHEF_MEMORY.md | Персона Кими и память |
| kimi_weekend.py | Конкурсы выходных |
| chat_schedule.py / schedule_editor.py | Редактор расписания чатом и Mini App |
| admin_controls.py | Административные команды |
| quest_engine.py / weekend_quest.py | Квесты, некоторые кампании привязаны к датам |
| screenplay_coach.py / script_editor.py | Сценарные проекты и разборы |

`install(globals())` заменяет функции общей таблицы, сохраняя прежние в closure. Порядок установщиков важен. creative_digest установлен последним после kimi_weekend. При исправлении искать и базовую функцию, и её overrides; не переставлять модули вслепую.

## Данные
- notification_outbox: day, message_key, chat(JSON internal id), body, keyboard, delivered.
- notification_photo_outbox: day, period, chat, user_id, photo, caption, delivered.
- notification_unreachable: недоступные адресаты; содержит личные данные, наружу только агрегаты.
- kimi_editions: day, period, body, captions, created (Unix time).
- kimi_edition_jobs: day, period, attempts (отказы), next_at, status, reason, alerted.
- truth_daily: day → JSON question/answer/explanation/source; revision необязателен.
- truth_results: primary key(day,user_id), score; замена вопроса требует явного решения о прежних результатах.
- morning_checkins/evening_checkins: ответы/фото; не публиковать строки в Actions.
- sent: day,slot; запись слота не доказывает конечную доставку.
- messenger_identities: соответствие платформ internal id; отрицательный id сам по себе не доказывает MAX (бывают Telegram группы).

Перед SQL сверить schema mode=ro. Не выводить body, имена, IDs и детали ответов в публичные логи.

## Время
Известные редакционные слоты: утренний опрос в будни 07:30 / выходные 09:00, утренний таблоид 10:00, лайфхак 15:00, вечерний таблоид 20:30. Это отправная точка: конкретные игры, вечерние опросы, расписание занятий и overrides сверять с scheduler и БД. Не зашивать прежние даты квестов в новые кампании.


## 29.10.2026 — Наставник и разделение AI-маршрутов
Актуальный пакет scripts/mentor-20261029 в news/boom-kadr-deploy. mentor.install после monthly_games: контекст chat_reply, редакционная память в daily_content, личная память в прежнем bot_dialogue (48ч, 12 строк, в запрос 10), состояния собственных перекличек/игры, последняя рецензия фото. Личный контекст не переносить в групповой ответ. Группа: прямое обращение Кими/TIMECODE/@timemarphino_bot или ответ на сообщение бота, cooldown группы 12с, участника 20с. Команды/права/stage-механики прежние.

AI provider: текст DeepSeek Flash, реальные фото — исходный Moonshot vision. search_pro использует исходные Moonshot credentials, не DeepSeek. creative_digest.provider_json теперь проходит через общий kimi_request/персону. CHEF_MEMORY.md содержит единый голос, исторические промпты сохранены только в backup. Фактчек отделён от стиля. Утро использует durable outbox, вечер сохраняет ключ evening-checkin; опубликованное не пересылать ради проверки.

Текущий график: 07:30 будни/09:00 выходные, итог 10:00, лайфхак 15:00, мини-игра через день 16:00, truth 17:00, вечерняя перекличка 18:00, итог 20:30. Условия датированной месячной кампании прежние; требуются новые проверенные факты до окончания банка 27.11. При AI-сбое основная механика работает с нейтральным уведомлением, не со старой банкой шуток.

Временные API-пробы — только synthetic данные без server import и мессенджерных send. 15 offline tests включают голоса/устаревшие кнопки/две платформы и vision bytes. После установки обязательны service, live hashes, оба health, Telegram/MAX me и delivered/pending/unreachable. Backup pointer /opt/timecode-bot/mentor-latest-backup-path; откат только кода/памяти, не полной БД. Фактический исход выкладки — в PROJECT_CHANGELOG и текущем bot handbook.
