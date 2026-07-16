import { SecretaryItem } from './types';

export const sampleItems: SecretaryItem[] = [
  { id: '1', title: 'Call Maya about the venue', kind: 'call', dueAt: '2026-07-16T10:00:00', contact: 'Maya Chen', phoneNumber: '(555) 014-3090', completed: false, priority: 'high', source: 'manual' },
  { id: '2', title: 'Project check-in', kind: 'appointment', dueAt: '2026-07-16T13:30:00', contact: 'Northstar team', completed: false, priority: 'normal', source: 'manual' },
  { id: '3', title: 'Electric bill due', kind: 'bill', dueAt: '2026-07-16T17:00:00', amount: 86.42, completed: false, priority: 'high', source: 'manual' },
  { id: '4', title: 'Send proposal follow-up', kind: 'followUp', dueAt: '2026-07-17T09:00:00', contact: 'Jordan Williams', completed: false, priority: 'normal', source: 'email' },
  { id: '5', title: 'Book dentist appointment', kind: 'task', completed: false, priority: 'low', source: 'manual' }
];
