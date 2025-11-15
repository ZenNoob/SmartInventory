'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/predict-debt-risk.ts';
import '@/ai/flows/predict-inventory-shortage.ts';
import '@/ai/flows/forecast-sales.ts';
import '@/ai/flows/segment-customers-flow.ts';
import '@/ai/flows/analyze-market-basket.ts';
import '@/ai/flows/suggest-related-products-flow.ts';
import '@/ai/flows/suggest-product-info-flow.ts';
