import type { components } from '@/api/timepad';

type RegistrationOrderResponse = components['schemas']['RegistrationOrderResponse'];

/** Решение контролёра по участнику. */
export type Decision = 'accepted' | 'skipped';

/** Плоская вью-модель участника для карточки «Tinder». */
export interface Attendee {
  /** id заказа/регистрации в Timepad (или синтетический для образцов). */
  id: number;
  orderId: number;
  ticketNumber?: string;
  name: string;
  ticketType: string;
  email?: string;
  registeredAt?: string;
  /** Статус заказа (paid/ok/...) из Timepad. */
  status?: string;
}

/** Запись результата прохода по одному участнику. */
export interface ReviewRecord {
  attendee: Attendee;
  decision: Decision;
  comment?: string;
  decidedAt: string;
}

const ANSWER_NAME_KEYS = ['name', 'Name', 'Имя', 'fio', 'ФИО', 'full_name'];
const ANSWER_SURNAME_KEYS = ['surname', 'Surname', 'Фамилия', 'last_name'];
const ANSWER_MAIL_KEYS = ['mail', 'email', 'e-mail', 'Email', 'Почта'];

function pick(answers: Record<string, string> | undefined, keys: string[]): string | undefined {
  if (!answers) return undefined;
  for (const k of keys) {
    if (answers[k]) return answers[k];
  }
  return undefined;
}

/**
 * Преобразует заказ Timepad (`RegistrationOrderResponse`) в участника для карточки.
 * Имя/почта берутся из ответов на вопросы регистрации (ключи вопросов у каждого
 * организатора свои, поэтому проверяем несколько распространённых вариантов).
 */
export function attendeeFromOrder(order: RegistrationOrderResponse): Attendee {
  const ticket = order.tickets?.[0];
  const answers = (ticket?.answers ?? order.answers) as Record<string, string> | undefined;

  const name = pick(answers, ANSWER_NAME_KEYS);
  const surname = pick(answers, ANSWER_SURNAME_KEYS);
  const fullName = [name, surname].filter(Boolean).join(' ').trim();

  return {
    id: order.id ?? ticket?.id ?? 0,
    orderId: order.id ?? 0,
    ticketNumber: ticket?.number,
    name: fullName || `Заказ №${order.id ?? '—'}`,
    ticketType: ticket?.ticket_type?.name ?? 'Билет',
    email: pick(answers, ANSWER_MAIL_KEYS),
    registeredAt: order.created_at,
    status: order.status?.title ?? order.status?.name
  };
}

/** Массовый маппинг заказов в участников. */
export function attendeesFromOrders(orders: RegistrationOrderResponse[]): Attendee[] {
  return orders.map(attendeeFromOrder);
}

/** Образцовые участники — используются, пока не подключён живой Timepad API. */
export const SAMPLE_ATTENDEES: Attendee[] = [
  {
    id: 1001,
    orderId: 1001,
    ticketNumber: 'A-1001',
    name: 'Анна Королёва',
    ticketType: 'Офлайн — участник',
    email: 'anna.k@example.com',
    registeredAt: '2026-09-01T12:14:00+03:00',
    status: 'Оплачен'
  },
  {
    id: 1002,
    orderId: 1002,
    ticketNumber: 'A-1002',
    name: 'Дмитрий Соколов',
    ticketType: 'Офлайн — участник',
    email: 'd.sokolov@example.com',
    registeredAt: '2026-09-02T09:41:00+03:00',
    status: 'Оплачен'
  },
  {
    id: 1003,
    orderId: 1003,
    ticketNumber: 'S-0007',
    name: 'Мария Ветрова',
    ticketType: 'Спикер',
    email: 'm.vetrova@example.com',
    registeredAt: '2026-08-20T18:03:00+03:00',
    status: 'Регистрация'
  },
  {
    id: 1004,
    orderId: 1004,
    ticketNumber: 'A-1010',
    name: 'Игорь Пантелеев',
    ticketType: 'Офлайн — участник',
    email: 'igor.p@example.com',
    registeredAt: '2026-09-03T21:55:00+03:00',
    status: 'Оплачен'
  },
  {
    id: 1005,
    orderId: 1005,
    ticketNumber: 'P-0002',
    name: 'Ольга Незнакомая',
    ticketType: 'Пресса',
    registeredAt: '2026-09-04T08:12:00+03:00',
    status: 'Регистрация'
  }
];
