import { useCallback, useEffect, useState } from 'react';
import { createTimepadClient } from '@/api/timepad';
import { attendeesFromOrders, SAMPLE_ATTENDEES, type Attendee } from './model';

export type AttendeesSource = 'timepad' | 'sample';

export interface AttendeesState {
  attendees: Attendee[];
  loading: boolean;
  /** Откуда взяты данные: живой Timepad или образцы. */
  source: AttendeesSource;
  /** Текст ошибки загрузки (если был фолбэк на образцы). */
  error?: string;
  /** Перезагрузить участников из Timepad. */
  reload: () => void;
}

export interface UseAttendeesOptions {
  token?: string;
  eventId?: string;
  /** Показывать образцы, пока не введены креды (иначе — пустой экран). */
  sampleFallback?: boolean;
}

/**
 * Загружает участников события.
 *
 * Если заданы `token` и `eventId`, тянет реальные заказы через типизированный
 * клиент (`GET /v1/events/{event_id}/orders`). Иначе (или при ошибке сети)
 * возвращает образцовых участников, чтобы UI оставался рабочим.
 */
export function useAttendees({
  token,
  eventId,
  sampleFallback = true
}: UseAttendeesOptions): AttendeesState {
  const hasCreds = Boolean(token && eventId);

  const [state, setState] = useState<Omit<AttendeesState, 'reload'>>({
    attendees: sampleFallback ? SAMPLE_ATTENDEES : [],
    loading: hasCreds,
    source: 'sample'
  });

  const load = useCallback(
    (signal: { cancelled: boolean }) => {
      if (!token || !eventId) {
        setState({
          attendees: sampleFallback ? SAMPLE_ATTENDEES : [],
          loading: false,
          source: 'sample'
        });
        return;
      }

      setState(s => ({ ...s, loading: true, error: undefined }));
      const client = createTimepadClient({ token });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      (async () => {
        try {
          const { data, error } = await client.GET('/v1/events/{event_id}/orders', {
            params: { path: { event_id: Number(eventId) }, query: { limit: 100 } },
            signal: controller.signal
          });
          clearTimeout(timeout);
          if (signal.cancelled) return;
          if (error || !data) {
            throw new Error(typeof error === 'string' ? error : 'Не удалось загрузить заказы');
          }
          const attendees = attendeesFromOrders(data.values ?? []);
          const useSamples = attendees.length === 0 && sampleFallback;
          setState({
            attendees: useSamples ? SAMPLE_ATTENDEES : attendees,
            loading: false,
            source: attendees.length ? 'timepad' : 'sample',
            error: useSamples ? 'Заказов не найдено — показаны образцы' : undefined
          });
        } catch (e) {
          clearTimeout(timeout);
          if (signal.cancelled) return;
          const aborted = e instanceof DOMException && e.name === 'AbortError';
          setState({
            attendees: sampleFallback ? SAMPLE_ATTENDEES : [],
            loading: false,
            source: 'sample',
            error: aborted
              ? 'Превышено время ожидания Timepad'
              : e instanceof Error
                ? e.message
                : String(e)
          });
        }
      })();

      return () => {
        clearTimeout(timeout);
        controller.abort();
      };
    },
    [token, eventId, sampleFallback]
  );

  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey(k => k + 1), []);

  useEffect(() => {
    const signal = { cancelled: false };
    const cleanup = load(signal);
    return () => {
      signal.cancelled = true;
      cleanup?.();
    };
  }, [load, reloadKey]);

  return { ...state, reload };
}
