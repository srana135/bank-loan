/**
 * Simple Interest Engine for Banking Loan Calculations
 * 
 * Logic:
 * 1. Initial interest: from disbursement to first installment, on full principal
 * 2. Principal recovery: installments reduce principal first
 * 3. Subsequent interest: calculated on remaining principal each period
 * 4. Once principal = 0, payments reduce accumulated interest
 */

export interface InterestConfig {
  ceilingRounding: number; // e.g. 1 = round to nearest 1, 10 = nearest 10
  gracePeriodMonths: number;
  interestAccumulatesDuringGrace: boolean;
}

export const DEFAULT_INTEREST_CONFIG: InterestConfig = {
  ceilingRounding: 1,
  gracePeriodMonths: 0,
  interestAccumulatesDuringGrace: true,
};

export interface InstallmentBreakdown {
  period: number;
  date: string;
  openingPrincipal: number;
  installment: number;
  principalPaid: number;
  interestCharged: number;
  accumulatedInterest: number;
  closingPrincipal: number;
  isGrace: boolean;
}

export function roundCeiling(value: number, rounding: number): number {
  if (rounding <= 0) return value;
  return Math.ceil(value / rounding) * rounding;
}

export function calculateSimpleInterestSchedule(
  principal: number,
  annualRate: number,
  installmentAmount: number,
  disbursementDate: Date,
  firstInstallmentDate: Date,
  totalInstallments: number,
  config: InterestConfig = DEFAULT_INTEREST_CONFIG,
): InstallmentBreakdown[] {
  const monthlyRate = annualRate / 100 / 12;
  const schedule: InstallmentBreakdown[] = [];

  // Initial interest: disbursement to first installment
  const diffMs = firstInstallmentDate.getTime() - disbursementDate.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const dailyRate = annualRate / 100 / 365;
  let accumulatedInterest = principal * dailyRate * diffDays;
  accumulatedInterest = roundCeiling(accumulatedInterest, config.ceilingRounding);

  let remainingPrincipal = principal;

  for (let i = 1; i <= totalInstallments; i++) {
    const installDate = new Date(firstInstallmentDate);
    installDate.setMonth(installDate.getMonth() + (i - 1));

    const isGrace = i <= config.gracePeriodMonths;
    const periodInterest = roundCeiling(remainingPrincipal * monthlyRate, config.ceilingRounding);

    if (isGrace && config.interestAccumulatesDuringGrace) {
      accumulatedInterest += periodInterest;
      schedule.push({
        period: i,
        date: installDate.toISOString().split('T')[0],
        openingPrincipal: remainingPrincipal,
        installment: 0,
        principalPaid: 0,
        interestCharged: periodInterest,
        accumulatedInterest,
        closingPrincipal: remainingPrincipal,
        isGrace: true,
      });
      continue;
    }

    // Interest this period
    accumulatedInterest += periodInterest;

    let principalPaid = 0;
    const inst = installmentAmount;

    if (remainingPrincipal > 0) {
      // Payment goes to principal
      principalPaid = Math.min(inst, remainingPrincipal);
      remainingPrincipal -= principalPaid;
    } else {
      // Principal cleared, payment reduces accumulated interest
      accumulatedInterest = Math.max(0, accumulatedInterest - inst);
    }

    schedule.push({
      period: i,
      date: installDate.toISOString().split('T')[0],
      openingPrincipal: remainingPrincipal + principalPaid,
      installment: inst,
      principalPaid,
      interestCharged: periodInterest,
      accumulatedInterest,
      closingPrincipal: remainingPrincipal,
      isGrace: false,
    });

    if (remainingPrincipal <= 0 && accumulatedInterest <= 0) break;
  }

  return schedule;
}

export function calculateTotalInterest(schedule: InstallmentBreakdown[]): number {
  return schedule.reduce((sum, s) => sum + s.interestCharged, 0);
}

export function calculateTotalPrincipalPaid(schedule: InstallmentBreakdown[]): number {
  return schedule.reduce((sum, s) => sum + s.principalPaid, 0);
}
