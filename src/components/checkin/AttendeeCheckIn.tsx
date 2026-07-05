import React, { useMemo, useRef, useState } from 'react';
import { useAttendees } from './useAttendees';
import type { Attendee, ReviewRecord } from './model';

/** Порог свайпа в пикселях, после которого решение засчитывается. */
const SWIPE_THRESHOLD = 110;
const FLY_MS = 240;

const AVATAR_COLORS = [
  'bg-rose-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-sky-500',
  'bg-indigo-500',
  'bg-fuchsia-500'
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
}

function colorFor(id: number): string {
  return AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length];
}

interface CardFaceProps {
  attendee: Attendee;
  style?: React.CSSProperties;
  overlay?: 'accept' | 'skip' | null;
  dimmed?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

const CardFace: React.FC<CardFaceProps> = ({ attendee, style, overlay, dimmed, onPointerDown }) => (
  <div
    onPointerDown={onPointerDown}
    className={`absolute inset-0 select-none rounded-2xl border border-gray-200 bg-white shadow-xl ${
      onPointerDown ? 'cursor-grab active:cursor-grabbing touch-none' : ''
    } ${dimmed ? 'opacity-60' : ''}`}
    style={style}
  >
    {/* Overlay-метки решения */}
    {overlay === 'accept' && (
      <div className="absolute left-5 top-5 rotate-[-12deg] rounded-lg border-4 border-emerald-500 px-3 py-1 text-2xl font-black text-emerald-500">
        ПРИНЯТЬ
      </div>
    )}
    {overlay === 'skip' && (
      <div className="absolute right-5 top-5 rotate-[12deg] rounded-lg border-4 border-rose-500 px-3 py-1 text-2xl font-black text-rose-500">
        СКИП
      </div>
    )}

    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div
        className={`flex h-28 w-28 items-center justify-center rounded-full text-4xl font-bold text-white ${colorFor(
          attendee.id
        )}`}
      >
        {initials(attendee.name)}
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900">{attendee.name}</h3>
        <p className="mt-1 text-gray-600">{attendee.ticketType}</p>
      </div>
      <div className="w-full space-y-1 text-sm text-gray-500">
        {attendee.ticketNumber && (
          <p>
            Билет: <span className="font-medium text-gray-700">{attendee.ticketNumber}</span>
          </p>
        )}
        {attendee.email && <p>{attendee.email}</p>}
        {attendee.status && (
          <span className="mt-2 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            {attendee.status}
          </span>
        )}
      </div>
    </div>
  </div>
);

interface ResultsProps {
  records: ReviewRecord[];
  total: number;
  onRestart: () => void;
}

const Results: React.FC<ResultsProps> = ({ records, total, onRestart }) => {
  const accepted = records.filter(r => r.decision === 'accepted');
  const skipped = records.filter(r => r.decision === 'skipped');
  const [copied, setCopied] = useState(false);

  const json = useMemo(() => JSON.stringify(records, null, 2), [records]);

  const copy = () => {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const download = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checkin-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-emerald-50 p-4 text-center">
          <div className="text-3xl font-bold text-emerald-600">{accepted.length}</div>
          <div className="text-sm text-emerald-700">Принято</div>
        </div>
        <div className="rounded-xl bg-rose-50 p-4 text-center">
          <div className="text-3xl font-bold text-rose-600">{skipped.length}</div>
          <div className="text-sm text-rose-700">Скип</div>
        </div>
      </div>
      <p className="text-center text-sm text-gray-500">
        Обработано {records.length} из {total}
      </p>

      {skipped.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-gray-800">Скип с комментариями</h3>
          <ul className="space-y-2">
            {skipped.map(r => (
              <li key={r.attendee.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="font-medium text-gray-800">{r.attendee.name}</div>
                <div className="text-sm text-gray-600">
                  {r.comment ? (
                    r.comment
                  ) : (
                    <span className="italic text-gray-400">без комментария</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {accepted.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-gray-800">Принятые</h3>
          <ul className="flex flex-wrap gap-2">
            {accepted.map(r => (
              <li
                key={r.attendee.id}
                className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800"
              >
                {r.attendee.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3 border-t pt-4">
        <button
          onClick={copy}
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
        >
          {copied ? 'Скопировано ✓' : 'Скопировать JSON'}
        </button>
        <button
          onClick={download}
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
        >
          Скачать JSON
        </button>
        <button
          onClick={onRestart}
          className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Начать заново
        </button>
      </div>
    </div>
  );
};

export const AttendeeCheckIn: React.FC = () => {
  const { attendees, loading, source, error } = useAttendees();

  const [index, setIndex] = useState(0);
  const [records, setRecords] = useState<ReviewRecord[]>([]);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [flyDir, setFlyDir] = useState<-1 | 0 | 1>(0);
  const [pendingSkip, setPendingSkip] = useState<Attendee | null>(null);
  const [comment, setComment] = useState('');

  const startX = useRef(0);
  const busy = useRef(false);

  const current = attendees[index];
  const next = attendees[index + 1];
  const done = !loading && index >= attendees.length;

  const advance = () => {
    setIndex(i => i + 1);
    setDrag(0);
    setFlyDir(0);
    busy.current = false;
  };

  const accept = () => {
    if (!current || busy.current) return;
    busy.current = true;
    setFlyDir(1);
    const record: ReviewRecord = {
      attendee: current,
      decision: 'accepted',
      decidedAt: new Date().toISOString()
    };
    setTimeout(() => {
      setRecords(r => [...r, record]);
      advance();
    }, FLY_MS);
  };

  const requestSkip = () => {
    if (!current || busy.current) return;
    busy.current = true;
    setFlyDir(-1);
    setTimeout(() => {
      setPendingSkip(current);
      setComment('');
    }, FLY_MS);
  };

  const confirmSkip = () => {
    if (!pendingSkip) return;
    const record: ReviewRecord = {
      attendee: pendingSkip,
      decision: 'skipped',
      comment: comment.trim() || undefined,
      decidedAt: new Date().toISOString()
    };
    setRecords(r => [...r, record]);
    setPendingSkip(null);
    setComment('');
    advance();
  };

  const undo = () => {
    if (records.length === 0 || busy.current || pendingSkip) return;
    setRecords(r => r.slice(0, -1));
    setIndex(i => Math.max(0, i - 1));
    setDrag(0);
  };

  // --- drag handlers ---
  const onPointerDown = (e: React.PointerEvent) => {
    if (busy.current || pendingSkip) return;
    setDragging(true);
    startX.current = e.clientX;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDrag(e.clientX - startX.current);
  };

  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (drag > SWIPE_THRESHOLD) {
      accept();
    } else if (drag < -SWIPE_THRESHOLD) {
      requestSkip();
    } else {
      setDrag(0);
    }
  };

  const overlay: 'accept' | 'skip' | null = drag > 40 ? 'accept' : drag < -40 ? 'skip' : null;

  const topTransform = (() => {
    if (flyDir !== 0) {
      return `translateX(${flyDir * 600}px) rotate(${flyDir * 25}deg)`;
    }
    return `translateX(${drag}px) rotate(${drag / 20}deg)`;
  })();

  return (
    <div>
      <div className="mb-4 flex items-center justify-end">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            source === 'timepad' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {source === 'timepad' ? 'Данные из Timepad' : 'Образцы'}
        </span>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Не удалось загрузить из Timepad: {error}. Показаны образцы.
        </p>
      )}

      {loading ? (
        <div className="py-20 text-center text-gray-500">Загрузка участников…</div>
      ) : done ? (
        <Results
          records={records}
          total={attendees.length}
          onRestart={() => {
            setIndex(0);
            setRecords([]);
          }}
        />
      ) : (
        <>
          {/* Прогресс */}
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-sm text-gray-500">
              <span>
                {index + 1} / {attendees.length}
              </span>
              <button
                onClick={undo}
                disabled={records.length === 0 || !!pendingSkip}
                className="text-blue-600 disabled:text-gray-300"
              >
                ↩ Отменить
              </button>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${(index / attendees.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Стек карточек */}
          <div
            className="relative mx-auto h-96 max-w-sm"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {pendingSkip ? (
              <div className="absolute inset-0 flex flex-col rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-xl">
                <h3 className="text-lg font-semibold text-rose-800">Скип: {pendingSkip.name}</h3>
                <p className="mb-2 text-sm text-rose-600">Добавьте комментарий (необязательно)</p>
                <textarea
                  autoFocus
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={4}
                  placeholder="Например: нет в списке, просрочен билет, дубль регистрации…"
                  className="w-full flex-1 resize-none rounded-lg border border-rose-200 p-3 focus:border-rose-400 focus:outline-none"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setPendingSkip(null);
                      setComment('');
                      setDrag(0);
                      setFlyDir(0);
                      busy.current = false;
                    }}
                    className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-white"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={confirmSkip}
                    className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
                  >
                    Скипнуть
                  </button>
                </div>
              </div>
            ) : (
              <>
                {next && (
                  <CardFace
                    attendee={next}
                    dimmed
                    style={{ transform: 'scale(0.95) translateY(12px)' }}
                  />
                )}
                {current && (
                  <CardFace
                    attendee={current}
                    overlay={overlay}
                    onPointerDown={onPointerDown}
                    style={{
                      transform: topTransform,
                      transition: dragging ? 'none' : `transform ${FLY_MS}ms ease-out`
                    }}
                  />
                )}
              </>
            )}
          </div>

          {/* Кнопки */}
          {!pendingSkip && (
            <div className="mt-6 flex items-center justify-center gap-6">
              <button
                onClick={requestSkip}
                aria-label="Скип"
                className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-rose-200 bg-white text-2xl text-rose-500 shadow-md transition hover:bg-rose-50"
              >
                ✕
              </button>
              <button
                onClick={accept}
                aria-label="Принять"
                className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-200 bg-white text-2xl text-emerald-500 shadow-md transition hover:bg-emerald-50"
              >
                ✓
              </button>
            </div>
          )}
          <p className="mt-4 text-center text-xs text-gray-400">
            Свайп вправо — принять, влево — скип с комментарием
          </p>
        </>
      )}
    </div>
  );
};

export default AttendeeCheckIn;
