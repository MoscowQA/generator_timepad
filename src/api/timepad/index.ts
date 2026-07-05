/**
 * Публичная точка входа типизированного клиента Timepad API.
 *
 * ```ts
 * import { createTimepadClient, type TimepadSchemas } from '@/api/timepad';
 *
 * const timepad = createTimepadClient({ token });
 * const body: TimepadSchemas['CreateEvent'] = { ... };
 * ```
 */
export {
  createTimepadClient,
  TIMEPAD_BASE_URL,
  type TimepadClient,
  type TimepadClientConfig
} from './client';

export type { paths, components, operations } from './schema';

// Удобные алиасы, чтобы не писать `components['schemas'][...]` в коде приложения.
import type { components } from './schema';
export type TimepadSchemas = components['schemas'];
export type TimepadCreateEvent = components['schemas']['CreateEvent'];
export type TimepadEditEvent = components['schemas']['EditEvent'];
export type TimepadEventResponse = components['schemas']['EventResponse'];
export type TimepadIntrospect = components['schemas']['Introspect'];
export type TimepadOrganizationResponse = components['schemas']['OrganizationResponse'];
