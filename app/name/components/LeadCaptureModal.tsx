'use client';

import { useEffect, useState } from 'react';
import CustomerLeadCaptureScreen from '@/app/components/customer-flow/CustomerLeadCaptureScreen';

type Props = {
  requestId: string | null;
  accountSlug?: string;
  onSubmitted: (lead: { leadId: string; name: string; phone: string; email: string }) => void;
};

export default function LeadCaptureModal({ requestId, accountSlug, onSubmitted }: Props) {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: requestId ?? undefined, accountSlug, name, email, phone }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Something went wrong. Please try again.');
      }
      const data = await res.json().catch(() => ({}));
      onSubmitted({ leadId: data.leadId, name, phone, email });
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <CustomerLeadCaptureScreen
      asDialog
      name={name}
      phone={phone}
      email={email}
      submitting={submitting}
      error={error}
      onNameChange={setName}
      onPhoneChange={setPhone}
      onEmailChange={setEmail}
      onSubmit={handleSubmit}
    />
  );
}
