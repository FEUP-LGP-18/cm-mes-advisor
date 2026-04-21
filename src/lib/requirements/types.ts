export interface ParsedRequirement {
  sourceRowNumber: number;
  requirementId: string;
  requirementDescription: string;
  l2Process: string;
  l3Process: string;
  operation: string;
  demo: boolean;
  demoRaw: string;
  detailDescriptionAndMotivation: string;
  prioEms: string;
  prioCws: string;
  mvp: boolean;
  mvpRaw: string;
  availability: string;
  availabilityCm: string;
  descriptionAvailability: string;
  supportedPercent: string;
  sourceComment: string;
}

export interface RequirementsSummary {
  rowCount: number;
  demoCount: number;
  mvpCount: number;
  demoAndMvpCount: number;
}
