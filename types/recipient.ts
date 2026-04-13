export interface TransferRecipient {
  type: 'email' | 'whatsapp';
  value: string;
  verified?: boolean;
}

export function emailsToRecipients(emails: string[]): TransferRecipient[] {
  return (emails || []).map((value) => ({ type: 'email' as const, value }));
}

export function recipientsToEmails(recipients: TransferRecipient[]): string[] {
  return (recipients || [])
    .filter((r) => r.type === 'email')
    .map((r) => r.value);
}
