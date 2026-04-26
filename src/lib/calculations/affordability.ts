/**
 * Pure affordability calculation functions.
 * Uses DTI (debt-to-income) ratios to estimate max purchase price.
 */

export interface AffordabilityParams {
  annualIncome: number;
  monthlyDebts: number;
  downPayment: number;
  creditRange: string;
  interestRate?: number;
  propertyTaxRate?: number;
  insuranceAnnual?: number;
  loanType?: 'conventional' | 'fha' | 'va';
}

export interface AffordabilityResult {
  maxPurchasePrice: number;
  comfortablePurchasePrice: number;
  conservativePurchasePrice: number;
  monthlyPaymentAtMax: number;
  monthlyPaymentAtComfortable: number;
  monthlyPaymentConservative: number;
  estimatedRate: number;
}

/**
 * Estimate interest rate based on credit score range.
 */
export function estimateRateFromCredit(creditRange: string): number {
  switch (creditRange) {
    case '740+':
    case '760+':
      return 0.065;
    case '720-739':
    case '700-719':
    case '680-739':
      return 0.07;
    case '620-679':
    case '640-679':
      return 0.075;
    case '580-619':
      return 0.08;
    default:
      return 0.07;
  }
}

/**
 * Calculate the maximum purchase price a buyer can afford.
 *
 * Uses the front-end DTI ratio (housing costs / gross monthly income)
 * and the back-end ratio (total debts / gross monthly income).
 *
 * Conventional: 28% front-end, 36% back-end
 * FHA: 31% front-end, 43% back-end
 */
export function calculateMaxPurchasePrice(params: AffordabilityParams): AffordabilityResult {
  const {
    annualIncome,
    monthlyDebts,
    downPayment,
    creditRange,
    propertyTaxRate = 0.0125,
    insuranceAnnual = 1500,
    loanType = 'conventional',
  } = params;

  const estimatedRate = params.interestRate ?? estimateRateFromCredit(creditRange);
  const grossMonthlyIncome = annualIncome / 12;

  // DTI limits
  const frontEndLimit = loanType === 'fha' ? 0.31 : 0.28;
  const backEndLimit = loanType === 'fha' ? 0.43 : 0.36;

  // Max housing payment from front-end ratio
  const maxHousingFromFrontEnd = grossMonthlyIncome * frontEndLimit;

  // Max housing payment from back-end ratio (subtract existing debts)
  const maxHousingFromBackEnd = grossMonthlyIncome * backEndLimit - monthlyDebts;

  // Use the more restrictive of the two
  const maxHousingPayment = Math.min(maxHousingFromFrontEnd, maxHousingFromBackEnd);

  // Solve for purchase price given the max housing payment
  const maxPrice = solvePurchasePrice(
    maxHousingPayment,
    downPayment,
    estimatedRate,
    30,
    propertyTaxRate,
    insuranceAnnual
  );

  // Comfortable: 25% front-end ratio
  const comfortableHousing = Math.min(
    grossMonthlyIncome * 0.25,
    grossMonthlyIncome * backEndLimit - monthlyDebts
  );
  const comfortablePrice = solvePurchasePrice(
    comfortableHousing,
    downPayment,
    estimatedRate,
    30,
    propertyTaxRate,
    insuranceAnnual
  );

  // Conservative: 20% front-end ratio
  const conservativeHousing = Math.min(
    grossMonthlyIncome * 0.2,
    grossMonthlyIncome * backEndLimit - monthlyDebts
  );
  const conservativePrice = solvePurchasePrice(
    conservativeHousing,
    downPayment,
    estimatedRate,
    30,
    propertyTaxRate,
    insuranceAnnual
  );

  return {
    maxPurchasePrice: Math.max(0, Math.round(maxPrice)),
    comfortablePurchasePrice: Math.max(0, Math.round(comfortablePrice)),
    conservativePurchasePrice: Math.max(0, Math.round(conservativePrice)),
    monthlyPaymentAtMax: Math.round(maxHousingPayment),
    monthlyPaymentAtComfortable: Math.round(comfortableHousing),
    monthlyPaymentConservative: Math.round(conservativeHousing),
    estimatedRate,
  };
}

/**
 * Given a max monthly housing payment, solve for the purchase price.
 *
 * Housing payment = P&I + property tax + insurance
 * We iteratively solve since the loan amount depends on the purchase price,
 * but we use an algebraic approach for efficiency.
 */
function solvePurchasePrice(
  maxMonthlyPayment: number,
  downPayment: number,
  annualRate: number,
  termYears: number,
  propertyTaxRate: number,
  insuranceAnnual: number
): number {
  if (maxMonthlyPayment <= 0) return 0;

  const monthlyRate = annualRate / 12;
  const numPayments = termYears * 12;
  const factor = Math.pow(1 + monthlyRate, numPayments);
  const piRateFactor = (monthlyRate * factor) / (factor - 1);

  // Monthly payment = loanAmount * piRateFactor + homePrice * propertyTaxRate/12 + insuranceAnnual/12
  // loanAmount = homePrice - downPayment
  // So: maxPayment = (homePrice - downPayment) * piRateFactor + homePrice * propertyTaxRate/12 + insuranceAnnual/12
  // maxPayment - insuranceAnnual/12 + downPayment * piRateFactor = homePrice * (piRateFactor + propertyTaxRate/12)
  // homePrice = (maxPayment - insuranceAnnual/12 + downPayment * piRateFactor) / (piRateFactor + propertyTaxRate/12)

  const monthlyInsurance = insuranceAnnual / 12;
  const monthlyTaxRate = propertyTaxRate / 12;

  const numerator = maxMonthlyPayment - monthlyInsurance + downPayment * piRateFactor;
  const denominator = piRateFactor + monthlyTaxRate;

  if (denominator <= 0) return 0;

  return numerator / denominator;
}
