/**
 * Down Payment Assistance (DPA) program matching engine.
 * Pure function — the programs array is passed in, not imported.
 */

export interface DPAProgram {
  id: string;
  name: string;
  description: string;
  maxAssistance: number;
  assistanceType: 'grant' | 'deferred_loan' | 'forgivable_loan' | 'second_mortgage';
  maxIncome: number;
  maxPurchasePrice: number;
  requiresFirstTimeBuyer: boolean;
  requiresVeteran?: boolean;
  eligibleZipCodes?: string[];
  minCreditScore?: number;
  loanTypes?: string[];
  details?: string;
}

export interface DPAMatchParams {
  annualIncome: number;
  isFirstTimeBuyer: boolean;
  purchasePriceRange: [number, number];
  isVeteran?: boolean;
  zipCode?: string;
  creditScore?: number;
}

export interface DPAMatch {
  program: DPAProgram;
  estimatedAssistance: number;
  eligibilityNotes: string[];
}

/**
 * Match a buyer against available DPA programs.
 * Returns matched programs sorted by max assistance (highest first).
 *
 * @param params - Buyer profile parameters
 * @param programs - Array of available DPA programs (passed in to keep function pure)
 */
export function matchDPAPrograms(
  params: DPAMatchParams,
  programs: DPAProgram[]
): DPAMatch[] {
  const {
    annualIncome,
    isFirstTimeBuyer,
    purchasePriceRange,
    isVeteran = false,
    zipCode,
    creditScore,
  } = params;

  const [minPrice, maxPrice] = purchasePriceRange;
  const matches: DPAMatch[] = [];

  for (const program of programs) {
    const eligibilityNotes: string[] = [];
    let eligible = true;

    // Check income limit
    if (annualIncome > program.maxIncome) {
      eligible = false;
      continue; // Hard disqualification
    }

    // Check purchase price — the buyer's range must overlap with program max
    if (minPrice > program.maxPurchasePrice) {
      eligible = false;
      continue; // Hard disqualification
    }

    // Check first-time buyer requirement
    if (program.requiresFirstTimeBuyer && !isFirstTimeBuyer) {
      eligible = false;
      continue;
    }

    // Check veteran requirement
    if (program.requiresVeteran && !isVeteran) {
      eligible = false;
      continue;
    }

    // Check ZIP code eligibility
    if (program.eligibleZipCodes && program.eligibleZipCodes.length > 0) {
      if (!zipCode || !program.eligibleZipCodes.includes(zipCode)) {
        eligible = false;
        continue;
      }
      eligibilityNotes.push(`Available in ZIP code ${zipCode}`);
    }

    // Check credit score (soft note, not hard disqualification if unknown)
    if (program.minCreditScore && creditScore !== undefined) {
      if (creditScore < program.minCreditScore) {
        eligible = false;
        continue;
      }
    } else if (program.minCreditScore && creditScore === undefined) {
      eligibilityNotes.push(
        `Requires minimum credit score of ${program.minCreditScore}`
      );
    }

    if (eligible) {
      // Estimate the actual assistance amount
      // Cap at the program max, and also at the max purchase price in range
      const effectivePrice = Math.min(maxPrice, program.maxPurchasePrice);
      const estimatedAssistance = Math.min(program.maxAssistance, effectivePrice);

      if (program.requiresFirstTimeBuyer) {
        eligibilityNotes.push('Requires first-time homebuyer status');
      }

      eligibilityNotes.push(`Up to $${program.maxAssistance.toLocaleString()} in assistance`);
      eligibilityNotes.push(`Assistance type: ${program.assistanceType.replace(/_/g, ' ')}`);

      matches.push({
        program,
        estimatedAssistance,
        eligibilityNotes,
      });
    }
  }

  // Sort by max assistance, highest first
  matches.sort((a, b) => b.estimatedAssistance - a.estimatedAssistance);

  return matches;
}
