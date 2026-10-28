# Диагностика, исправления, доставка

## Доступ
Использовать подключённый GitHub: fetch/fetch_file для чтения, create_tree → create_commit → update_ref(expected_sha) для адресного fast-forward. Независимые чтения объединять, изменения выполнять последовательно. Если ветка ушла вперёд — заново прочитать HEAD/затронутые файлы, не force.

Проверенный канал к bot production — отдельные разрешённые владельцем GitHub Actions в news/boom-kadr-deploy через существующий secret BOOM_SSH_KEY. Ключ не извлекать и не копировать в пакет. Не запускать старые workflows как универсальную диагностику: многие рестартуют сервис, меняют БД и рассылают сообщения. Проверить trigger paths до commit: push нового workflow может сразу выполнить его.

Подключённые producer_server_* и amsterdam_* имеют разные серверы и права. Наличие инструмента не означает, что он управляет bot host 217.149.24.242. Сверять host и каталог. Если конкретный канал ограничен read-only — соблюдать ограничение; не пробовать обойти его через shell, Node, SSH или CI.

## Проверка «что с Telegram»
1. GET `https://timecode-lab.ru/tc/health` и local `http://127.0.0.1:8097/health` из разрешённого server context. HEAD может вернуть 501.
2. `systemctl show timecode-bot.service`: ActiveState, SubState, ExecMainStartTimestamp, NRestarts, MainPID. Не рестартовать ради проверки.
3. Проверить getMe и getWebhookInfo с секретом внутри сервера. Вывести только ok, transport status, latency, webhook_set, pending count. Не печатать URL с BOT_TOKEN, username/ID, webhook URL или raw provider response.
4. Не вызывать getUpdates: параллельный poller может перехватывать сообщения и вызывать 409. Не вызывать setWebhook/deleteWebhook.
5. Journal читать только для категории/времени ошибки: Telegram transport, Poll, Update, timeout, TLS, 409, scheduler, Kimi. Не публиковать сообщения детей и сырой traceback с данными.
6. SQLite `file:...?mode=ro`: quick_check, агрегаты обеих outbox по платформе/статусу, sent slots, jobs status/attempts/alerted, kimi_editions.created. Internal id не публиковать; MAX определять по messenger_identities.
7. Отличать внешний сбой Telegram от провала Kimi, отсутствия scheduler tick, недоступного пользователя и ошибки переноса фото. «Не найдено в логах» не равно доказанному отсутствию проблемы.
8. В статусе назвать время проверки МСК. Для «работает сейчас» получить свежие данные, не пересказывать прошлый день.

Проверенные read-only скрипты в news:
- scripts/telegram-diagnostic-20261016.py — API, service/health, журнал-категории, агрегаты;
- scripts/telegram-diagnostic-details-20261016.py — фиксированные reason-коды, время подготовки выпусков, polling source.
Эти пути — стартовые образцы, прочитать перед запуском. Не запускать diagnostic через import server: install может менять БД. Не включать секретные env и пользовательские строки в output. Новый пакет не включает копии скриптов: поддерживаемый код находится в Git.

## Изменения
1. Проверить конкретную причину и действующие инструкции. Текущее поручение и ранее выданные разрешения определяют scope; навык не добавляет разрешений на restart, DB write или рассылку.
2. Сохранить затронутые live-файлы и SHA; перед DB write сделать консистентный SQLite backup, права 0600, backup dir 0700. Не копировать live DB обычным cp при активных записях/WAL.
3. Исправить минимально, сначала canonical source и временная БД/mocked transport. Если есть live drift — адресный patch с проверкой anchors/hash; сохранить и документировать расхождение.
4. Тестировать фактический риск: stale buttons, duplicate callbacks, очереди >40, JSON truncation, WebP, повтор после restart. Не отправлять тесты детям.
5. В news в том же commit обновить PROJECT_CHANGELOG; workflow/операции/архитектура также PROJECT_AI_HANDBOOK. Запустить `bash scripts/check-project-documentation.sh HEAD WORKTREE` (или пару commit в CI), `git diff --check`, релевантный py_compile/unittest. Не отключать guard.
6. После публикации проверить live-файлы/хеши, сервис и обе платформы. Для рассылки вывести delivered=1/0/-1 по Telegram/MAX и по текстам/фото. Не перезапускать уже успешную рассылку ради красивого лога.
7. Откат кода не отзывает сообщения и не отменяет DB writes. Полный DB snapshot не восстанавливать поверх новой активности. Откатывать адресно, не reset/clean.

## Повторы Кими
В creative_digest.py job сохраняется в kimi_edition_jobs. После отказа паузы 30 секунд, 90 секунд, после третьего отказа admin alert через outbox и дальнейшие попытки каждые 15 минут в текущие сутки. Повторы не должны пересылать уже подтверждённые сообщения. `attempts=6` означает шесть отказов; success может быть следующей попыткой.

Alert — уведомление о состоянии на тот момент, не доказательство текущей поломки. Job done и запись kimi_editions показывают успешную подготовку; отдельно сверять delivery outbox. При улучшении диагностики выдавать фиксированные этапы/причины без пользовательского текста, отдельное уведомление о восстановлении добавлять только в рамках задачи.

## Backup pointers (сверять существование)
- /opt/timecode-bot/creative-digest-latest-backup-path
- /opt/timecode-bot/creative-review-repair-latest-backup-path
- /opt/timecode-bot/evening-queue-latest-backup-path
- /opt/timecode-bot/truth-correction-latest-backup-path

Прочитать pointer, проверить соответствие файлам и дате, затем составить адресный rollback. Не предполагать, что любой последний backup подходит любому модулю.

## DeepSeek: подтверждённый переход 29 октября 2026

Текстовый provider теперь DeepSeek Flash (AI_TEXT_PROVIDER=deepseek, DEEPSEEK_MODEL=deepseek-flash), ai_provider.install перед chef_voice. Фото остаются Moonshot. Creative digest имеет собственный direct JSON transport, поэтому для миграций недостаточно заменить только kimi_request. Backup code/env pointer /opt/timecode-bot/deepseek-latest-backup-path. Три synthetic пробы/две routing tests PASS, Actions 40774169490 success; service/оба HTTP health/оба messenger API подтверждены 00:44 МСК. Это историческая проверка, не статус сейчас. Не повторять одноразовый deploy: envelope private удалён после успеха, исходник охраняется SHA. Секретов в Git нет; ciphertext из текущего дерева удалён. Details docs/ai/2026-10-29-deepseek-switch.md. Первые пробы не доказывают улучшения качества, реальный таблоид проходит editor check.
