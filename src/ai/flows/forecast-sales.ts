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
  prompt: `You are a data scientist for a retail company. Your task is to analyze historical sales data and current inventory levels to forecast future sales and provide re-ordering recommendations.

  **Analyze the following data:**
  1.  **Historical Sales Data:** A JSON array of past sales transactions. Analyze this data to identify trends, seasonality, and sales velocity for each product.
      \`\`\`json
      {{{historicalSalesData}}}
      \`\`\`

  2.  **Current Inventory Levels:** A JSON array of current stock for each product.
      \`\`\`json
      {{{currentInventoryLevels}}}
      \`\`\`

  **Your Task:**
  1.  **Forecast Sales:** Predict the sales for each product for the next {{{forecastPeriodDays}}} days. Use time-series analysis principles. Consider recent sales velocity more heavily.
  2.  **Provide Re-order Suggestions:** For each product, compare the forecasted sales with the current stock.
      - If forecasted sales exceed current stock, set 'suggestion' to "Re-order" and calculate a 'suggestedReorderQuantity'. The re-order quantity should be enough to cover the forecasted deficit plus a safety buffer (e.g., 20% of the forecasted sales).
      - If stock is sufficient, set 'suggestion' to "OK" and 'suggestedReorderQuantity' to 0.
  3.  **Summarize Findings:** Provide a brief 'analysisSummary' of the overall sales trends you observed (e.g., "Overall sales are trending up, with strong performance in product X, but product Y is slowing down.").

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
