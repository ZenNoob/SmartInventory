'use server'

import { predictDebtRisk, PredictDebtRiskInput } from '@/ai/flows/predict-debt-risk'
import { predictInventoryShortage, PredictInventoryShortageInput } from '@/ai/flows/predict-inventory-shortage'
import { forecastSales, ForecastSalesInput } from '@/ai/flows/forecast-sales';
import { segmentCustomers, SegmentCustomersInput } from '@/ai/flows/segment-customers-flow';
import { analyzeMarketBasket, MarketBasketAnalysisInput } from '@/ai/flows/analyze-market-basket';

export async function getDebtRiskPrediction(input: PredictDebtRiskInput) {
  try {
    const result = await predictDebtRisk(input);
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to predict debt risk.' };
  }
}

export async function getInventoryShortagePrediction(input: PredictInventoryShortageInput) {
  try {
    const result = await predictInventoryShortage(input);
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to predict inventory shortage.' };
  }
}

export async function getSalesForecast(input: ForecastSalesInput) {
  try {
    const result = await forecastSales(input);
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to forecast sales.' };
  }
}

export async function getCustomerSegments(input: SegmentCustomersInput) {
    try {
        const result = await segmentCustomers(input);
        return { success: true, data: result };
    } catch (error) {
        console.error("Error segmenting customers:", error);
        return { success: false, error: 'Không thể phân khúc khách hàng.' };
    }
}

export async function getMarketBasketAnalysis(input: MarketBasketAnalysisInput) {
    try {
        const result = await analyzeMarketBasket(input);
        return { success: true, data: result };
    } catch (error) {
        console.error("Error analyzing market basket:", error);
        return { success: false, error: 'Không thể phân tích rổ hàng hóa.' };
    }
}
