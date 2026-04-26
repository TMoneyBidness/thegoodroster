import React, { useState } from 'react';

interface Props {
  partnerId: string;
  partnerName: string;
  partnerNmls: string;
  partnerLegalEntity: string;
}

export default function PartnerConnectForm({ partnerId, partnerName, partnerNmls, partnerLegalEntity }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  const tcpaText = `By clicking "Agree and Connect" below, I am providing my electronic (E-SIGN) signature and prior express written consent for ${partnerLegalEntity} (NMLS #${partnerNmls}) (and parties calling on its behalf) to contact me at the telephone number and email address I have provided regarding mortgage products and services, including through the use of an automatic telephone dialing system, an artificial or prerecorded voice, AI-generated voice, and SMS/MMS text messages, even if my number is on a state, federal, or corporate Do-Not-Call list. My consent is not required as a condition of any purchase. Message and data rates may apply. Message frequency varies. I may revoke consent at any time by replying STOP to a text or by calling the professional directly.`;

  if (submitted) {
    return (
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-50 text-green-600 mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-semibold text-primary-800">Sent to {partnerName}</p>
        <p className="text-sm text-neutral-500 mt-1">They'll be in touch shortly.</p>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full py-3 px-6 rounded-lg font-semibold text-white cursor-pointer"
        style={{ background: 'linear-gradient(to bottom, var(--color-accent-500), var(--color-accent-600))' }}
      >
        Connect with {partnerName}
      </button>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent || !form.name || !form.email) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_page: '/community-partners/',
          source_tool: 'partner-connect',
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          consent_to_share: true,
          routed_to_partner_id: partnerId,
          turnstile_token: '',
          honeypot: '',
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = consent && form.name.trim() && form.email.trim() && !submitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor={`name-${partnerId}`} className="block text-sm font-medium text-neutral-700 mb-1">Name *</label>
          <input
            id={`name-${partnerId}`}
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-400 focus:border-accent-400"
          />
        </div>
        <div>
          <label htmlFor={`email-${partnerId}`} className="block text-sm font-medium text-neutral-700 mb-1">Email *</label>
          <input
            id={`email-${partnerId}`}
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-400 focus:border-accent-400"
          />
        </div>
        <div>
          <label htmlFor={`phone-${partnerId}`} className="block text-sm font-medium text-neutral-700 mb-1">Phone</label>
          <input
            id={`phone-${partnerId}`}
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-400 focus:border-accent-400"
          />
        </div>
      </div>

      {/* TCPA consent — immediately above the submit button */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="min-h-[44px] flex items-start pt-0.5">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="h-5 w-5 rounded border-neutral-300 text-accent-600 focus:ring-accent-400"
            />
          </div>
          <span className="text-xs text-neutral-600 leading-relaxed">
            {tcpaText}
          </span>
        </label>
        <p className="text-xs text-neutral-400 mt-2 pl-8">
          By submitting, you agree to our{' '}
          <a href="/privacy/" className="underline">Privacy Policy</a> and{' '}
          <a href="/terms/" className="underline">Terms of Use</a>.
          {' '}<span className="font-medium">{partnerName}</span> is not affiliated with this site.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 font-medium">{error}</p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: canSubmit ? 'linear-gradient(to bottom, var(--color-accent-500), var(--color-accent-600))' : undefined, backgroundColor: canSubmit ? undefined : 'var(--color-neutral-300)' }}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sending...
          </span>
        ) : (
          `Agree and Connect with ${partnerName}`
        )}
      </button>
    </form>
  );
}
