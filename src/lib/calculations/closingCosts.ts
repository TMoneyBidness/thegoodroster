/**
 * Pure closing cost estimation functions for San Diego real estate.
 * No side effects, no data imports.
 */

export type ClosingCostLoanType = 'conventional' | 'fha' | 'va';

export interface ClosingCostParams {
  purchasePrice: number;
  loanType: ClosingCostLoanType;
  downPaymentPercent: number;
  interestRate?: number;
  zipCode?: string;
  vaFundingFeeExempt?: boolean;
  vaSubsequentUse?: boolean;
}

export interface ClosingCostBreakdown {
  loanOrigination: number;
  appraisal: number;
  creditReport: number;
  titleInsuranceLender: number;
  titleInsuranceOwner: number;
  escrowFees: number;
  recordingFees: number;
  homeInspection: number;
  termiteInspection: number;
  prepaidPropertyTax: number;
  prepaidInsurance: number;
  prepaidInterest: number;
  vaFundingFee: number;
  fhaUpfrontMIP: number;
  total: number;
  percentOfPurchasePrice: number;
}

/**
 * Estimate itemized closing costs for a San Diego home purchase.
 */
export function estimateClosingCosts(params: ClosingCostParams): ClosingCostBreakdown {
  const {
    purchasePrice,
    loanType,
    downPaymentPercent,
    interestRate = 0.07,
    vaFundingFeeExempt = false,
    vaSubsequentUse = false,
  } = params;

  const loanAmount = purchasePrice * (1 - downPaymentPercent / 100);

  // Lender fees
  const loanOrigination = loanAmount * 0.005; // 0.5% default
  const appraisal = 500;
  const creditReport = 50;

  // Title & escrow
  const titleInsuranceLender = (loanAmount / 1000) * 3.5;
  const titleInsuranceOwner = (purchasePrice / 1000) * 2.5;
  const escrowFees = (purchasePrice / 1000) * 2 + 250;
  const recordingFees = 125;

  // Inspections
  const homeInspection = 500;
  const termiteInspection = 100;

  // Prepaids
  const monthlyPropertyTax = (purchasePrice * 0.0125) / 12;
  const prepaidPropertyTax = monthlyPropertyTax * 3;

  const monthlyInsurance = 125;
  const prepaidInsurance = monthlyInsurance * 14;

  // 15 days of daily interest
  const dailyInterest = (loanAmount * interestRate) / 365;
  const prepaidInterest = dailyInterest * 15;

  // VA funding fee
  let vaFundingFee = 0;
  if (loanType === 'va' && !vaFundingFeeExempt) {
    const feeRate = vaSubsequentUse ? 0.033 : 0.0215;
    vaFundingFee = loanAmount * feeRate;
  }

  // FHA upfront MIP
  let fhaUpfrontMIP = 0;
  if (loanType === 'fha') {
    fhaUpfrontMIP = loanAmount * 0.0175;
  }

  const total =
    loanOrigination +
    appraisal +
    creditReport +
    titleInsuranceLender +
    titleInsuranceOwner +
    escrowFees +
    recordingFees +
    homeInspection +
    termiteInspection +
    prepaidPropertyTax +
    prepaidInsurance +
    prepaidInterest +
    vaFundingFee +
    fhaUpfrontMIP;

  return {
    loanOrigination,
    appraisal,
    creditReport,
    titleInsuranceLender,
    titleInsuranceOwner,
    escrowFees,
    recordingFees,
    homeInspection,
    termiteInspection,
    prepaidPropertyTax,
    prepaidInsurance,
    prepaidInterest,
    vaFundingFee,
    fhaUpfrontMIP,
    total,
    percentOfPurchasePrice: total / purchasePrice,
  };
}
