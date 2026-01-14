// AI Flow stub for debt risk prediction
export interface DebtRiskPredictionInput {
  customerId: string;
  customerName: string;
  totalDebt: number;
  creditLimit: number;
  paymentHistory: Array<{
    date: string;
    amount: number;
    daysLate?: number;
  }>;
}

export interface DebtRiskPredictionOutput {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  factors: string[];
  recommendations: string[];
  predictedPaymentDate?: string;
  riskAssessment?: string;
  riskFactors?: string[];
}

// Alias for backward compatibility
export type PredictDebtRiskOutput = DebtRiskPredictionOutput;

// Placeholder function - would be replaced with actual AI implementation
export async function predictDebtRisk(
  _input: DebtRiskPredictionInput
): Promise<DebtRiskPredictionOutput> {
  return {
    riskLevel: 'low',
    riskScore: 0.2,
    factors: [],
    recommendations: [],
  };
}
