import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyPayment,
  calculatePMI,
  calculateMIP,
  calculateTotalMonthlyPayment,
  calculateAmortization,
  getPaymentBreakdown,
} from '../src/lib/calculations/mortgage';
import { estimateClosingCosts } from '../src/lib/calculations/closingCosts';
import { calculateMaxPurchasePrice, estimateRateFromCredit } from '../src/lib/calculations/affordability';

// ─── Mortgage ────────────────────────────────────────────────────────────────

describe('calculateMonthlyPayment', () => {
  it('calculates ~$3,327/mo for $500K at 7% for 30 years', () => {
    const payment = calculateMonthlyPayment(500_000, 0.07, 30);
    expect(payment).toBeCloseTo(3326.51, 0);
  });

  it('returns 0 for zero principal', () => {
    expect(calculateMonthlyPayment(0, 0.07, 30)).toBe(0);
  });

  it('handles zero interest rate', () => {
    const payment = calculateMonthlyPayment(360_000, 0, 30);
    expect(payment).toBe(1000); // 360k / 360 months
  });

  it('calculates 15-year term correctly', () => {
    const payment = calculateMonthlyPayment(300_000, 0.065, 15);
    // Known value: ~$2,613
    expect(payment).toBeGreaterThan(2600);
    expect(payment).toBeLessThan(2630);
  });
});

describe('calculatePMI', () => {
  it('returns 0 at 80% LTV', () => {
    const pmi = calculatePMI(400_000, 500_000, '740+');
    expect(pmi).toBe(0);
  });

  it('returns 0 below 80% LTV', () => {
    const pmi = calculatePMI(350_000, 500_000, '740+');
    expect(pmi).toBe(0);
  });

  it('returns positive value above 80% LTV', () => {
    const pmi = calculatePMI(475_000, 500_000, '740+'); // 95% LTV
    expect(pmi).toBeGreaterThan(0);
  });

  it('charges more for lower credit scores', () => {
    const pmiGood = calculatePMI(450_000, 500_000, '740+');
    const pmiFair = calculatePMI(450_000, 500_000, '620-679');
    expect(pmiFair).toBeGreaterThan(pmiGood);
  });
});

describe('calculateMIP', () => {
  it('calculates FHA MIP for 30-year term with high LTV', () => {
    const mip = calculateMIP(450_000, 30, 0.965);
    // 0.55% annual rate for > 90% LTV, 30-year
    const expected = (450_000 * 0.0055) / 12;
    expect(mip).toBeCloseTo(expected, 2);
  });

  it('uses lower rate for 15-year term with low LTV', () => {
    const mip = calculateMIP(300_000, 15, 0.85);
    const expected = (300_000 * 0.0015) / 12;
    expect(mip).toBeCloseTo(expected, 2);
  });
});

describe('calculateTotalMonthlyPayment', () => {
  it('includes all payment components', () => {
    const total = calculateTotalMonthlyPayment({
      homePrice: 600_000,
      downPayment: 120_000,
      interestRate: 0.07,
      termYears: 30,
      loanType: 'conventional',
      hoaMonthly: 300,
      melloRoosAnnual: 1200,
    });

    // P&I on $480K at 7%/30yr is ~$3,194
    // Property tax: 600K * 1.25% / 12 = $625
    // Insurance: 1500 / 12 = $125
    // HOA: $300
    // Mello-Roos: 1200 / 12 = $100
    // PMI: 0 (80% LTV)
    // Total should be around $4,344
    expect(total).toBeGreaterThan(4200);
    expect(total).toBeLessThan(4500);
  });

  it('includes PMI for high LTV conventional loans', () => {
    const withHighDown = calculateTotalMonthlyPayment({
      homePrice: 500_000,
      downPayment: 100_000,
      interestRate: 0.07,
      termYears: 30,
      loanType: 'conventional',
    });

    const withLowDown = calculateTotalMonthlyPayment({
      homePrice: 500_000,
      downPayment: 25_000,
      interestRate: 0.07,
      termYears: 30,
      loanType: 'conventional',
    });

    // Low down payment should cost more (higher P&I + PMI)
    expect(withLowDown).toBeGreaterThan(withHighDown);
  });
});

describe('calculateAmortization', () => {
  it('calculates total interest over loan life', () => {
    const totalInterest = calculateAmortization(500_000, 0.07, 30);
    // Total payments = $3,326.51 * 360 = ~$1,197,543
    // Total interest = ~$697,543
    expect(totalInterest).toBeGreaterThan(690_000);
    expect(totalInterest).toBeLessThan(700_000);
  });
});

describe('getPaymentBreakdown', () => {
  it('returns all component amounts', () => {
    const breakdown = getPaymentBreakdown({
      homePrice: 500_000,
      downPayment: 100_000,
      interestRate: 0.07,
      termYears: 30,
      loanType: 'conventional',
      hoaMonthly: 200,
      melloRoosAnnual: 600,
    });

    expect(breakdown.principal).toBeGreaterThan(0);
    expect(breakdown.interest).toBeGreaterThan(0);
    expect(breakdown.propertyTax).toBeCloseTo(520.83, 0);
    expect(breakdown.insurance).toBeCloseTo(125, 0);
    expect(breakdown.hoa).toBe(200);
    expect(breakdown.melloRoos).toBeCloseTo(50, 0);
    expect(breakdown.pmi).toBe(0); // 80% LTV
    expect(breakdown.total).toBeCloseTo(
      breakdown.principal + breakdown.interest + breakdown.propertyTax +
      breakdown.insurance + breakdown.hoa + breakdown.melloRoos + breakdown.pmi,
      2
    );
  });

  it('includes FHA MIP instead of PMI for FHA loans', () => {
    const breakdown = getPaymentBreakdown({
      homePrice: 400_000,
      downPayment: 14_000, // 3.5% down
      interestRate: 0.07,
      termYears: 30,
      loanType: 'fha',
    });

    expect(breakdown.pmi).toBeGreaterThan(0); // MIP stored in pmi field
  });

  it('has no mortgage insurance for VA loans', () => {
    const breakdown = getPaymentBreakdown({
      homePrice: 500_000,
      downPayment: 0,
      interestRate: 0.065,
      termYears: 30,
      loanType: 'va',
    });

    expect(breakdown.pmi).toBe(0);
  });
});

// ─── Closing Costs ───────────────────────────────────────────────────────────

describe('estimateClosingCosts', () => {
  it('produces costs in 2-5% range of purchase price', () => {
    const result = estimateClosingCosts({
      purchasePrice: 600_000,
      loanType: 'conventional',
      downPaymentPercent: 20,
    });

    expect(result.percentOfPurchasePrice).toBeGreaterThan(0.02);
    expect(result.percentOfPurchasePrice).toBeLessThan(0.05);
  });

  it('includes VA funding fee for VA loans', () => {
    const result = estimateClosingCosts({
      purchasePrice: 500_000,
      loanType: 'va',
      downPaymentPercent: 0,
    });

    // 2.15% of loan amount ($500K) = $10,750
    expect(result.vaFundingFee).toBeCloseTo(10_750, 0);
    expect(result.fhaUpfrontMIP).toBe(0);
  });

  it('waives VA funding fee for disabled veterans', () => {
    const result = estimateClosingCosts({
      purchasePrice: 500_000,
      loanType: 'va',
      downPaymentPercent: 0,
      vaFundingFeeExempt: true,
    });

    expect(result.vaFundingFee).toBe(0);
  });

  it('uses higher VA fee for subsequent use', () => {
    const first = estimateClosingCosts({
      purchasePrice: 500_000,
      loanType: 'va',
      downPaymentPercent: 0,
    });

    const subsequent = estimateClosingCosts({
      purchasePrice: 500_000,
      loanType: 'va',
      downPaymentPercent: 0,
      vaSubsequentUse: true,
    });

    expect(subsequent.vaFundingFee).toBeGreaterThan(first.vaFundingFee);
  });

  it('includes FHA UFMIP for FHA loans', () => {
    const result = estimateClosingCosts({
      purchasePrice: 400_000,
      loanType: 'fha',
      downPaymentPercent: 3.5,
    });

    // 1.75% of loan amount ($386K)
    const loanAmount = 400_000 * 0.965;
    expect(result.fhaUpfrontMIP).toBeCloseTo(loanAmount * 0.0175, 0);
    expect(result.vaFundingFee).toBe(0);
  });

  it('has no VA fee or FHA MIP for conventional', () => {
    const result = estimateClosingCosts({
      purchasePrice: 500_000,
      loanType: 'conventional',
      downPaymentPercent: 20,
    });

    expect(result.vaFundingFee).toBe(0);
    expect(result.fhaUpfrontMIP).toBe(0);
  });

  it('calculates prepaid items correctly', () => {
    const result = estimateClosingCosts({
      purchasePrice: 600_000,
      loanType: 'conventional',
      downPaymentPercent: 20,
    });

    // 3 months property tax at 1.25%
    expect(result.prepaidPropertyTax).toBeCloseTo((600_000 * 0.0125 / 12) * 3, 0);
    // 14 months insurance at $125/mo
    expect(result.prepaidInsurance).toBe(1750);
  });
});

// ─── Affordability ───────────────────────────────────────────────────────────

describe('estimateRateFromCredit', () => {
  it('returns 6.5% for excellent credit', () => {
    expect(estimateRateFromCredit('740+')).toBe(0.065);
  });

  it('returns 8.0% for poor credit', () => {
    expect(estimateRateFromCredit('580-619')).toBe(0.08);
  });
});

describe('calculateMaxPurchasePrice', () => {
  it('returns a reasonable max price for $120K income', () => {
    const result = calculateMaxPurchasePrice({
      annualIncome: 120_000,
      monthlyDebts: 500,
      downPayment: 60_000,
      creditRange: '740+',
    });

    // $10K/mo gross, 28% = $2,800 max housing
    // Back-end: 36% = $3,600 - $500 = $3,100
    // Limited by front-end: $2,800
    // Should yield a purchase price roughly $400K-$500K range
    expect(result.maxPurchasePrice).toBeGreaterThan(350_000);
    expect(result.maxPurchasePrice).toBeLessThan(550_000);
  });

  it('respects back-end DTI when debts are high', () => {
    const lowDebt = calculateMaxPurchasePrice({
      annualIncome: 120_000,
      monthlyDebts: 200,
      downPayment: 60_000,
      creditRange: '740+',
    });

    const highDebt = calculateMaxPurchasePrice({
      annualIncome: 120_000,
      monthlyDebts: 2000,
      downPayment: 60_000,
      creditRange: '740+',
    });

    expect(highDebt.maxPurchasePrice).toBeLessThan(lowDebt.maxPurchasePrice);
  });

  it('comfortable price is less than max', () => {
    const result = calculateMaxPurchasePrice({
      annualIncome: 100_000,
      monthlyDebts: 300,
      downPayment: 50_000,
      creditRange: '680-739',
    });

    expect(result.comfortablePurchasePrice).toBeLessThan(result.maxPurchasePrice);
    expect(result.conservativePurchasePrice).toBeLessThan(result.comfortablePurchasePrice);
  });

  it('uses FHA DTI ratios when specified', () => {
    const conventional = calculateMaxPurchasePrice({
      annualIncome: 100_000,
      monthlyDebts: 300,
      downPayment: 30_000,
      creditRange: '680-739',
      loanType: 'conventional',
    });

    const fha = calculateMaxPurchasePrice({
      annualIncome: 100_000,
      monthlyDebts: 300,
      downPayment: 30_000,
      creditRange: '680-739',
      loanType: 'fha',
    });

    // FHA allows higher DTI (31/43 vs 28/36), so max should be higher
    expect(fha.maxPurchasePrice).toBeGreaterThan(conventional.maxPurchasePrice);
  });

  it('returns zero when debts exceed back-end limit', () => {
    const result = calculateMaxPurchasePrice({
      annualIncome: 50_000,
      monthlyDebts: 3000, // Way over 36% of $4,167/mo
      downPayment: 20_000,
      creditRange: '740+',
    });

    expect(result.maxPurchasePrice).toBe(0);
  });

  it('includes the estimated rate', () => {
    const result = calculateMaxPurchasePrice({
      annualIncome: 100_000,
      monthlyDebts: 0,
      downPayment: 50_000,
      creditRange: '740+',
    });

    expect(result.estimatedRate).toBe(0.065);
  });
});
