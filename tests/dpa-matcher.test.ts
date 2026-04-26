import { describe, it, expect } from 'vitest';
import { matchDPAPrograms, type DPAProgram } from '../src/lib/calculations/dpaMatcher';

// San Diego City ZIP codes (subset for testing)
const SD_CITY_ZIPS = ['92101', '92102', '92103', '92104', '92105', '92110', '92115', '92120'];

// Mock programs array for testing
const mockPrograms: DPAProgram[] = [
  {
    id: 'sdhc-closing-cost',
    name: 'SDHC Closing Cost Assistance',
    description: 'City of San Diego closing cost and down payment assistance',
    maxAssistance: 10_000,
    assistanceType: 'deferred_loan',
    maxIncome: 150_000,
    maxPurchasePrice: 750_000,
    requiresFirstTimeBuyer: true,
    eligibleZipCodes: SD_CITY_ZIPS,
    minCreditScore: 620,
  },
  {
    id: 'sdhc-dpa',
    name: 'SDHC Down Payment Assistance',
    description: 'City of San Diego down payment assistance up to 4% of purchase price',
    maxAssistance: 25_000,
    assistanceType: 'deferred_loan',
    maxIncome: 150_000,
    maxPurchasePrice: 750_000,
    requiresFirstTimeBuyer: true,
    eligibleZipCodes: SD_CITY_ZIPS,
    minCreditScore: 640,
  },
  {
    id: 'gsfa-platinum',
    name: 'GSFA Platinum Program',
    description: 'Statewide down payment assistance, does not require first-time buyer',
    maxAssistance: 20_000,
    assistanceType: 'forgivable_loan',
    maxIncome: 180_000,
    maxPurchasePrice: 1_000_000,
    requiresFirstTimeBuyer: false,
    minCreditScore: 600,
  },
  {
    id: 'calhfa-myhome',
    name: 'CalHFA MyHome Assistance',
    description: 'State program for first-time buyers, deferred second mortgage',
    maxAssistance: 15_000,
    assistanceType: 'second_mortgage',
    maxIncome: 160_000,
    maxPurchasePrice: 800_000,
    requiresFirstTimeBuyer: true,
    minCreditScore: 660,
  },
  {
    id: 'veteran-housing-grant',
    name: 'SD Veteran Housing Grant',
    description: 'Special grant for veterans purchasing in San Diego County',
    maxAssistance: 30_000,
    assistanceType: 'grant',
    maxIncome: 200_000,
    maxPurchasePrice: 900_000,
    requiresFirstTimeBuyer: false,
    requiresVeteran: true,
  },
];

describe('matchDPAPrograms', () => {
  it('matches SDHC programs only for City of San Diego ZIP codes', () => {
    const sdCityResult = matchDPAPrograms(
      {
        annualIncome: 100_000,
        isFirstTimeBuyer: true,
        purchasePriceRange: [400_000, 600_000],
        zipCode: '92101', // SD City
      },
      mockPrograms
    );

    const outsideResult = matchDPAPrograms(
      {
        annualIncome: 100_000,
        isFirstTimeBuyer: true,
        purchasePriceRange: [400_000, 600_000],
        zipCode: '92024', // Encinitas, not in SD City
      },
      mockPrograms
    );

    const sdhcMatches = sdCityResult.filter((m) => m.program.id.startsWith('sdhc'));
    const sdhcOutside = outsideResult.filter((m) => m.program.id.startsWith('sdhc'));

    expect(sdhcMatches.length).toBe(2);
    expect(sdhcOutside.length).toBe(0);
  });

  it('filters out programs that exceed income limits', () => {
    const result = matchDPAPrograms(
      {
        annualIncome: 200_000, // Over SDHC limit of $150K
        isFirstTimeBuyer: true,
        purchasePriceRange: [400_000, 600_000],
        zipCode: '92101',
      },
      mockPrograms
    );

    const sdhcMatches = result.filter((m) => m.program.id.startsWith('sdhc'));
    expect(sdhcMatches.length).toBe(0);
  });

  it('filters by first-time buyer requirement', () => {
    const fthb = matchDPAPrograms(
      {
        annualIncome: 100_000,
        isFirstTimeBuyer: true,
        purchasePriceRange: [400_000, 600_000],
        zipCode: '92101',
      },
      mockPrograms
    );

    const nonFthb = matchDPAPrograms(
      {
        annualIncome: 100_000,
        isFirstTimeBuyer: false,
        purchasePriceRange: [400_000, 600_000],
        zipCode: '92101',
      },
      mockPrograms
    );

    expect(fthb.length).toBeGreaterThan(nonFthb.length);

    // Non-FTHB should not match programs requiring FTHB
    const nonFthbIds = nonFthb.map((m) => m.program.id);
    expect(nonFthbIds).not.toContain('sdhc-closing-cost');
    expect(nonFthbIds).not.toContain('sdhc-dpa');
    expect(nonFthbIds).not.toContain('calhfa-myhome');
  });

  it('sorts results by max assistance, highest first', () => {
    const result = matchDPAPrograms(
      {
        annualIncome: 100_000,
        isFirstTimeBuyer: true,
        purchasePriceRange: [400_000, 600_000],
        zipCode: '92101',
      },
      mockPrograms
    );

    for (let i = 1; i < result.length; i++) {
      expect(result[i].estimatedAssistance).toBeLessThanOrEqual(
        result[i - 1].estimatedAssistance
      );
    }
  });

  it('allows non-FTHB to match GSFA (does not require FTHB)', () => {
    const result = matchDPAPrograms(
      {
        annualIncome: 100_000,
        isFirstTimeBuyer: false,
        purchasePriceRange: [400_000, 600_000],
      },
      mockPrograms
    );

    const gsfaMatch = result.find((m) => m.program.id === 'gsfa-platinum');
    expect(gsfaMatch).toBeDefined();
    expect(gsfaMatch!.estimatedAssistance).toBe(20_000);
  });

  it('matches veteran-only programs for veterans', () => {
    const vetResult = matchDPAPrograms(
      {
        annualIncome: 100_000,
        isFirstTimeBuyer: false,
        purchasePriceRange: [400_000, 600_000],
        isVeteran: true,
      },
      mockPrograms
    );

    const nonVetResult = matchDPAPrograms(
      {
        annualIncome: 100_000,
        isFirstTimeBuyer: false,
        purchasePriceRange: [400_000, 600_000],
        isVeteran: false,
      },
      mockPrograms
    );

    const vetOnly = vetResult.find((m) => m.program.id === 'veteran-housing-grant');
    const vetOnlyNon = nonVetResult.find((m) => m.program.id === 'veteran-housing-grant');

    expect(vetOnly).toBeDefined();
    expect(vetOnlyNon).toBeUndefined();
  });

  it('excludes programs when purchase price is too high', () => {
    const result = matchDPAPrograms(
      {
        annualIncome: 100_000,
        isFirstTimeBuyer: true,
        purchasePriceRange: [800_000, 1_200_000], // min > SDHC max of $750K
        zipCode: '92101',
      },
      mockPrograms
    );

    const sdhcMatches = result.filter((m) => m.program.id.startsWith('sdhc'));
    expect(sdhcMatches.length).toBe(0);
  });

  it('returns empty array when no programs match', () => {
    const result = matchDPAPrograms(
      {
        annualIncome: 500_000, // Over all limits
        isFirstTimeBuyer: false,
        purchasePriceRange: [2_000_000, 3_000_000],
      },
      mockPrograms
    );

    expect(result).toHaveLength(0);
  });

  it('includes eligibility notes for each match', () => {
    const result = matchDPAPrograms(
      {
        annualIncome: 100_000,
        isFirstTimeBuyer: true,
        purchasePriceRange: [400_000, 600_000],
        zipCode: '92101',
      },
      mockPrograms
    );

    for (const match of result) {
      expect(match.eligibilityNotes.length).toBeGreaterThan(0);
    }
  });
});
