import React, { useState, useRef, useEffect } from 'react';

type JourneyStage = 'exploring' | 'saving' | 'ready-6mo' | 'ready-now' | '';
type YesNo = 'yes' | 'no' | '';

interface FormData {
  journey: JourneyStage;
  zipCode: string;
  firstTimeBuyer: YesNo;
  military: YesNo;
  income: string;
  creditScore: string;
  downPayment: string;
  name: string;
  email: string;
  phone: string;
  consent: boolean;
  honeypot: string;
}

const initialData: FormData = {
  journey: '',
  zipCode: '',
  firstTimeBuyer: '',
  military: '',
  income: '',
  creditScore: '',
  downPayment: '',
  name: '',
  email: '',
  phone: '',
  consent: false,
  honeypot: '',
};

export default function PreQualQuiz() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(initialData);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animating, setAnimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const stepRef = useRef<HTMLDivElement>(null);

  const totalSteps = 4;

  // Focus management: after step transition, focus the heading of the new step
  useEffect(() => {
    if (!animating && stepRef.current) {
      const heading = stepRef.current.querySelector('h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus();
      }
    }
  }, [step, animating]);

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const canAdvance = (): boolean => {
    switch (step) {
      case 1:
        return data.journey !== '';
      case 2:
        return (
          /^\d{5}$/.test(data.zipCode) &&
          data.firstTimeBuyer !== '' &&
          data.military !== ''
        );
      case 3:
        return (
          data.income !== '' &&
          data.creditScore !== '' &&
          data.downPayment !== ''
        );
      case 4:
        return (
          data.name.trim() !== '' &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) &&
          data.consent
        );
      default:
        return false;
    }
  };

  const goNext = () => {
    if (!canAdvance()) return;
    setDirection('forward');
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => s + 1);
      setAnimating(false);
    }, 200);
  };

  const goBack = () => {
    setDirection('back');
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => s - 1);
      setAnimating(false);
    }, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAdvance()) return;

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        timeline: data.journey,
        zip: data.zipCode,
        is_first_time_buyer: data.firstTimeBuyer === 'yes',
        is_military: data.military === 'yes',
        income_range: data.income,
        credit_range: data.creditScore,
        down_payment_range: data.downPayment,
        name: data.name,
        email: data.email,
        phone: data.phone,
        source_page: window.location.pathname,
        source_tool: 'prequal-quiz',
        consent_to_share: data.consent,
        turnstile_token: '', // placeholder
        honeypot: data.honeypot,
      };

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Submission failed');

      window.location.href = '/thank-you/';
    } catch {
      setError(
        'Something went wrong. Please try again or contact us directly.'
      );
      setSubmitting(false);
    }
  };

  const slideClass = animating
    ? direction === 'forward'
      ? 'translate-x-8 opacity-0'
      : '-translate-x-8 opacity-0'
    : 'translate-x-0 opacity-100';

  const RadioOption = ({
    label,
    value,
    selected,
    onSelect,
  }: {
    label: string;
    value: string;
    selected: boolean;
    onSelect: () => void;
  }) => (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
        selected
          ? 'border-accent-600 bg-accent-50 text-primary-800'
          : 'border-neutral-200 bg-white hover:border-accent-300 text-neutral-700'
      }`}
      aria-pressed={selected}
    >
      <span className="flex items-center gap-3">
        <span
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            selected ? 'border-accent-600' : 'border-neutral-300'
          }`}
        >
          {selected && (
            <span className="w-2.5 h-2.5 rounded-full bg-accent-600" />
          )}
        </span>
        {label}
      </span>
    </button>
  );

  const ToggleButtons = ({
    label,
    value,
    onChange,
    id,
  }: {
    label: string;
    value: YesNo;
    onChange: (v: YesNo) => void;
    id: string;
  }) => (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-neutral-700" id={`${id}-label`}>
        {label}
      </label>
      <div className="flex gap-2" role="radiogroup" aria-labelledby={`${id}-label`}>
        {(['yes', 'no'] as YesNo[]).map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={`flex-1 py-2 rounded-lg font-medium border-2 transition-all ${
              value === v
                ? 'border-accent-600 bg-accent-50 text-primary-800'
                : 'border-neutral-200 bg-white hover:border-accent-300 text-neutral-600'
            }`}
          >
            {v === 'yes' ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </div>
  );

  const SelectField = ({
    label,
    value,
    onChange,
    options,
    id,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    id: string;
  }) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-neutral-800 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
        required
      >
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-neutral-100 overflow-hidden">
        {/* Progress bar */}
        <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-100">
          <div className="flex justify-between text-sm text-neutral-500 mb-2">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round((step / totalSteps) * 100)}% complete</span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2">
            <div
              className="bg-accent-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
              role="progressbar"
              aria-valuenow={step}
              aria-valuemin={1}
              aria-valuemax={totalSteps}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            ref={stepRef}
            className={`px-6 py-8 transition-all duration-200 ${slideClass}`}
          >
            {/* Step 1 */}
            {step === 1 && (
              <div>
                <h2 className="text-xl font-bold text-primary-800 mb-1">
                  Where are you in your journey?
                </h2>
                <p className="text-neutral-500 text-sm mb-6">
                  This helps us tailor your results.
                </p>
                <div className="space-y-3" role="radiogroup" aria-label="Journey stage">
                  <RadioOption
                    label="Just exploring"
                    value="exploring"
                    selected={data.journey === 'exploring'}
                    onSelect={() => update('journey', 'exploring')}
                  />
                  <RadioOption
                    label="Saving for a down payment"
                    value="saving"
                    selected={data.journey === 'saving'}
                    onSelect={() => update('journey', 'saving')}
                  />
                  <RadioOption
                    label="Ready to buy in next 6 months"
                    value="ready-6mo"
                    selected={data.journey === 'ready-6mo'}
                    onSelect={() => update('journey', 'ready-6mo')}
                  />
                  <RadioOption
                    label="Ready to buy now"
                    value="ready-now"
                    selected={data.journey === 'ready-now'}
                    onSelect={() => update('journey', 'ready-now')}
                  />
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div>
                <h2 className="text-xl font-bold text-primary-800 mb-1">
                  Tell us about your situation
                </h2>
                <p className="text-neutral-500 text-sm mb-6">
                  A few quick questions to match you with the right programs.
                </p>
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="zipCode"
                      className="block text-sm font-medium text-neutral-700"
                    >
                      ZIP code
                    </label>
                    <input
                      id="zipCode"
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      pattern="\d{5}"
                      value={data.zipCode}
                      onChange={(e) =>
                        update(
                          'zipCode',
                          e.target.value.replace(/\D/g, '').slice(0, 5)
                        )
                      }
                      className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                      placeholder="92101"
                      required
                    />
                  </div>
                  <ToggleButtons
                    label="Are you a first-time homebuyer?"
                    value={data.firstTimeBuyer}
                    onChange={(v) => update('firstTimeBuyer', v)}
                    id="firstTimeBuyer"
                  />
                  <ToggleButtons
                    label="Have you served in the military?"
                    value={data.military}
                    onChange={(v) => update('military', v)}
                    id="military"
                  />
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div>
                <h2 className="text-xl font-bold text-primary-800 mb-1">
                  Your numbers (approximate is fine)
                </h2>
                <p className="text-neutral-500 text-sm mb-6">
                  We use these to estimate what you may qualify for.
                </p>
                <div className="space-y-5">
                  <SelectField
                    label="Annual household income"
                    value={data.income}
                    onChange={(v) => update('income', v)}
                    id="income"
                    options={[
                      { value: '0-50k', label: '$0 - $50,000' },
                      { value: '50k-75k', label: '$50,000 - $75,000' },
                      { value: '75k-100k', label: '$75,000 - $100,000' },
                      { value: '100k-125k', label: '$100,000 - $125,000' },
                      { value: '125k-150k', label: '$125,000 - $150,000' },
                      { value: '150k-200k', label: '$150,000 - $200,000' },
                      { value: '200k+', label: '$200,000+' },
                    ]}
                  />
                  <SelectField
                    label="Estimated credit score"
                    value={data.creditScore}
                    onChange={(v) => update('creditScore', v)}
                    id="creditScore"
                    options={[
                      { value: 'below-580', label: 'Below 580' },
                      { value: '580-619', label: '580 - 619' },
                      { value: '620-679', label: '620 - 679' },
                      { value: '680-739', label: '680 - 739' },
                      { value: '740+', label: '740+' },
                    ]}
                  />
                  <SelectField
                    label="Money saved for down payment"
                    value={data.downPayment}
                    onChange={(v) => update('downPayment', v)}
                    id="downPayment"
                    options={[
                      { value: '0-10k', label: '$0 - $10,000' },
                      { value: '10k-25k', label: '$10,000 - $25,000' },
                      { value: '25k-50k', label: '$25,000 - $50,000' },
                      { value: '50k-100k', label: '$50,000 - $100,000' },
                      { value: '100k-200k', label: '$100,000 - $200,000' },
                      { value: '200k+', label: '$200,000+' },
                    ]}
                  />
                </div>
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div>
                <h2 className="text-xl font-bold text-primary-800 mb-1">
                  Where can we send your results?
                </h2>
                <p className="text-neutral-500 text-sm mb-6">
                  We will match you with programs and a local professional.
                </p>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-neutral-700"
                    >
                      Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={data.name}
                      onChange={(e) => update('name', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-neutral-700"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={data.email}
                      onChange={(e) => update('email', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-neutral-700"
                    >
                      Phone{' '}
                      <span className="text-neutral-400 font-normal">
                        (optional but recommended)
                      </span>
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={data.phone}
                      onChange={(e) => update('phone', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    />
                  </div>
                  {/* TCPA Consent Disclosure */}
                  <div className="bg-neutral-100 border-l-4 border-accent-500 rounded-r-lg p-4 mt-2">
                    <div className="flex items-start gap-3">
                      <div className="min-h-[44px] flex items-center pt-0.5">
                        <input
                          id="consent"
                          type="checkbox"
                          checked={data.consent}
                          onChange={(e) => update('consent', e.target.checked)}
                          className="h-5 w-5 rounded border-neutral-300 text-accent-600 focus:ring-accent-500"
                          required
                        />
                      </div>
                      <label
                        htmlFor="consent"
                        className="text-sm text-neutral-700 leading-snug"
                      >
                        By clicking 'Submit' below, I provide my electronic
                        (E-SIGN) signature and prior express written consent for
                        the Community Partners listed at{' '}
                        <a
                          href="/community-partners/"
                          className="underline hover:text-accent-600"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {window.location.origin}/community-partners/
                        </a>{' '}
                        to contact me at the phone number and email I provided
                        regarding mortgage products and services, including
                        through the use of an automatic telephone dialing system,
                        an artificial or prerecorded voice, AI-generated voice,
                        and SMS/MMS text messages, even if my number is on a
                        state, federal, or corporate Do-Not-Call list. My consent
                        is not required as a condition of any purchase. I may
                        revoke consent at any time by replying STOP.
                      </label>
                    </div>
                    <p className="text-xs text-neutral-500 mt-3 ml-8">
                      By submitting, you agree to our{' '}
                      <a
                        href="/privacy/"
                        className="underline hover:text-accent-600"
                      >
                        Privacy Policy
                      </a>
                      .
                    </p>
                  </div>

                  {/* Honeypot field — hidden from real users */}
                  <div aria-hidden="true" style={{ display: 'none' }}>
                    <label htmlFor="website">Website</label>
                    <input
                      id="website"
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={data.honeypot}
                      onChange={(e) => update('honeypot', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="px-6 pb-6 flex justify-between items-center">
            {step > 1 ? (
              <button
                type="button"
                onClick={goBack}
                className="text-neutral-500 hover:text-neutral-700 font-medium text-sm flex items-center gap-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back
              </button>
            ) : (
              <div />
            )}

            {step < totalSteps ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canAdvance()}
                className="bg-accent-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-accent-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canAdvance() || submitting}
                className="bg-accent-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-accent-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Get My Results'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
