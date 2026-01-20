
export enum ReminderPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'NONE';

export interface Recurrence {
  frequency: RecurrenceFrequency;
  endDate?: number;
}

export interface Reminder {
  id: string;
  text: string;
  category: string;
  priority: ReminderPriority;
  createdAt: number;
  scheduledAt?: number;
  duration?: number; // Duración en minutos
  color: string;
  isCompleted: boolean;
  recurrence?: Recurrence;
  snoozedUntil?: number;
  position?: { x: number; y: number };
}

export interface GeminiSuggestion {
  text: string;
  category: string;
  priority: ReminderPriority;
  color: string;
}
