'use server';
/**
 * @fileOverview A sales forecasting AI agent.
 *
 * - forecastSales - A function that handles the sales forecasting process.
 * - ForecastSalesInput - The input type for the forecastSales function.
 * - ForecastSalesOutput - The return type for the forecastSales function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ForecastSalesInputSchema = z.object({
  historicalSalesData: z
    .string()
    .describe(
      'A JSON string representing an array of historical sales transactions. Each transaction includes product details, quantity sold, and transaction date.'
    ),
  currentInventoryLevels: z
    .string()
    .describe(
      'A JSON string representing an array of current inventory levels for each product, including quantity in stock.'
    ),
  forecastPeriodDays: z
    .number()
    .describe('The number of days into the future to forecast sales for.'),
  marketContext: z
    .string()
    .optional()
    .describe(
      'Additional context about the market, promotions, or external factors (e.g., "Upcoming promotion for product A", "Heavy rain expected next week affecting crop B", "Pest outbreak reported in the region").'
    ),
});
export type ForecastSalesInput = z.infer<typeof ForecastSalesInputSchema>;

const ForecastedProductSchema = z.object({
    productId: z.string().describe('The unique identifier for the product.'),
    productName: z.string().describe('The name of the product.'),
    currentStock: z.number().describe('The current stock level of the product.'),
    forecastedSales: z.number().describe('The total forecasted sales quantity for the upcoming period.'),
    suggestion: z.string().describe('A suggestion, like "OK" or "Re-order".'),
    suggestedReorderQuantity: z.number().describe('The suggested quantity to re-order. 0 if no re-order is needed.'),
});

const ForecastSalesOutputSchema = z.object({
    analysisSummary: z.string().describe('A brief, high-level summary of the sales trends and overall forecast.'),
    forecastedProducts: z.array(ForecastedProductSchema).describe('An array of products with their individual sales forecasts and re-order suggestions.'),
});
export type ForecastSalesOutput = z.infer<typeof ForecastSalesOutputSchema>;


export async function forecastSales(
  input: ForecastSalesInput
): Promise<ForecastSalesOutput> {
  return forecastSalesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'forecastSalesPrompt',
  input: {schema: ForecastSalesInputSchema},
  output: {schema: ForecastSalesOutputSchema},
  prompt: `You are a data scientist for a retail company. Your task is to analyze historical sales data, current inventory levels, and market context to forecast future sales and provide re-ordering recommendations.

  **IMPORTANT: All output text must be in Vietnamese.**

  **Analyze the following data:**
  1.  **Historical Sales Data:** A JSON array of past sales transactions. Analyze this data to identify trends, seasonality, and sales velocity for each product.
      \`\`\`json
      {{{historicalSalesData}}}
      \`\`\`

  2.  **Current Inventory Levels:** A JSON array of current stock for each product.
      \`\`\`json
      {{{currentInventoryLevels}}}
      \`\`\`
  
  3.  **Market Context (Crucial):** Additional information about upcoming events, weather, or market conditions. You must heavily weigh this context in your forecast, as it can override historical trends.
      \`\`\`text
      {{{marketContext}}}
      \`\`\`

  **Your Task:**
  1.  **Forecast Sales:** Predict the sales for each product for the next {{{forecastPeriodDays}}} days. Use time-series analysis principles, but adjust heavily based on the provided 'Market Context'. For example, if a promotion is mentioned for a product, its forecast should increase significantly, even if historical sales are low.
  2.  **Provide Re-order Suggestions:** For each product, compare the forecasted sales with the current stock.
      - If forecasted sales exceed current stock, set 'suggestion' to "Cần nhập" and calculate a 'suggestedReorderQuantity'. The re-order quantity should be enough to cover the forecasted deficit plus a safety buffer (e.g., 20% of the forecasted sales).
      - If stock is sufficient, set 'suggestion' to "Ổn định" and 'suggestedReorderQuantity' to 0.
  3.  **Summarize Findings:** Provide a brief 'analysisSummary' that reflects the market context. For example: "Dự báo doanh số tăng mạnh cho sản phẩm X do có chương trình khuyến mãi sắp tới. Cần chú ý nhập hàng để đáp ứng nhu cầu."

  **Output Format:**
  Return a JSON object that strictly adheres to the 'ForecastSalesOutputSchema'.
  The 'forecastedProducts' array should contain an object for every product present in the current inventory data.
  `,
});

const forecastSalesFlow = ai.defineFlow(
  {
    name: 'forecastSalesFlow',
    inputSchema: ForecastSalesInputSchema,
    outputSchema: ForecastSalesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
