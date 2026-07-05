import createClient, { type Client, type ClientOptions } from 'openapi-fetch';
import type { paths } from './schema';

/**
 * Полностью типизированный клиент Timepad API.
 *
 * Типы (`paths`, `components`) генерируются из `openapi/timepad.json` командой
 * `npm run generate:api`, а `openapi-fetch` превращает их в клиент, где пути,
 * query-параметры, тело запроса и ответы проверяются компилятором.
 *
 * Пример:
 * ```ts
 * const timepad = createTimepadClient({ token: import.meta.env.VITE_TIMEPAD_TOKEN });
 * const { data, error } = await timepad.GET('/v1/events', {
 *   params: { query: { limit: 10, organization_ids: [12345] } }
 * });
 * ```
 */

export const TIMEPAD_BASE_URL = 'https://api.timepad.ru';

export type TimepadClient = Client<paths>;

export interface TimepadClientConfig extends Omit<ClientOptions, 'baseUrl'> {
  /** OAuth2 access token организатора. Передаётся как `Authorization: Bearer <token>`. */
  token?: string;
  /** Переопределить базовый URL (например, для тестового окружения или прокси). */
  baseUrl?: string;
}

/**
 * Создаёт типизированный клиент Timepad API.
 *
 * Если передан `token`, он подставляется в заголовок `Authorization` каждого
 * запроса через middleware, поэтому токен не нужно повторять на каждом вызове.
 */
export function createTimepadClient(config: TimepadClientConfig = {}): TimepadClient {
  const { token, baseUrl = TIMEPAD_BASE_URL, ...options } = config;

  const client = createClient<paths>({ baseUrl, ...options });

  if (token) {
    client.use({
      onRequest({ request }) {
        request.headers.set('Authorization', `Bearer ${token}`);
        return request;
      }
    });
  }

  return client;
}
