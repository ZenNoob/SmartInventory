'use server';
/**
 * @fileOverview An AI agent for market basket analysis.
 *
 * - analyzeMarketBasket - A function that handles the analysis process.
 * - MarketBasketAnalysisInput - The input type for the function.
 * - MarketBasketAnalysisOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MarketBasketAnalysisInputSchema = z.object({
  salesTransactions: z
    .string()
    .describe(
      'A JSON string representing an array of sales transactions. Each transaction must contain an array of products sold in that transaction.'
    ),
});
export type MarketBasketAnalysisInput = z.infer<
  typeof MarketBasketAnalysisInputSchema
>;

const ProductPairSchema = z.object({
  productA_name: z.string().describe('The name of the first product in the pair.'),
  productB_name: z.string().describe('The name of the second product in the pair.'),
  frequency: z
    .number()
    .describe('The number of times these two products were bought together.'),
  suggestion: z
    .string()
    .describe(
      'A concrete, actionable marketing or sales suggestion for this pair. For example: "Tạo combo giảm giá 10% khi mua cùng lúc" or "Gợi ý bán kèm sản phẩm B khi khách hàng thêm sản phẩm A vào giỏ hàng".'
    ),
});

const ProductClusterSchema = z.object({
  products: z
    .array(z.string())
    .describe('An array of product names that are frequently bought together (3 or more products).'),
  frequency: z
    .number()
    .describe('The number of times this cluster of products was bought together.'),
  suggestion: z
    .string()
    .describe(
      'A concrete marketing suggestion for this cluster. For example: "Tạo gói sản phẩm "Chăm sóc toàn diện" và bán với giá ưu đãi".'
    ),
});


const MarketBasketAnalysisOutputSchema = z.object({
  analysisSummary: z
    .string()
    .describe(
      'A high-level summary of the findings. For example: "Phân tích cho thấy có mối liên hệ mạnh mẽ giữa các sản phẩm phân bón và giống lúa, đề xuất tiềm năng cho các chiến dịch bán chéo."'
    ),
  productPairs: z
    .array(ProductPairSchema)
    .describe('An array of product pairs that are frequently bought together.'),
  productClusters: z
    .array(ProductClusterSchema)
    .describe('An array of product clusters (3 or more items) that are frequently bought together.'),
});
export type MarketBasketAnalysisOutput = z.infer<
  typeof MarketBasketAnalysisOutputSchema
>;

export async function analyzeMarketBasket(
  input: MarketBasketAnalysisInput
): Promise<MarketBasketAnalysisOutput> {
  return analyzeMarketBasketFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeMarketBasketPrompt',
  input: {schema: MarketBasketAnalysisInputSchema},
  output: {schema: MarketBasketAnalysisOutputSchema},
  prompt: `You are a professional data analyst specializing in Market Basket Analysis for a retail business. Your task is to analyze sales transaction data to identify which products are frequently purchased together.

  **IMPORTANT: All output text must be in VIETNAMESE.**

  **Analyze the following data:**
  A JSON array of sales transactions. Each transaction contains a list of products.
  \`\`\`json
  {{{salesTransactions}}}
  \`\`\`

  **Your Task:**
  1.  **Identify Frequent Itemsets:** Analyze the data to find sets of products that are commonly purchased together.
  2.  **Extract Pairs:** Identify the most frequent pairs of products (2 items). For each pair, provide the 'frequency' (how many times they appeared together) and a concrete 'suggestion' for a marketing or sales action.
  3.  **Extract Clusters:** Identify interesting clusters of 3 or more products that are bought together. For each cluster, provide the 'frequency' and a concrete 'suggestion'.
  4.  **Summarize Findings:** Provide a brief, high-level 'analysisSummary' of your findings, highlighting the most significant relationships you discovered.

  **Output Format:**
  Return a JSON object that strictly adheres to the 'MarketBasketAnalysisOutputSchema'. Focus on the most frequent and interesting combinations. Do not include pairs or clusters with a very low frequency (e.g., only occurred once).
  `,
});

const analyzeMarketBasketFlow = ai.defineFlow(
  {
    name: 'analyzeMarketBasketFlow',
    inputSchema: MarketBasketAnalysisInputSchema,
    outputSchema: MarketBasketAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
