export type ItemKind = 'task' | 'appointment' | 'call' | 'bill' | 'followUp';

export type SecretaryItem = {
  id: string;
  title: string;
  kind: ItemKind;
  dueAt?: string;
  contact?: string;
  amount?: number;
  phoneNumber?: string;
  notes?: string;
  completed: boolean;
  priority: 'low' | 'normal' | 'high';
  source: 'manual' | 'email' | 'notification';
};

export type Contact = {
  id: string;
  name: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  /** Kept ready for a future addresses/contact-locations feature. */
  address?: string;
};

/**
 * Reserved for opt-in email/notification import later.  Expo Go cannot read
 * other apps' notifications; those integrations will need platform-specific,
 * permissioned services or an email provider connection.
 */
export type CaptureCandidate = Omit<SecretaryItem, 'id' | 'completed'> & {
  confidence: number;
};
