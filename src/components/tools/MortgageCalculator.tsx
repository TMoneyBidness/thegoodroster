import React, { useState, useMemo } from 'react';

const fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const fmtDec = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

interface Breakdown {
  principalInterest: number;
  propertyTax: number;
  insurance: number;
  hoa: number;
  melloRoos: number;
  pmi: number;
}

function calcMonthlyPI(principal: number, annualRate: number, years: number) {
  if (principal <= 0) return 0;
  if (annualRate <= 0) return principal / (years * 12);
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
}

export default function MortgageCalculator() {
  const [homePrice, setHomePrice] = useState(750000);
  const [dpMode, setDpMode] = useState<'pct' | 'dollar'>('pct');
  const [dpPct, setDpPct] = useState(10);
  const [dpDollar, setDpDollar] = useState(75000);
  const [loanTerm, setLoanTerm] = useState(30);
  const [rate, setRate] = useState(6.75);
  const [taxRate, setTaxRate] = useState(1.25);
  const [insurance, setInsurance] = useState(1500);
  const [hoa, setHoa] = useState(0);
  const [melloRoos, setMelloRoos] = useState(0);
  const [showMelloTooltip, setShowMelloTooltip] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState('');

  const downPayment = dpMode === 'pct' ? homePrice * (dpPct / 100) : dpDollar;
  const dpPercent = dpMode === 'pct' ? dpPct : (dpDollar / homePrice) * 100;
  const loanAmount = Math.max(0, homePrice - downPayment);
  const needsPmi = dpPercent < 20;

  const breakdown: Breakdown = useMemo(() => {
    const pi = calcMonthlyPI(loanAmount, rate, loanTerm);
    const tax = (homePrice * (taxRate / 100)) / 12;
    const ins = insurance / 12;
    const mr = melloRoos / 12;
    const pmi = needsPmi ? (loanAmount * 0.005) / 12 : 0;
    return {
      principalInterest: pi,
      propertyTax: tax,
      insurance: ins,
      hoa,
      melloRoos: mr,
      pmi,
    };
  }, [homePrice, loanAmount, rate, loanTerm, taxRate, insurance, hoa, melloRoos, needsPmi]);

  const total =
    breakdown.principalInterest +
    breakdown.propertyTax +
    breakdown.insurance +
    breakdown.hoa +
    breakdown.melloRoos +
    breakdown.pmi;

  const totalInterest =
    breakdown.principalInterest * loanTerm * 12 - loanAmount;

  const payoffDate = new Date();
  payoffDate.setFullYear(payoffDate.getFullYear() + loanTerm);
  const payoffStr = payoffDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Donut chart data
  const segments = [
    { label: 'Principal & Interest', value: breakdown.principalInterest, color: '#2563eb' },
    { label: 'Property Tax', value: breakdown.propertyTax, color: '#7c3aed' },
    { label: 'Insurance', value: breakdown.insurance, color: '#059669' },
    { label: 'HOA', value: breakdown.hoa, color: '#d97706' },
    { label: 'Mello-Roos', value: breakdown.melloRoos, color: '#dc2626' },
    { label: 'PMI', value: breakdown.pmi, color: '#6b7280' },
  ].filter((s) => s.value > 0);

  const buildConicGradient = () => {
    if (total <= 0) return 'conic-gradient(#e5e7eb 0deg 360deg)';
    let acc = 0;
    const stops: string[] = [];
    segments.forEach((seg) => {
      const start = (acc / total) * 360;
      acc += seg.value;
      const end = (acc / total) * 360;
      stops.push(`${seg.color} ${start}deg ${end}deg`);
    });
    return `conic-gradient(${stops.join(', ')})`;
  };

  const NumberInput = ({
    label,
    value,
    onChange,
    id,
    prefix,
    suffix,
    min,
    max,
    step,
    tooltip,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    id: string;
    prefix?: string;
    suffix?: string;
    min?: number;
    max?: number;
    step?: number;
    tooltip?: string;
  }) => (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <label htmlFor={id} className="block text-sm font-medium text-neutral-700">
          {label}
        </label>
        {tooltip && (
          <div className="relative">
            <button
              type="button"
              className="text-neutral-400 hover:text-neutral-600"
              onMouseEnter={() => setShowMelloTooltip(true)}
              onMouseLeave={() => setShowMelloTooltip(false)}
              onFocus={() => setShowMelloTooltip(true)}
              onBlur={() => setShowMelloTooltip(false)}
              aria-label="More info"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            {showMelloTooltip && (
              <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-neutral-800 text-white text-xs rounded-lg shadow-lg">
                {tooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-neutral-800 rotate-45" />
              </div>
            )}
          </div>
        )}
      </div>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step ?? 1}
          className={`w-full py-2 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm ${
            prefix ? 'pl-7 pr-3' : suffix ? 'pl-3 pr-7' : 'px-3'
          }`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-neutral-100 overflow-hidden">
        <div className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-primary-800 mb-6">
            San Diego Mortgage Calculator
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Inputs */}
            <div className="space-y-5">
              <NumberInput
                label="Home price"
                id="homePrice"
                value={homePrice}
                onChange={setHomePrice}
                prefix="$"
                min={0}
                step={5000}
              />

              {/* Down payment toggle */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-neutral-700">
                    Down payment
                  </label>
                  <div className="flex bg-neutral-100 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setDpMode('pct')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        dpMode === 'pct'
                          ? 'bg-white shadow text-neutral-800'
                          : 'text-neutral-500'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDpMode('dollar');
                        setDpDollar(Math.round(homePrice * (dpPct / 100)));
                      }}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        dpMode === 'dollar'
                          ? 'bg-white shadow text-neutral-800'
                          : 'text-neutral-500'
                      }`}
                    >
                      $
                    </button>
                  </div>
                </div>
                {dpMode === 'pct' ? (
                  <div className="relative">
                    <input
                      type="number"
                      value={dpPct}
                      onChange={(e) => setDpPct(Number(e.target.value))}
                      min={0}
                      max={100}
                      step={0.5}
                      className="w-full py-2 pl-3 pr-7 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                      aria-label="Down payment percentage"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">
                      %
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      value={dpDollar}
                      onChange={(e) => setDpDollar(Number(e.target.value))}
                      min={0}
                      step={1000}
                      className="w-full py-2 pl-7 pr-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                      aria-label="Down payment amount"
                    />
                  </div>
                )}
                <p className="text-xs text-neutral-500">
                  {fmt.format(downPayment)} ({dpPercent.toFixed(1)}%)
                </p>
              </div>

              {/* Loan term */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-neutral-700">
                  Loan term
                </label>
                <div className="flex gap-2" role="radiogroup" aria-label="Loan term">
                  {[15, 20, 30].map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={loanTerm === t}
                      onClick={() => setLoanTerm(t)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                        loanTerm === t
                          ? 'border-accent-600 bg-accent-50 text-primary-800'
                          : 'border-neutral-200 text-neutral-600 hover:border-accent-300'
                      }`}
                    >
                      {t} years
                    </button>
                  ))}
                </div>
              </div>

              <NumberInput
                label="Interest rate"
                id="rate"
                value={rate}
                onChange={setRate}
                suffix="%"
                min={0}
                max={20}
                step={0.125}
              />
              <NumberInput
                label="Property tax rate"
                id="taxRate"
                value={taxRate}
                onChange={setTaxRate}
                suffix="%"
                min={0}
                max={5}
                step={0.05}
              />
              <NumberInput
                label="Homeowner's insurance ($/year)"
                id="insurance"
                value={insurance}
                onChange={setInsurance}
                prefix="$"
                min={0}
                step={100}
              />
              <NumberInput
                label="HOA ($/month)"
                id="hoa"
                value={hoa}
                onChange={setHoa}
                prefix="$"
                min={0}
                step={25}
              />
              <NumberInput
                label="Mello-Roos ($/year)"
                id="melloRoos"
                value={melloRoos}
                onChange={setMelloRoos}
                prefix="$"
                min={0}
                step={100}
                tooltip="Common in newer San Diego developments. Ranges from $0 to $5,000+/year."
              />

              {needsPmi && (
                <div className="flex items-center gap-2 text-sm text-warm-700 bg-warm-50 border border-warm-200 rounded-lg px-3 py-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  PMI included (down payment under 20%)
                </div>
              )}
            </div>

            {/* Results */}
            <div className="space-y-6">
              {/* Total */}
              <div className="text-center bg-accent-50 rounded-xl p-6">
                <p className="text-sm text-accent-700 font-medium mb-1">
                  Estimated Monthly Payment
                </p>
                <p className="text-4xl font-bold text-primary-800">
                  {fmt.format(total)}
                </p>
              </div>

              {/* Donut chart */}
              <div className="flex items-center gap-6">
                <div
                  className="w-36 h-36 rounded-full flex-shrink-0 relative"
                  style={{
                    background: buildConicGradient(),
                  }}
                  role="img"
                  aria-label="Payment breakdown chart"
                >
                  <div className="absolute inset-4 bg-white rounded-full" />
                </div>
                <div className="space-y-1.5 text-sm">
                  {segments.map((seg) => (
                    <div key={seg.label} className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="text-neutral-600">{seg.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Breakdown table */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {segments.map((seg) => (
                      <tr key={seg.label} className="border-b border-neutral-100 last:border-0">
                        <td className="px-4 py-2.5 text-neutral-600">
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-sm"
                              style={{ backgroundColor: seg.color }}
                            />
                            {seg.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-neutral-800">
                          {fmtDec.format(seg.value)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-neutral-50">
                      <td className="px-4 py-3 font-semibold text-neutral-800">
                        Total
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-neutral-800">
                        {fmtDec.format(total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Extra stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-neutral-500 mb-1">
                    Total Interest Over Loan Life
                  </p>
                  <p className="text-lg font-bold text-neutral-800">
                    {fmt.format(Math.max(0, totalInterest))}
                  </p>
                </div>
                <div className="bg-neutral-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-neutral-500 mb-1">Payoff Date</p>
                  <p className="text-lg font-bold text-neutral-800">{payoffStr}</p>
                </div>
              </div>

              {/* Email results */}
              {!showEmailForm ? (
                <button
                  type="button"
                  onClick={() => setShowEmailForm(true)}
                  className="w-full text-accent-600 hover:text-accent-700 text-sm font-medium py-2 border border-accent-200 rounded-lg hover:bg-accent-50 transition-colors"
                >
                  Email me my results
                </button>
              ) : emailSent ? (
                <div className="text-center text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                  Results sent! Check your inbox.
                </div>
              ) : (
                <div className="space-y-2">
                  <label htmlFor="emailResults" className="block text-sm font-medium text-neutral-700">
                    Email address
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="emailResults"
                      type="email"
                      placeholder="you@example.com"
                      value={emailAddress}
                      onChange={(e) => {
                        setEmailAddress(e.target.value);
                        setEmailError('');
                      }}
                      className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    />
                    <button
                      type="button"
                      disabled={emailSending || !emailAddress}
                      onClick={async () => {
                        if (!emailAddress) return;
                        setEmailSending(true);
                        setEmailError('');
                        try {
                          await fetch('/api/submit', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              email: emailAddress,
                              source_tool: 'mortgage-calculator',
                              source_page: window.location.pathname,
                              results: { total, breakdown, homePrice, loanAmount, rate, loanTerm },
                            }),
                          });
                          setEmailSent(true);
                        } catch {
                          setEmailError('Failed to send. Please try again or contact us directly.');
                        } finally {
                          setEmailSending(false);
                        }
                      }}
                      className="bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {emailSending ? (
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
                          Sending...
                        </>
                      ) : (
                        'Send'
                      )}
                    </button>
                  </div>
                  {emailError && (
                    <p className="text-sm text-red-600">{emailError}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
