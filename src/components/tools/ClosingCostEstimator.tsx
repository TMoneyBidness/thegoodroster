import React, { useState, useMemo } from 'react';

const fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

type LoanType = 'conventional' | 'fha' | 'va' | 'jumbo';

interface CostItem {
  label: string;
  amount: number;
  category: 'lender' | 'title-escrow' | 'prepaids' | 'government';
  optional?: boolean;
}

const categoryLabels: Record<string, string> = {
  lender: 'Lender Fees',
  'title-escrow': 'Title & Escrow',
  prepaids: 'Prepaids',
  government: 'Government & Loan-Specific Fees',
};

const categoryColors: Record<string, string> = {
  lender: 'bg-accent-50 border-accent-200 text-primary-800',
  'title-escrow': 'bg-accent-50 border-accent-200 text-primary-800',
  prepaids: 'bg-green-50 border-green-200 text-green-800',
  government: 'bg-warm-50 border-warm-200 text-warm-800',
};

export default function ClosingCostEstimator() {
  const [purchasePrice, setPurchasePrice] = useState(750000);
  const [loanType, setLoanType] = useState<LoanType>('conventional');
  const [dpPct, setDpPct] = useState(10);
  const [zipCode, setZipCode] = useState('');

  const loanAmount = purchasePrice * (1 - dpPct / 100);

  const costs: CostItem[] = useMemo(() => {
    const items: CostItem[] = [
      // Lender fees
      {
        label: 'Origination fee (0.5%)',
        amount: loanAmount * 0.005,
        category: 'lender',
      },
      { label: 'Appraisal', amount: 500, category: 'lender' },
      { label: 'Credit report', amount: 50, category: 'lender' },

      // Title & Escrow
      {
        label: 'Title insurance (lender)',
        amount: (loanAmount / 1000) * 3.5,
        category: 'title-escrow',
      },
      {
        label: "Title insurance (owner's)",
        amount: (purchasePrice / 1000) * 2.5,
        category: 'title-escrow',
        optional: true,
      },
      {
        label: 'Escrow fee',
        amount: (purchasePrice / 1000) * 2 + 250,
        category: 'title-escrow',
      },
      { label: 'Recording fees', amount: 125, category: 'title-escrow' },

      // Prepaids
      { label: 'Home inspection', amount: 500, category: 'prepaids' },
      { label: 'Termite inspection', amount: 100, category: 'prepaids' },
      {
        label: 'Prepaid property tax (3 months)',
        amount: (purchasePrice * 0.0125 * 3) / 12,
        category: 'prepaids',
      },
      {
        label: 'Prepaid insurance (14 months)',
        amount: 125 * 14,
        category: 'prepaids',
      },
      {
        label: 'Prepaid interest (15 days est.)',
        amount: (loanAmount * 0.0675 * 15) / 365,
        category: 'prepaids',
      },
    ];

    // Loan-type-specific fees
    if (loanType === 'fha') {
      items.push({
        label: 'UFMIP (1.75% of loan)',
        amount: loanAmount * 0.0175,
        category: 'government',
      });
    }
    if (loanType === 'va') {
      items.push({
        label: 'VA Funding Fee (2.15%, first use)',
        amount: loanAmount * 0.0215,
        category: 'government',
      });
    }

    return items;
  }, [purchasePrice, loanAmount, loanType]);

  const grouped = useMemo(() => {
    const groups: Record<string, CostItem[]> = {};
    costs.forEach((c) => {
      if (!groups[c.category]) groups[c.category] = [];
      groups[c.category].push(c);
    });
    return groups;
  }, [costs]);

  const grandTotal = costs.reduce((s, c) => s + c.amount, 0);
  const pctOfPrice = (grandTotal / purchasePrice) * 100;

  const categoryOrder = ['lender', 'title-escrow', 'prepaids', 'government'];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-neutral-100 overflow-hidden">
        <div className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-primary-800 mb-1">
            San Diego Closing Cost Estimator
          </h2>
          <p className="text-neutral-500 text-sm mb-6">
            Get a detailed estimate of your closing costs based on San Diego
            averages.
          </p>

          {/* Inputs */}
          <div className="grid sm:grid-cols-2 gap-5 mb-8">
            <div className="space-y-1.5">
              <label
                htmlFor="cc-price"
                className="block text-sm font-medium text-neutral-700"
              >
                Purchase price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">
                  $
                </span>
                <input
                  id="cc-price"
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  min={0}
                  step={5000}
                  className="w-full py-2.5 pl-7 pr-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700">
                Loan type
              </label>
              <div
                className="grid grid-cols-4 gap-1.5"
                role="radiogroup"
                aria-label="Loan type"
              >
                {(
                  [
                    ['conventional', 'Conv.'],
                    ['fha', 'FHA'],
                    ['va', 'VA'],
                    ['jumbo', 'Jumbo'],
                  ] as [LoanType, string][]
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    role="radio"
                    aria-checked={loanType === val}
                    onClick={() => setLoanType(val)}
                    className={`py-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                      loanType === val
                        ? 'border-accent-600 bg-accent-50 text-primary-900'
                        : 'border-neutral-200 text-neutral-600 hover:border-accent-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="cc-dp"
                className="block text-sm font-medium text-neutral-700"
              >
                Down payment
              </label>
              <div className="relative">
                <input
                  id="cc-dp"
                  type="number"
                  value={dpPct}
                  onChange={(e) => setDpPct(Number(e.target.value))}
                  min={0}
                  max={100}
                  step={0.5}
                  className="w-full py-2.5 pl-3 pr-7 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">
                  %
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Loan amount: {fmt.format(loanAmount)}
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="cc-zip"
                className="block text-sm font-medium text-neutral-700"
              >
                ZIP code{' '}
                <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <input
                id="cc-zip"
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

          {/* Results */}
          <div className="space-y-4">
            {categoryOrder.map((cat) => {
              const items = grouped[cat];
              if (!items || items.length === 0) return null;
              const subtotal = items.reduce((s, c) => s + c.amount, 0);
              return (
                <div key={cat}>
                  <div
                    className={`flex items-center justify-between px-4 py-2 rounded-t-lg border ${categoryColors[cat]}`}
                  >
                    <h3 className="text-sm font-semibold">
                      {categoryLabels[cat]}
                    </h3>
                    <span className="text-sm font-bold">
                      {fmt.format(subtotal)}
                    </span>
                  </div>
                  <div className="border border-t-0 border-neutral-200 rounded-b-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody>
                        {items.map((item) => (
                          <tr
                            key={item.label}
                            className="border-b border-neutral-100 last:border-0"
                          >
                            <td className="px-4 py-2.5 text-neutral-600">
                              {item.label}
                              {item.optional && (
                                <span className="ml-1 text-xs text-neutral-400">
                                  (optional)
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right font-medium text-primary-800">
                              {fmt.format(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Grand total */}
            <div className="bg-accent-50 border-2 border-accent-200 rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-accent-700 font-medium">
                  Estimated Total Closing Costs
                </p>
                <p className="text-xs text-accent-600 mt-0.5">
                  {pctOfPrice.toFixed(1)}% of purchase price
                </p>
              </div>
              <p className="text-3xl font-bold text-primary-900">
                {fmt.format(grandTotal)}
              </p>
            </div>

            {/* Guidance text */}
            <div className="bg-neutral-50 rounded-xl p-4 text-sm text-neutral-600 leading-relaxed">
              <strong className="text-primary-800">Note:</strong> Most San Diego
              buyers see total closing costs of 2-5% of purchase price. Your
              actual costs will vary based on your lender, title company, and
              specific situation. Some costs may be negotiable or paid by the
              seller.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
