// AI Flow stub for sales forecasting
export interface ForecastSalesInput {
  productId: string;
  historicalSales: Array<{
    date: string;
    quantity: number;
  }>;
  daysToForecast: number;
}

export interface ForecastedProduct {
  productId: string;
  productName: string;
  currentStock: number;
  forecastedDemand: number;
  forecastedSales?: number;
  suggestedReorderQuantity: number;
  daysUntilStockout?: number;
  suggestion?: string;
}

export interface ForecastSalesOutput {
  forecastedProducts: ForecastedProduct[];
  totalForecastedDemand: number;
  confidence: number;
  analysisSummary?: string;
}

// Placeholder function - would be replaced with actual AI implementation
export async function forecastSales(
  _input: ForecastSalesInput
): Promise<ForecastSalesOutput> {
  return {
    forecastedProducts: [],
    totalForecastedDemand: 0,
    confidence: 0.8,
  };
}
