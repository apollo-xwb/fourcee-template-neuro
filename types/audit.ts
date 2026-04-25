export interface AuditData {
  auditMeta: {
    generatedDate: string;
    reportId: string;
    confidentialityLabel: string;
    preparedForLabel: string;
    currencyCode: string;
    currencySymbol: string;
    locale: string;
  };
  business: {
    name: string;
    location: string;
    logoUrl: string;
    industry: string;
    storeCount: number;
    teamSize: number | null;
    website: string;
    primaryPhone: string;
  };
  reviews: {
    rating: number;
    count: number;
    starsDisplay: string;
    quote1: string;
    quote2: string;
    themes: string[];
  };
  traffic: {
    sources: Array<{
      label: string;
      percent: number;
      colorKey: string;
    }>;
  };
  callModel: {
    inboundCallsPerWeekMin: number;
    inboundCallsPerWeekMax: number;
    answerRateMin: number;
    answerRateMax: number;
    missedCallsPerWeekMin: number;
    missedCallsPerWeekMax: number;
    answeredCallsPerWeekMin: number;
    answeredCallsPerWeekMax: number;
    missedCallTypeSplit: Array<{
      label: string;
      percent: number;
    }>;
  };
  revenueModel: {
    monthlyLossMin: number;
    monthlyLossMax: number;
    monthlyLossMidpoint: number;
    sixMonthCumulativeLeak: number;
    lineSeries: number[];
  };
  breakdown: {
    rows: Array<{
      callType: string;
      weeklyMissedMin: number;
      weeklyMissedMax: number;
      monthlyImpactMin: number;
      monthlyImpactMax: number;
    }>;
    riskBadge: string;
    opportunityCards: Array<{
      title: string;
      subtitle: string;
      valueNote: string;
      impactTier: string;
      mobileWidthPercent: number;
    }>;
  };
  comparison: {
    currentAnsweredRate: number;
    currentMonthlyLoss: number;
    projectedAnsweredRate: number;
    projectedMonthlyLoss: number;
    comparisonFootnote: string;
  };
  projection90d: {
    answerRateProjected: string;
    monthlyRecoveredProjected: string;
    paybackPeriodProjected: string;
    barWidths: {
      answerRate: string;
      monthlyRecovered: string;
      paybackPeriod: string;
    };
  };
  recoveryPlan: {
    headline: string;
    body: string;
    capabilities: string[];
    supportingMediaUrl: string;
  };
  liveDemo: {
    ctaLabel: string;
    helperCopy: string;
    phoneCountryDefault: string;
    demoDurationHint: string;
  };
  branding: {
    theme: {
      primary: string;
      secondary: string;
      accentGold: string;
      accentSilver: string;
    };
    logoWordmarkUrl: string;
    clientLogoUrl: string;
    fontHeading: string;
    fontBody: string;
  };
  compliance: {
    dataSourceLine: string;
    disclaimerShort: string;
    disclaimerLong: string;
    allowedClaims: string[];
  };
}
