import { useEffect, useState } from 'react';
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
}

const token = import.meta.env.VITE_TIMEPAD_TOKEN as string | undefined;
const eventId = import.meta.env.VITE_TIMEPAD_EVENT_ID as string | undefined;

/**
 * Загружает участников события.
 *
 * Если заданы `VITE_TIMEPAD_TOKEN` и `VITE_TIMEPAD_EVENT_ID`, тянет реальные
 * заказы через типизированный клиент (`GET /v1/events/{event_id}/orders`).
 * Иначе (или при ошибке сети) возвращает образцовых участников, чтобы UI
 * оставался рабочим локально.
 */
export function useAttendees(): AttendeesState {
  const [state, setState] = useState<AttendeesState>({
    attendees: [],
    loading: Boolean(token && eventId),
    source: 'sample'
  });

  useEffect(() => {
    if (!token || !eventId) {
      setState({ attendees: SAMPLE_ATTENDEES, loading: false, source: 'sample' });
      return;
    }

    let cancelled = false;
    const client = createTimepadClient({ token });

    (async () => {
      try {
        const { data, error } = await client.GET('/v1/events/{event_id}/orders', {
          params: { path: { event_id: Number(eventId) }, query: { limit: 100 } }
        });
        if (cancelled) return;
        if (error || !data) {
          throw new Error(typeof error === 'string' ? error : 'Не удалось загрузить заказы');
        }
        const attendees = attendeesFromOrders(data.values ?? []);
        setState({
          attendees: attendees.length ? attendees : SAMPLE_ATTENDEES,
          loading: false,
          source: attendees.length ? 'timepad' : 'sample',
          error: attendees.length ? undefined : 'Заказов не найдено — показаны образцы'
        });
      } catch (e) {
        if (cancelled) return;
        setState({
          attendees: SAMPLE_ATTENDEES,
          loading: false,
          source: 'sample',
          error: e instanceof Error ? e.message : String(e)
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
