import React, { useState } from 'react';
import { isReady, type TimepadCredentials } from './useTimepadCredentials';

interface TimepadAuthFormProps {
  initial: TimepadCredentials;
  onSave: (credentials: TimepadCredentials) => void;
  onClear: () => void;
  onCancel?: () => void;
}

const inputClass =
  'mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500';

export const TimepadAuthForm: React.FC<TimepadAuthFormProps> = ({
  initial,
  onSave,
  onClear,
  onCancel
}) => {
  const [form, setForm] = useState<TimepadCredentials>(initial);
  const [showToken, setShowToken] = useState(false);

  const set = (key: keyof TimepadCredentials) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const ready = isReady(form);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ready) onSave(form);
  };

  return (
    <form
      onSubmit={submit}
      className="mb-6 space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5"
    >
      <div>
        <h3 className="font-semibold text-gray-800">Авторизация Timepad</h3>
        <p className="text-sm text-gray-500">
          Введите client_id и токен организатора, чтобы загрузить участников события.
        </p>
      </div>

      <div>
        <label htmlFor="tp-client-id" className="block text-sm font-medium text-gray-700">
          Client ID
        </label>
        <input
          id="tp-client-id"
          value={form.clientId}
          onChange={set('clientId')}
          autoComplete="off"
          className={inputClass}
          placeholder="Идентификатор приложения"
        />
      </div>

      <div>
        <label htmlFor="tp-token" className="block text-sm font-medium text-gray-700">
          Токен <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <input
            id="tp-token"
            type={showToken ? 'text' : 'password'}
            value={form.token}
            onChange={set('token')}
            autoComplete="off"
            className={`${inputClass} pr-16`}
            placeholder="OAuth2 access token"
          />
          <button
            type="button"
            onClick={() => setShowToken(s => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-blue-600"
          >
            {showToken ? 'Скрыть' : 'Показать'}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="tp-event-id" className="block text-sm font-medium text-gray-700">
          ID события <span className="text-rose-500">*</span>
        </label>
        <input
          id="tp-event-id"
          value={form.eventId}
          onChange={set('eventId')}
          inputMode="numeric"
          autoComplete="off"
          className={inputClass}
          placeholder="Например: 1234567"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={!ready}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          Подключиться
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-white"
          >
            Отмена
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          className="ml-auto text-sm text-rose-600 hover:underline"
        >
          Очистить
        </button>
      </div>

      <p className="text-xs text-gray-400">
        Токен хранится только в этом браузере (localStorage). Не используйте на общем устройстве.
      </p>
    </form>
  );
};

export default TimepadAuthForm;
