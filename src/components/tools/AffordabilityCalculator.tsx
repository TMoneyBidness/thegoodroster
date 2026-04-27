import React, { useState, useMemo } from 'react';

const fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const pctFmt = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

type CreditRange = 'below-580' | '580-619' | '620-679' | '680-739' | '740+';

const creditRates: Record<CreditRange, number> = {
  '740+': 6.5,
  '680-739': 7.0,
  '620-679': 7.5,
  '580-619': 8.0,
  'below-580': 8.5,
};

function calcMaxPurchaseFromPayment(
  maxMonthlyPayment: number,
  annualRate: number,
  years: number,
  taxRate: number,
  monthlyInsurance: number,
  downPayment: number
): number {
  // maxPayment = P&I + tax + insurance
  // P&I = (loanAmt * r * (1+r)^n) / ((1+r)^n - 1)
  // tax = homePrice * taxRate / 12
  // We need: homePrice such that:
  //   maxPayment = PI(homePrice - dp) + homePrice * taxRate/12 + insurance
  // Let x = homePrice
  //   maxPayment = PI(x - dp) + x * taxRate/12 + insurance
  //   maxPayment - insurance = PI(x - dp) + x * t
  //   where t = taxRate / 12
  // PI(loan) = loan * r*(1+r)^n / ((1+r)^n - 1) = loan * piRate
  // So: maxPayment - insurance = (x - dp) * piRate + x * t
  //     maxPayment - insurance = x * piRate - dp * piRate + x * t
  //     maxPayment - insurance + dp * piRate = x * (piRate + t)
  //     x = (maxPayment - insurance + dp * piRate) / (piRate + t)

  const r = annualRate / 100 / 12;
  const n = years * 12;
  let piRate: number;
  if (r <= 0) {
    piRate = 1 / n;
  } else {
    piRate = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }
  const t = taxRate / 12 / 100;
  const available = maxMonthlyPayment - monthlyInsurance;
  if (available <= 0) return 0;
  const price = (available + downPayment * piRate) / (piRate + t);
  return Math.max(0, price);
}

function calcMonthlyPaymentForPrice(
  homePrice: number,
  downPayment: number,
  annualRate: number,
  years: number,
  taxRate: number,
  monthlyInsurance: number
): number {
  const loan = Math.max(0, homePrice - downPayment);
  const r = annualRate / 100 / 12;
  const n = years * 12;
  let pi: number;
  if (r <= 0) {
    pi = loan / n;
  } else {
    pi = (loan * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
  }
  const tax = (homePrice * (taxRate / 100)) / 12;
  return pi + tax + monthlyInsurance;
}

export default function AffordabilityCalculator() {
  const [income, setIncome] = useState(120000);
  const [monthlyDebt, setMonthlyDebt] = useState(500);
  const [downPayment, setDownPayment] = useState(40000);
  const [credit, setCredit] = useState<CreditRange>('680-739');
  const [zipCode, setZipCode] = useState('');

  const taxRate = 1.25;
  const monthlyInsurance = 125;
  const loanTermYears = 30;
  const rate = creditRates[credit];

  const results = useMemo(() => {
    const monthlyIncome = income / 12;

    // Front-end DTI: 28% of gross monthly income
    const maxHousingFrontEnd = monthlyIncome * 0.28;

    // Back-end DTI: 36% of gross monthly income minus existing debts
    const maxHousingBackEnd = monthlyIncome * 0.36 - monthlyDebt;

    // Use the lower of the two
    const maxMonthly = Math.max(0, Math.min(maxHousingFrontEnd, maxHousingBackEnd));

    const maxPrice = calcMaxPurchaseFromPayment(
      maxMonthly,
      rate,
      loanTermYears,
      taxRate,
      monthlyInsurance,
      downPayment
    );
    const comfortablePrice = maxPrice * 0.85;
    const conservativePrice = maxPrice * 0.7;

    const maxPayment = calcMonthlyPaymentForPrice(
      maxPrice,
      downPayment,
      rate,
      loanTermYears,
      taxRate,
      monthlyInsurance
    );
    const comfortablePayment = calcMonthlyPaymentForPrice(
      comfortablePrice,
      downPayment,
      rate,
      loanTermYears,
      taxRate,
      monthlyInsurance
    );
    const conservativePayment = calcMonthlyPaymentForPrice(
      conservativePrice,
      downPayment,
      rate,
      loanTermYears,
      taxRate,
      monthlyInsurance
    );

    return {
      maxPrice,
      comfortablePrice,
      conservativePrice,
      maxPayment,
      comfortablePayment,
      conservativePayment,
      monthlyIncome,
    };
  }, [income, monthlyDebt, downPayment, rate]);

  const pctOfIncome = (payment: number) => payment / (income / 12);

  const tiers = [
    {
      key: 'conservative',
      title: 'Conservative',
      subtitle: 'Leaves more room in your budget',
      price: results.conservativePrice,
      payment: results.conservativePayment,
      style: 'border-neutral-200',
      bg: 'bg-white',
      badge: null,
    },
    {
      key: 'comfortable',
      title: 'Comfortable',
      subtitle: 'Recommended sweet spot',
      price: results.comfortablePrice,
      payment: results.comfortablePayment,
      style: 'border-accent-500 border-2 ring-2 ring-accent-100',
      bg: 'bg-accent-50/50',
      badge: 'Recommended',
    },
    {
      key: 'maximum',
      title: 'Maximum',
      subtitle: 'This is the maximum lenders might approve. It may feel tight.',
      price: results.maxPrice,
      payment: results.maxPayment,
      style: 'border-warm-300',
      bg: 'bg-white',
      badge: null,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-neutral-100 overflow-hidden">
        <div className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-primary-800 mb-1">
            How Much Home Can You Afford?
          </h2>
          <p className="text-neutral-500 text-sm mb-6">
            Based on San Diego averages and standard lending guidelines.
          </p>

          {/* Inputs */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            <div className="space-y-1.5">
              <label
                htmlFor="aff-income"
                className="block text-sm font-medium text-neutral-700"
              >
                Annual gross income
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">
                  $
                </span>
                <input
                  id="aff-income"
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(Number(e.target.value))}
                  min={0}
                  step={5000}
                  className="w-full py-2.5 pl-7 pr-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="aff-debt"
                className="block text-sm font-medium text-neutral-700"
              >
                Monthly debt payments
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">
                  $
                </span>
                <input
                  id="aff-debt"
                  type="number"
                  value={monthlyDebt}
                  onChange={(e) => setMonthlyDebt(Number(e.target.value))}
                  min={0}
                  step={50}
                  className="w-full py-2.5 pl-7 pr-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                />
              </div>
              <p className="text-xs text-neutral-400">
                Cars, student loans, credit card minimums
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="aff-dp"
                className="block text-sm font-medium text-neutral-700"
              >
                Down payment available
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">
                  $
                </span>
                <input
                  id="aff-dp"
                  type="number"
                  value={downPayment}
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                  min={0}
                  step={1000}
                  className="w-full py-2.5 pl-7 pr-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="aff-credit"
                className="block text-sm font-medium text-neutral-700"
              >
                Credit score range
              </label>
              <select
                id="aff-credit"
                value={credit}
                onChange={(e) => setCredit(e.target.value as CreditRange)}
                className="w-full py-2.5 px-3 rounded-lg border border-neutral-300 bg-white focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
              >
                <option value="740+">740+</option>
                <option value="680-739">680 - 739</option>
                <option value="620-679">620 - 679</option>
                <option value="580-619">580 - 619</option>
                <option value="below-580">Below 580</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="aff-zip"
                className="block text-sm font-medium text-neutral-700"
              >
                Target ZIP code{' '}
                <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <input
                id="aff-zip"
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={zipCode}
                onChange={(e) =>
                  setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))
                }
                placeholder="92101"
                className="w-full py-2.5 px-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
              />
            </div>
          </div>

          {/* Estimated rate callout */}
          <div className="bg-neutral-50 rounded-xl p-3 mb-6 flex items-center gap-3 text-sm">
            <span className="text-neutral-500">
              Estimated interest rate based on your credit score:
            </span>
            <span className="font-bold text-primary-800">{rate}%</span>
          </div>

          {/* Three tier cards */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {tiers.map((tier) => (
              <div
                key={tier.key}
                className={`relative rounded-xl border p-5 ${tier.style} ${tier.bg} transition-shadow hover:shadow-md ${
                  tier.key === 'comfortable' ? 'md:-mt-2 md:mb-[-8px]' : ''
                }`}
              >
                {tier.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {tier.badge}
                  </span>
                )}
                <h3
                  className={`text-lg font-bold mb-1 ${
                    tier.key === 'comfortable'
                      ? 'text-primary-900'
                      : 'text-primary-800'
                  }`}
                >
                  {tier.title}
                </h3>
                <p className="text-xs text-neutral-500 mb-4 leading-snug">
                  {tier.subtitle}
                </p>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-neutral-500 uppercase tracking-wide">
                      Purchase Price
                    </p>
                    <p
                      className={`text-2xl font-bold ${
                        tier.key === 'comfortable'
                          ? 'text-accent-700'
                          : 'text-primary-800'
                      }`}
                    >
                      {fmt.format(tier.price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 uppercase tracking-wide">
                      Est. Monthly Payment
                    </p>
                    <p className="text-lg font-semibold text-neutral-800">
                      {fmt.format(tier.payment)}
                      <span className="text-sm font-normal text-neutral-400">
                        /mo
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 uppercase tracking-wide">
                      % of Income to Housing
                    </p>
                    <p
                      className={`text-lg font-semibold ${
                        pctOfIncome(tier.payment) > 0.28
                          ? 'text-warm-600'
                          : 'text-green-600'
                      }`}
                    >
                      {pctFmt.format(pctOfIncome(tier.payment))}
                      <span className="text-sm font-normal ml-1.5">
                        {pctOfIncome(tier.payment) > 0.28
                          ? 'Stretched'
                          : 'Comfortable'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center bg-accent-50 rounded-xl p-5">
            <p className="text-neutral-700 text-sm mb-3">
              Want to see what programs you qualify for?
            </p>
            <a
              href="/tools/dpa-finder/"
              className="inline-block bg-accent-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-accent-700 transition-colors text-sm"
            >
              Find My DPA Match
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
