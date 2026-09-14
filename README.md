# SABR — интернет-магазин мужской исламской одежды

Текущий этап проекта: витрина React с каталогом из PostgreSQL, сохраняемой гостевой корзиной, авторизацией по одноразовому коду и отдельным media-сервисом для товарных изображений в MinIO. Модели заказов и платежей подготовлены в отдельной БД.

## Стек

- **Frontend:** React 19, TypeScript, Vite. Адаптивная витрина, выбор размеров, локальная корзина.
- **Backend:** отдельные FastAPI-сервисы `catalog-api`, `auth-api`, `orders-api`, `media-api`; SQLAlchemy 2 (async), asyncpg, Pydantic Settings.
- **Авторизация:** SMS OTP с TTL и rate limit в Redis, пользователи и refresh-сессии в PostgreSQL, JWT access-token и HttpOnly refresh-cookie.
- **Каталог:** товары, ключи фотографий, размерные варианты, SKU и остатки в `catalog_db`; цены хранятся целым числом копеек.
- **Медиа:** MinIO/S3 для файлов, отдельный пользователь с минимальными правами, публичное чтение только известных ключей товарных изображений и защищённая ролью `admin` загрузка через `media-api`.
- **Заказы:** корзины пользователей, снимки товарных позиций, история статусов и платежи в `orders_db`.
- **Данные и процессы:** PostgreSQL, Redis (кэш и временные SMS-коды), RabbitMQ (фоновые события: SMS, письма, статусы заказов).
- **Миграции:** Alembic.
- **Локальная инфраструктура:** Docker Compose с постоянными volumes для PostgreSQL, Redis, RabbitMQ и MinIO.

Следующие компоненты также делаются с production-подходом: строгие API-контракты, миграции без ручного изменения БД, разграничение ролей, аудит, идемпотентность, health checks и секреты только через окружение. Требования к публичному развёртыванию описаны в [docs/PRODUCTION.md](docs/PRODUCTION.md).

## Запуск

### Инфраструктура и API

```powershell
docker compose up --build
```

После старта:

- каталог API — `http://localhost:8101/docs`;
- auth API — `http://localhost:8102/docs`;
- orders API — `http://localhost:8103/docs`;
- media API — `http://localhost:8104/docs`;
- MinIO API — `http://localhost:9000`, консоль — `http://localhost:9001`;
- RabbitMQ — `http://localhost:15673`.

Внешние PostgreSQL и Redis доступны на `5433` и `6380`, чтобы не пересекаться со стандартными сервисами на компьютере.

Перед совместной или публичной установкой скопируйте `.env.example` в `.env` и замените все пароли и секреты. `.env` исключён из Git. Значения MinIO по умолчанию предназначены только для локального запуска.

### Витрина

```powershell
cd frontend
npm install
npm run dev
```

Откройте `http://localhost:5173`.

## API-контракты

- `GET http://localhost:8101/health` — проверяет доступность PostgreSQL у `catalog-api`.
- `GET http://localhost:8101/api/v1/catalog/products` — активные товары и доступные размеры из PostgreSQL.
- `GET http://localhost:8101/api/v1/catalog/products/{slug}` — карточка одного товара.
- `GET http://localhost:8104/health` — проверяет доступность bucket в MinIO.
- `POST http://localhost:8104/api/v1/media/images` — загружает JPEG/PNG/WebP, нормализует в WebP и требует access token пользователя с ролью `admin`.
- `DELETE http://localhost:8104/api/v1/media/images/{object_key}` — удаляет объект и требует роль `admin`.
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

1. Админка: управление товарами, фотографиями через готовый `media-api`, размерами, остатками и ценами; роли и аудит действий.
2. API серверной корзины и создание заказов из подготовленных моделей.
3. Интеграция оплаты в рублях (например, ЮKassa — после предоставления реквизитов).
