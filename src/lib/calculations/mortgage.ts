/**
 * Pure mortgage calculation functions.
 * No side effects, no data imports — all inputs are passed as arguments.
 */

export type LoanType = 'conventional' | 'fha' | 'va';

export interface TotalPaymentParams {
  homePrice: number;
  downPayment: number;
  interestRate: number;
  termYears: number;
  propertyTaxRate?: number;
  insuranceAnnual?: number;
  hoaMonthly?: number;
  melloRoosAnnual?: number;
  loanType: LoanType;
  creditRange?: string;
}

export interface PaymentBreakdown {
  principal: number;
  interest: number;
  propertyTax: number;
  insurance: number;
  hoa: number;
  melloRoos: number;
  pmi: number;
  total: number;
}

/**
 * Calculate monthly principal & interest payment.
 * Uses the standard amortization formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (principal <= 0) return 0;
  if (annualRate <= 0) return principal / (termYears * 12);

  const monthlyRate = annualRate / 12;
  const numPayments = termYears * 12;
  const factor = Math.pow(1 + monthlyRate, numPayments);

  return principal * (monthlyRate * factor) / (factor - 1);
}

/**
 * Calculate estimated monthly PMI for conventional loans.
 * PMI rate ranges from 0.3% to 1.5% of the loan amount annually,
 * depending on LTV ratio and credit score. PMI drops off at 80% LTV.
 */
export function calculatePMI(
  loanAmount: number,
  homeValue: number,
  creditRange?: string
): number {
  const ltv = loanAmount / homeValue;

  // PMI not required at or below 80% LTV
  if (ltv <= 0.8) return 0;

  // Determine PMI rate based on credit range and LTV
  let annualPMIRate: number;

  if (creditRange === '760+' || creditRange === '740+') {
    annualPMIRate = ltv > 0.95 ? 0.0075 : ltv > 0.9 ? 0.005 : 0.003;
  } else if (creditRange === '720-739' || creditRange === '700-719') {
    annualPMIRate = ltv > 0.95 ? 0.0095 : ltv > 0.9 ? 0.007 : 0.005;
  } else if (creditRange === '680-699' || creditRange === '680-739') {
    annualPMIRate = ltv > 0.95 ? 0.012 : ltv > 0.9 ? 0.009 : 0.007;
  } else if (creditRange === '620-679' || creditRange === '640-679') {
    annualPMIRate = ltv > 0.95 ? 0.014 : ltv > 0.9 ? 0.011 : 0.009;
  } else {
    // Default / unknown credit — use mid-range estimate
    annualPMIRate = ltv > 0.95 ? 0.012 : ltv > 0.9 ? 0.009 : 0.007;
  }

  return (loanAmount * annualPMIRate) / 12;
}

/**
 * Calculate FHA monthly insurance premium (MIP).
 * Upfront MIP: 1.75% of loan amount (financed into loan).
 * Annual MIP: 0.55% for most FHA loans (> 90% LTV, 30-year term).
 * Returns the monthly MIP amount (does not include upfront).
 */
export function calculateMIP(
  loanAmount: number,
  termYears: number,
  ltv: number
): number {
  // Annual MIP rates based on term and LTV
  let annualMIPRate: number;

  if (termYears <= 15) {
    annualMIPRate = ltv > 0.9 ? 0.004 : 0.0015;
  } else {
    // 30-year or > 15 year term
    annualMIPRate = ltv > 0.9 ? 0.0055 : 0.005;
  }

  return (loanAmount * annualMIPRate) / 12;
}

/**
 * Get the upfront FHA MIP amount (1.75% of loan amount).
 */
export function getUpfrontMIP(loanAmount: number): number {
  return loanAmount * 0.0175;
}

/**
 * Calculate the total monthly payment including PITI, HOA, Mello-Roos, and PMI/MIP.
 */
export function calculateTotalMonthlyPayment(params: TotalPaymentParams): number {
  const breakdown = getPaymentBreakdown(params);
  return breakdown.total;
}

/**
 * Calculate total interest paid over the life of the loan.
 */
export function calculateAmortization(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termYears);
  const totalPaid = monthlyPayment * termYears * 12;
  return totalPaid - principal;
}

/**
 * Get a full breakdown of all monthly payment components.
 */
export function getPaymentBreakdown(params: TotalPaymentParams): PaymentBreakdown {
  const {
    homePrice,
    downPayment,
    interestRate,
    termYears,
    propertyTaxRate = 0.0125,
    insuranceAnnual = 1500,
    hoaMonthly = 0,
    melloRoosAnnual = 0,
    loanType,
    creditRange,
  } = params;

  const loanAmount = homePrice - downPayment;
  const ltv = loanAmount / homePrice;

  // Principal & Interest
  const monthlyPI = calculateMonthlyPayment(loanAmount, interestRate, termYears);

  // Split P&I into first-month principal vs interest for the breakdown
  const monthlyRate = interestRate / 12;
  const firstMonthInterest = loanAmount * monthlyRate;
  const firstMonthPrincipal = monthlyPI - firstMonthInterest;

  // Property tax
  const propertyTax = (homePrice * propertyTaxRate) / 12;

  // Homeowners insurance
  const insurance = insuranceAnnual / 12;

  // HOA
  const hoa = hoaMonthly;

  // Mello-Roos
  const melloRoos = melloRoosAnnual / 12;

  // PMI / MIP
  let pmi = 0;
  if (loanType === 'conventional') {
    pmi = calculatePMI(loanAmount, homePrice, creditRange);
  } else if (loanType === 'fha') {
    pmi = calculateMIP(loanAmount, termYears, ltv);
  }
  // VA loans have no monthly mortgage insurance

  const total = monthlyPI + propertyTax + insurance + hoa + melloRoos + pmi;

  return {
    principal: firstMonthPrincipal,
    interest: firstMonthInterest,
    propertyTax,
    insurance,
    hoa,
    melloRoos,
    pmi,
    total,
  };
}
