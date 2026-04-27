import React, { useState, useRef, useEffect } from 'react';

/* ---------- Types ---------- */

interface RawDPAProgram {
  id: string;
  name: string;
  agency: string;
  maxAssistanceDescription: string;
  maxAssistancePercent: number | null;
  maxAssistanceFlat: number | null;
  incomeLimit: { description: string; amiPercent: number | null };
  geography: string;
  requiresFirstTimeBuyer: boolean;
  requiresLottery: boolean;
  loanTypes: string[];
  notes: string;
}

interface MatchResult {
  program: RawDPAProgram;
  estimatedDollars: string;
  notes: string[];
}

interface Props {
  programs: RawDPAProgram[];
}

/* ---------- Helpers ---------- */

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

const geographyLabel: Record<string, string> = {
  city_of_san_diego: 'City of San Diego only',
  sd_county_not_city: 'SD County (outside City of SD)',
  sd_county: 'San Diego County',
  statewide: 'California (statewide)',
};

/* ---------- Matching logic ---------- */

function matchPrograms(
  programs: RawDPAProgram[],
  income: number,
  isFirstTime: boolean,
  isMilitary: boolean,
  creditScore: number,
  targetPrice: number,
  geography: string,
): MatchResult[] {
  const results: MatchResult[] = [];

  for (const p of programs) {
    const notes: string[] = [];

    if (p.requiresFirstTimeBuyer && !isFirstTime) continue;

    if (geography === 'city') {
      if (p.geography === 'sd_county_not_city') continue;
    } else if (geography === 'county') {
      if (p.geography === 'city_of_san_diego') continue;
    }

    if (creditScore < 580) {
      notes.push('Credit may limit eligibility — most programs need 620+');
    } else if (creditScore < 620) {
      notes.push('Some programs may require 620+ credit');
    }

    const sdAMI = 110000;
    if (p.incomeLimit.amiPercent) {
      const maxIncome = sdAMI * (p.incomeLimit.amiPercent / 100);
      if (income > maxIncome) continue;
    }

    if (p.requiresLottery) {
      notes.push('Lottery-based — funds run out quickly');
    }

    let estDollars = 0;
    if (p.maxAssistancePercent && p.maxAssistanceFlat) {
      estDollars = Math.min(targetPrice * (p.maxAssistancePercent / 100), p.maxAssistanceFlat);
    } else if (p.maxAssistancePercent) {
      estDollars = targetPrice * (p.maxAssistancePercent / 100);
    } else if (p.maxAssistanceFlat) {
      estDollars = p.maxAssistanceFlat;
    }

    notes.push(geographyLabel[p.geography] || p.geography);
    notes.push(`Loan types: ${p.loanTypes.join(', ')}`);

    results.push({
      program: p,
      estimatedDollars: fmt(estDollars),
      notes,
    });
  }

  results.sort((a, b) => {
    const aNum = parseInt(a.estimatedDollars.replace(/\D/g, ''), 10) || 0;
    const bNum = parseInt(b.estimatedDollars.replace(/\D/g, ''), 10) || 0;
    return bNum - aNum;
  });

  return results;
}

/* ---------- Options ---------- */

const creditOptions = [
  { value: 550, label: 'Below 580' },
  { value: 600, label: '580 – 619' },
  { value: 650, label: '620 – 679' },
  { value: 710, label: '680 – 739' },
  { value: 760, label: '740+' },
];

const incomeOptions = [
  { value: 40000, label: 'Under $50,000' },
  { value: 62500, label: '$50,000 – $75,000' },
  { value: 87500, label: '$75,000 – $100,000' },
  { value: 112500, label: '$100,000 – $125,000' },
  { value: 137500, label: '$125,000 – $150,000' },
  { value: 175000, label: '$150,000 – $200,000' },
  { value: 250000, label: '$200,000 – $300,000' },
  { value: 350000, label: '$300,000+' },
];

const priceOptions = [
  { value: 500000, label: '$400K – $600K' },
  { value: 700000, label: '$600K – $800K' },
  { value: 900000, label: '$800K – $1M' },
  { value: 1100000, label: '$1M – $1.2M' },
  { value: 1350000, label: '$1.2M+' },
];

const savingsOptions = [
  { value: '0-10k', label: '$0 – $10,000' },
  { value: '10k-25k', label: '$10,000 – $25,000' },
  { value: '25k-50k', label: '$25,000 – $50,000' },
  { value: '50k-100k', label: '$50,000 – $100,000' },
  { value: '100k+', label: '$100,000+' },
];

const employmentOptions = [
  { value: 'w2', label: 'W-2 Employee' },
  { value: 'self-employed', label: 'Self-Employed' },
  { value: '1099', label: '1099 Contractor' },
  { value: 'mixed', label: 'Mixed (W-2 + 1099)' },
  { value: 'other', label: 'Other' },
];

const householdOptions = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5+' },
];

/* ---------- Component ---------- */

const TOTAL_STEPS = 4;

export default function DPAFinderQuiz({ programs }: Props) {
  const [step, setStep] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const stepRef = useRef<HTMLDivElement>(null);

  // Form state
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [isMilitary, setIsMilitary] = useState<boolean | null>(null);
  const [householdSize, setHouseholdSize] = useState<number | null>(null);
  const [income, setIncome] = useState<number | null>(null);
  const [credit, setCredit] = useState<number | null>(null);
  const [savings, setSavings] = useState('');
  const [employment, setEmployment] = useState('');
  const [price, setPrice] = useState<number | null>(null);
  const [geography, setGeography] = useState('');
  const [willingToTakeCourse, setWillingToTakeCourse] = useState<boolean | null>(null);
  const [isPOC, setIsPOC] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');

  // Results state
  const [results, setResults] = useState<MatchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Focus management
  useEffect(() => {
    if (!animating && stepRef.current) {
      const heading = stepRef.current.querySelector('h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus();
      }
    }
  }, [step, animating]);

  const canAdvance = (): boolean => {
    switch (step) {
      case 1:
        return isFirstTime !== null && isMilitary !== null && householdSize !== null;
      case 2:
        return income !== null && credit !== null && savings !== '' && employment !== '';
      case 3:
        return price !== null && geography !== '' && willingToTakeCourse !== null;
      case 4:
        return true; // email + POC are optional
      default:
        return false;
    }
  };

  const goNext = () => {
    if (!canAdvance()) return;
    setDirection('forward');
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS));
      setAnimating(false);
    }, 200);
  };

  const goBack = () => {
    setDirection('back');
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => Math.max(s - 1, 1));
      setAnimating(false);
    }, 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = matchPrograms(
      programs,
      income!,
      isFirstTime!,
      isMilitary!,
      credit!,
      price!,
      geography,
    );
    setResults(matched);
    setShowResults(true);
  };

  const handleEmailResults = () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    // In production, this would POST to the lead-router Worker
    setEmailSent(true);
  };

  const handleReset = () => {
    setStep(1);
    setShowResults(false);
    setEmailSent(false);
    setIsFirstTime(null);
    setIsMilitary(null);
    setHouseholdSize(null);
    setIncome(null);
    setCredit(null);
    setSavings('');
    setEmployment('');
    setPrice(null);
    setGeography('');
    setWillingToTakeCourse(null);
    setIsPOC(null);
    setEmail('');
    setResults([]);
  };

  const slideClass = animating
    ? direction === 'forward'
      ? 'translate-x-8 opacity-0'
      : '-translate-x-8 opacity-0'
    : 'translate-x-0 opacity-100';

  /* ---------- Shared UI components ---------- */

  const ToggleButton = ({
    label,
    value,
    current,
    onSelect,
  }: {
    label: string;
    value: boolean;
    current: boolean | null;
    onSelect: (v: boolean) => void;
  }) => (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`flex-1 py-2.5 rounded-lg font-medium border-2 transition-all cursor-pointer min-h-[44px] ${
        current === value
          ? 'border-accent-600 bg-accent-50 text-primary-800'
          : 'border-neutral-200 bg-white hover:border-accent-300 text-neutral-600'
      }`}
    >
      {label}
    </button>
  );

  const SelectField = ({
    label,
    value,
    onChange,
    options,
    id,
    hint,
  }: {
    label: string;
    value: string | number;
    onChange: (v: string) => void;
    options: { value: string | number; label: string }[];
    id: string;
    hint?: string;
  }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-2">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-neutral-800 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
      >
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && <p className="text-xs text-neutral-400 mt-1">{hint}</p>}
    </div>
  );

  /* ---------- Results view ---------- */

  if (showResults) {
    const totalMax = results.reduce((sum, r) => {
      const n = parseInt(r.estimatedDollars.replace(/\D/g, ''), 10) || 0;
      return sum + n;
    }, 0);

    // Scenario math
    const outOfPocketWithDPA = price ? Math.max(0, price * 0.035 - totalMax) : 0;
    const outOfPocketWithout = price ? price * 0.035 : 0;

    return (
      <div>
        {/* Hero result */}
        <div className="bg-accent-50 border border-accent-200 rounded-xl p-6 mb-6 text-center">
          <p className="text-sm text-accent-700 font-medium mb-1">Based on your answers, you may qualify for</p>
          <p className="text-5xl font-bold text-primary-800 mb-2">
            {results.length > 0 ? `Up to ${fmt(totalMax)}` : '$0'}
          </p>
          <p className="text-sm text-neutral-600">
            across {results.length} program{results.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Scenario math box */}
        {results.length > 0 && price && (
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-5 mb-6">
            <h3 className="font-bold text-primary-800 mb-3">Your scenario</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-neutral-500">Target home price</p>
                <p className="font-bold text-primary-800 text-lg">{fmt(price)}</p>
              </div>
              <div>
                <p className="text-neutral-500">Estimated DPA available</p>
                <p className="font-bold text-accent-700 text-lg">{fmt(totalMax)}</p>
              </div>
              <div>
                <p className="text-neutral-500">Est. out-of-pocket without DPA</p>
                <p className="font-semibold text-neutral-700">{fmt(outOfPocketWithout)}</p>
              </div>
              <div>
                <p className="text-neutral-500">Est. out-of-pocket with DPA</p>
                <p className="font-bold text-accent-700">{fmt(outOfPocketWithDPA)}</p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mt-3">Based on 3.5% FHA minimum down payment. Actual requirements vary by program and loan type.</p>
          </div>
        )}

        {/* Email capture — positioned after results, not gating them */}
        {!emailSent && (
          <div className="bg-warm-50 border border-warm-200 rounded-xl p-5 mb-6">
            <h3 className="font-bold text-primary-800 mb-2">Email me these results</h3>
            <p className="text-sm text-neutral-600 mb-3">Get your matched programs + a summary of your scenario. No spam — one email, that's it.</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-3 py-2.5 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              />
              <button
                type="button"
                onClick={handleEmailResults}
                disabled={!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
                className="px-5 py-2.5 rounded-lg font-medium text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                style={{ background: 'linear-gradient(to bottom, var(--color-accent-500), var(--color-accent-600))' }}
              >
                Send
              </button>
            </div>
          </div>
        )}
        {emailSent && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-green-700 font-medium">Sent! Check your inbox for your DPA match results.</p>
          </div>
        )}

        {/* Program cards */}
        {results.length === 0 ? (
          <div className="bg-neutral-50 rounded-xl p-6 text-center">
            <p className="text-neutral-700 mb-3">
              No programs matched your current profile. This doesn't mean you're out of options.
            </p>
            <p className="text-sm text-neutral-500 mb-4">
              Down payment assistance eligibility changes frequently. A local mortgage professional can review your full situation.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((r) => (
              <div
                key={r.program.id}
                className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-accent-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h3 className="font-bold text-primary-800 text-lg leading-snug">
                      {r.program.name}
                    </h3>
                    <p className="text-sm text-neutral-500">{r.program.agency}</p>
                  </div>
                  <span className="flex-shrink-0 bg-accent-50 text-accent-700 font-bold px-3 py-1.5 rounded-lg text-lg">
                    {r.estimatedDollars}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 mb-3">
                  {r.program.maxAssistanceDescription}
                </p>
                <div className="flex flex-wrap gap-2">
                  {r.notes.map((note, i) => (
                    <span key={i} className="inline-block bg-neutral-100 text-neutral-600 text-xs px-2.5 py-1 rounded-full">
                      {note}
                    </span>
                  ))}
                </div>
                {r.program.notes && (
                  <p className="text-xs text-neutral-500 mt-3 border-t border-neutral-100 pt-3">
                    {r.program.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Education course note */}
        {willingToTakeCourse === false && results.length > 0 && (
          <div className="mt-4 p-3 bg-warm-50 border border-warm-200 rounded-lg text-sm text-warm-700">
            <strong>Note:</strong> Most DPA programs require a HUD-approved homebuyer education course (6-8 hours, available online). This may affect your eligibility for the programs listed above.
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <a
            href="/community-partners/"
            className="inline-block px-6 py-3 rounded-lg font-semibold text-white no-underline transition-colors text-center w-full sm:w-auto"
            style={{ background: 'linear-gradient(to bottom, var(--color-accent-500), var(--color-accent-600))' }}
          >
            Talk to a DPA Specialist
          </a>
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-3 rounded-lg font-medium text-neutral-600 border border-neutral-300 hover:border-neutral-400 transition-colors cursor-pointer w-full sm:w-auto"
          >
            Start Over
          </button>
        </div>

        <p className="text-xs text-neutral-500 mt-4">
          Estimates based on publicly available program guidelines. Actual eligibility depends on your full financial profile and current program funding.
        </p>
      </div>
    );
  }

  /* ---------- Form steps ---------- */
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-neutral-100 overflow-hidden">
      {/* Progress bar */}
      <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-100">
        <div className="flex justify-between text-sm text-neutral-500 mb-2">
          <span>Step {step} of {TOTAL_STEPS}</span>
          <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
        </div>
        <div className="w-full bg-neutral-200 rounded-full h-2">
          <div
            className="bg-accent-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={TOTAL_STEPS}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div
          ref={stepRef}
          className={`px-6 py-8 transition-all duration-200 ${slideClass}`}
        >
          {/* Step 1: About You */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-primary-800 mb-1">About you</h2>
              <p className="text-neutral-500 text-sm mb-6">A few quick questions to match you with the right programs.</p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Are you a first-time homebuyer?
                  </label>
                  <div className="flex gap-2">
                    <ToggleButton label="Yes" value={true} current={isFirstTime} onSelect={setIsFirstTime} />
                    <ToggleButton label="No" value={false} current={isFirstTime} onSelect={setIsFirstTime} />
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">Haven't owned a home in the last 3 years = first-time buyer.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Are you a veteran, active-duty, or eligible surviving spouse?
                  </label>
                  <div className="flex gap-2">
                    <ToggleButton label="Yes" value={true} current={isMilitary} onSelect={setIsMilitary} />
                    <ToggleButton label="No" value={false} current={isMilitary} onSelect={setIsMilitary} />
                  </div>
                </div>

                <SelectField
                  label="Household size"
                  value={householdSize ?? ''}
                  onChange={(v) => setHouseholdSize(v ? Number(v) : null)}
                  options={householdOptions}
                  id="dpa-household"
                  hint="Total people in your household (affects income limits)."
                />
              </div>
            </div>
          )}

          {/* Step 2: Your Finances */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-primary-800 mb-1">Your finances</h2>
              <p className="text-neutral-500 text-sm mb-6">Approximate is fine — we use ranges, not exact numbers.</p>
              <div className="space-y-5">
                <SelectField
                  label="Annual household income"
                  value={income ?? ''}
                  onChange={(v) => setIncome(v ? Number(v) : null)}
                  options={incomeOptions}
                  id="dpa-income"
                />
                <SelectField
                  label="Estimated credit score"
                  value={credit ?? ''}
                  onChange={(v) => setCredit(v ? Number(v) : null)}
                  options={creditOptions}
                  id="dpa-credit"
                />
                <SelectField
                  label="Savings available for down payment + closing"
                  value={savings}
                  onChange={setSavings}
                  options={savingsOptions}
                  id="dpa-savings"
                />
                <SelectField
                  label="Employment type"
                  value={employment}
                  onChange={setEmployment}
                  options={employmentOptions}
                  id="dpa-employment"
                  hint="Self-employed buyers may need additional documentation."
                />
              </div>
            </div>
          )}

          {/* Step 3: What You're Looking For */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-primary-800 mb-1">What you're looking for</h2>
              <p className="text-neutral-500 text-sm mb-6">Helps us narrow which programs fit your target.</p>
              <div className="space-y-5">
                <SelectField
                  label="Target home price range"
                  value={price ?? ''}
                  onChange={(v) => setPrice(v ? Number(v) : null)}
                  options={priceOptions}
                  id="dpa-price"
                />
                <SelectField
                  label="Where in San Diego County are you looking?"
                  value={geography}
                  onChange={setGeography}
                  options={[
                    { value: 'city', label: 'City of San Diego' },
                    { value: 'county', label: 'Elsewhere in SD County' },
                    { value: 'unsure', label: 'Not sure yet' },
                  ]}
                  id="dpa-geo"
                  hint="SDHC programs are City of SD only. County programs cover other areas."
                />
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Willing to take a HUD-approved homebuyer education course?
                  </label>
                  <div className="flex gap-2">
                    <ToggleButton label="Yes" value={true} current={willingToTakeCourse} onSelect={setWillingToTakeCourse} />
                    <ToggleButton label="No" value={false} current={willingToTakeCourse} onSelect={setWillingToTakeCourse} />
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">Required by most DPA programs. Available online, ~6-8 hours.</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Optional Info + Email */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold text-primary-800 mb-1">Almost done</h2>
              <p className="text-neutral-500 text-sm mb-6">These are optional but help us personalize your results.</p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Are you Black, Indigenous, or a person of color?
                    <span className="text-neutral-400 font-normal ml-1">(optional)</span>
                  </label>
                  <div className="flex gap-2">
                    <ToggleButton label="Yes" value={true} current={isPOC} onSelect={setIsPOC} />
                    <ToggleButton label="No" value={false} current={isPOC} onSelect={setIsPOC} />
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    The SD Black Homebuyers Program offers up to $40,000 for eligible buyers. This info is only used for program matching.
                  </p>
                </div>

                <div>
                  <label htmlFor="dpa-email" className="block text-sm font-medium text-neutral-700 mb-2">
                    Email address
                    <span className="text-neutral-400 font-normal ml-1">(optional — to receive your results)</span>
                  </label>
                  <input
                    id="dpa-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-neutral-800 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  />
                  <p className="text-xs text-neutral-400 mt-1">
                    We'll email you a summary of your matched programs. No spam. No phone calls. No sharing.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="px-6 pb-6 flex justify-between items-center">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="text-neutral-500 hover:text-neutral-700 font-medium text-sm flex items-center gap-1 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          ) : (
            <div />
          )}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canAdvance()}
              className="px-6 py-2.5 rounded-lg font-medium text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: canAdvance()
                  ? 'linear-gradient(to bottom, var(--color-accent-500), var(--color-accent-600))'
                  : undefined,
                backgroundColor: canAdvance() ? undefined : 'var(--color-neutral-300)',
              }}
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg font-semibold text-white transition-colors cursor-pointer"
              style={{ background: 'linear-gradient(to bottom, var(--color-accent-500), var(--color-accent-600))' }}
            >
              Show Me My DPA Matches
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
