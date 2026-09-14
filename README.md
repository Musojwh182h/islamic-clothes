# SABR — интернет-магазин мужской исламской одежды

Текущий этап проекта: витрина React с мок-каталогом, сохраняемой гостевой корзиной и рабочей авторизацией по одноразовому коду, плюс фундамент асинхронных микросервисов.

## Стек

- **Frontend:** React 19, TypeScript, Vite. Адаптивная витрина, выбор размеров, локальная корзина.
- **Backend:** отдельные FastAPI-сервисы `catalog-api`, `auth-api`, `orders-api`; SQLAlchemy 2 (async), asyncpg, Pydantic Settings.
- **Авторизация:** SMS OTP с TTL и rate limit в Redis, пользователи и refresh-сессии в PostgreSQL, JWT access-token и HttpOnly refresh-cookie.
- **Данные и процессы:** PostgreSQL, Redis (кэш и временные SMS-коды), RabbitMQ (фоновые события: SMS, письма, статусы заказов).
- **Миграции:** Alembic.
- **Локальная инфраструктура:** Docker Compose.

В дальнейшем рекомендую добавить `httpx` для внешних HTTP-сервисов, `PyJWT` + `pwdlib[argon2]` для токенов, `arq` или отдельный consumer для фоновых задач RabbitMQ, `structlog` + Sentry для наблюдаемости, MinIO/S3 для фотографий. Для админки сначала рационально взять SQLAdmin поверх FastAPI, затем при необходимости сделать отдельную React-панель.

## Запуск

### Инфраструктура и API

```powershell
docker compose up --build
```

После старта: каталог API — `http://localhost:8101/docs`, auth API — `http://localhost:8102/docs`, orders API — `http://localhost:8103/docs`; интерфейс RabbitMQ — `http://localhost:15673` (логин `app`, пароль из `POSTGRES_PASSWORD` или значение по умолчанию). Внешние PostgreSQL и Redis доступны на `5433` и `6380`, чтобы не пересекаться со стандартными сервисами на компьютере.

Чтобы переопределить значения, скопируйте `.env.example` в `.env` и укажите свои. Реальные ключи SMS и платежей в Git не попадают.

### Витрина

```powershell
cd frontend
npm install
npm run dev
```

Откройте `http://localhost:5173`.

## Контракт первого этапа

- `GET http://localhost:8101/health` — проверяет доступность PostgreSQL у `catalog-api`.
- `GET http://localhost:8101/api/v1/catalog/products` — временный API-контракт мок-каталога.
- Устройство сервисов и правила владения данными: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Авторизация в локальном режиме

1. Нажмите «Войти» в шапке магазина.
2. Введите российский номер телефона.
3. При `SMS_PROVIDER=mock` шестизначный тестовый код появится прямо в форме. Он также виден в `docker compose logs notification-worker`.
4. После проверки пользователь создаётся в `auth_db`. Refresh-токен хранится в HttpOnly cookie и недоступен JavaScript.

Основные маршруты `auth-api`:

- `POST /api/v1/auth/request-code`
- `POST /api/v1/auth/verify-code`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

## Следующие этапы

1. ORM-модели, Alembic-миграции, реальный каталог и хранение изображений.
2. Серверная корзина, заказ, остатки и интеграция оплаты в рублях (например, ЮKassa — после предоставления реквизитов).
3. Админка: управление товарами/фото/размерами, заказами, статусами и клиентами; аудит действий администратора.
