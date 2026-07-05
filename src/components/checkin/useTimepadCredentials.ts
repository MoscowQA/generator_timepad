import { useCallback, useState } from 'react';

export interface TimepadCredentials {
  /** client_id приложения Timepad. */
  clientId: string;
  /** OAuth2 access token организатора (используется как Bearer). */
  token: string;
  /** id события, участников которого контролируем на входе. */
  eventId: string;
}

const STORAGE_KEY = 'timepad.credentials';

const EMPTY: TimepadCredentials = { clientId: '', token: '', eventId: '' };

function fromEnv(): TimepadCredentials {
  return {
    clientId: (import.meta.env.VITE_TIMEPAD_CLIENT_ID as string | undefined) ?? '',
    token: (import.meta.env.VITE_TIMEPAD_TOKEN as string | undefined) ?? '',
    eventId: (import.meta.env.VITE_TIMEPAD_EVENT_ID as string | undefined) ?? ''
  };
}

function load(): TimepadCredentials {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TimepadCredentials>;
      return { ...EMPTY, ...fromEnv(), ...parsed };
    }
  } catch {
    // localStorage недоступен или повреждён — используем env/пустые значения
  }
  return { ...EMPTY, ...fromEnv() };
}

/** Готовы ли креды для запроса заказов события (нужны токен и id события). */
export function isReady(c: TimepadCredentials): boolean {
  return Boolean(c.token.trim() && c.eventId.trim());
}

/**
 * Хранилище учётных данных Timepad в `localStorage` (с дефолтами из env).
 * Токен хранится в браузере — это удобно для дверного контроля с личного
 * устройства, но не подходит для публичного деплоя (см. README).
 */
export function useTimepadCredentials() {
  const [credentials, setCredentials] = useState<TimepadCredentials>(load);

  const save = useCallback((next: TimepadCredentials) => {
    const trimmed: TimepadCredentials = {
      clientId: next.clientId.trim(),
      token: next.token.trim(),
      eventId: next.eventId.trim()
    };
    setCredentials(trimmed);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // не критично — просто не сохранится между сессиями
    }
  }, []);

  const clear = useCallback(() => {
    setCredentials({ ...EMPTY });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // игнорируем
    }
  }, []);

  return { credentials, save, clear, ready: isReady(credentials) };
}
