# Типизированный клиент Timepad API

Автогенерируемый TypeScript-клиент публичного [Timepad API](https://dev.timepad.ru/api/)
для будущей интеграции: сейчас генератор формирует HTML-анонс вручную, а этот
модуль позволит публиковать/редактировать событие в Timepad напрямую.

## Из чего состоит

| Файл | Назначение |
| --- | --- |
| `../../../openapi/timepad.json` | OpenAPI 3.0 спецификация — **единственный источник истины** |
| `schema.d.ts` | Автогенерируемые типы (`paths`, `components`, `operations`). **Не редактировать руками** |
| `client.ts` | Фабрика `createTimepadClient()` поверх [`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/) |
| `index.ts` | Публичные экспорты и удобные алиасы типов |

Связка [`openapi-typescript`](https://openapi-ts.dev/) (типы, dev-зависимость) +
[`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/) (рантайм, ~6 КБ, без
кодогенерации) даёт полностью типобезопасный клиент: путь, query-параметры, тело
запроса и форму ответа проверяет компилятор.

## Регенерация типов

Файл `schema.d.ts` закоммичен, поэтому сборка не требует сети. Перегенерировать
после изменения спецификации:

```bash
npm run generate:api
```

Спецификация восстановлена по официальному swagger-сгенерированному SDK
[`timepad/timepad-sdk-php`](https://github.com/timepad/timepad-sdk-php). Когда
Timepad опубликует официальный OpenAPI-файл, достаточно заменить им
`openapi/timepad.json` и снова выполнить `npm run generate:api`.

## Использование

```ts
import { createTimepadClient, type TimepadCreateEvent } from '@/api/timepad';

const timepad = createTimepadClient({
  token: import.meta.env.VITE_TIMEPAD_TOKEN, // OAuth2 access token организатора
});

// Проверить токен и получить организации
const { data: me } = await timepad.GET('/introspect');

// Найти события организации
const { data, error } = await timepad.GET('/v1/events', {
  params: { query: { organization_ids: [me!.organizations![0].id!], limit: 20 } },
});
if (error) throw error;
console.log(data.values);

// Создать событие
const body: TimepadCreateEvent = {
  organization: { id: 12345 },
  name: 'Moscow QA Meetup',
  starts_at: '2026-09-15T19:00:00+03:00',
  description_html: '<p>Анонс...</p>',
  location: { city: 'Москва', address: 'ул. Льва Толстого, 16' },
  access_status: 'public',
};
const created = await timepad.POST('/v1/events', { body });
```

`openapi-fetch` возвращает `{ data, error, response }` без исключений на HTTP-ошибках —
проверяйте `error` перед использованием `data`.

## Аутентификация

Timepad использует OAuth2 Bearer-токен: `Authorization: Bearer <token>`. Токен
организатора берётся из личного кабинета. Передайте его один раз в
`createTimepadClient({ token })` — middleware добавит заголовок ко всем запросам.

> Не храните токен в коде. Используйте переменные окружения Vite
> (`VITE_TIMEPAD_TOKEN`) и держите их вне репозитория.

## Покрытые эндпоинты

- `GET /introspect` — информация о владельце токена
- `GET /v1/events`, `POST /v1/events` — поиск и создание событий
- `GET /v1/events/{event_id}`, `POST /v1/events/{event_id}` — просмотр и редактирование события
- `GET|POST /v1/events/{event_id}/orders`, `GET|PATCH /v1/events/{event_id}/orders/{order_id}` — заказы
- `POST /v1/organizations` — создание организации
- `GET|POST /v1/organizations/{organization_id}/hooks`, `GET|POST /.../hooks/{hook_id}` — webhook'и
