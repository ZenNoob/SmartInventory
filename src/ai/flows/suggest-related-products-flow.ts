'use server';
/**
 * @fileOverview An AI agent for suggesting related products for cross-selling.
 *
 * - suggestRelatedProducts - A function that handles the suggestion process.
 * - SuggestRelatedProductsInput - The input type for the function.
 * - SuggestRelatedProductsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRelatedProductsInputSchema = z.object({
  salesHistory: z
    .string()
    .describe(
      'A JSON string of all historical sales transactions, with each transaction containing a list of product IDs.'
    ),
  currentCartProductIds: z
    .array(z.string())
    .describe('An array of product IDs currently in the shopping cart.'),
  allProducts: z.string().describe('A JSON string of all available products, with their IDs and names.'),
});
export type SuggestRelatedProductsInput = z.infer<
  typeof SuggestRelatedProductsInputSchema
>;

const SuggestedProductSchema = z.object({
  productId: z.string().describe('The ID of the suggested product.'),
  productName: z.string().describe('The name of the suggested product.'),
  reason: z
    .string()
    .describe(
      'A short, compelling reason for the suggestion, e.g., "Thường được mua cùng Phân bón A".'
    ),
});

const SuggestRelatedProductsOutputSchema = z.object({
  suggestions: z
    .array(SuggestedProductSchema)
    .describe(
      'An array of up to 3 related products to suggest to the customer.'
    ),
});
export type SuggestRelatedProductsOutput = z.infer<
  typeof SuggestRelatedProductsOutputSchema
>;

export async function suggestRelatedProducts(
  input: SuggestRelatedProductsInput
): Promise<SuggestRelatedProductsOutput> {
  return suggestRelatedProductsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRelatedProductsPrompt',
  input: {schema: SuggestRelatedProductsInputSchema},
  output: {schema: SuggestRelatedProductsOutputSchema},
  prompt: `You are an intelligent sales assistant for an agricultural supply store. Your goal is to increase the average order value by suggesting relevant products (cross-selling).

  **IMPORTANT: All output text must be in VIETNAMESE.**

  **Analyze the following data:**
  1.  **Full Sales History:** A JSON array of all past transactions. This is your primary source for finding product relationships.
      \`\`\`json
      {{{salesHistory}}}
      \`\`\`

  2.  **All Available Products:** A mapping of product IDs to their names.
       \`\`\`json
      {{{allProducts}}}
      \`\`\`

  3.  **Current Shopping Cart:** A list of product IDs the customer has already decided to buy.
      \`\`\`json
      {{{currentCartProductIds}}}
      \`\`\`

  **Your Task:**
  1.  **Analyze Associations:** Based on the **Full Sales History**, identify which products are most frequently purchased together with the items in the **Current Shopping Cart**.
  2.  **Generate Suggestions:**
      *   Identify up to 3 unique products that are highly relevant but are **NOT** already in the current cart.
      *   For each suggestion, provide a concise and persuasive 'reason'. The reason should be based on the data (e.g., "Thường được mua cùng [Tên sản phẩm trong giỏ hàng]").
      *   Do not suggest products that are already in the cart.
      *   Prioritize strong, frequent associations.

  **Output Format:**
  Return a JSON object that strictly adheres to the 'SuggestRelatedProductsOutputSchema'. The 'suggestions' array should contain a maximum of 3 items. If no relevant suggestions can be found, return an empty array.
  `,
});

const suggestRelatedProductsFlow = ai.defineFlow(
  {
    name: 'suggestRelatedProductsFlow',
    inputSchema: SuggestRelatedProductsInputSchema,
    outputSchema: SuggestRelatedProductsOutputSchema,
  },
  async input => {
    // If the cart is empty, there's nothing to base suggestions on.
    if (input.currentCartProductIds.length === 0) {
        return { suggestions: [] };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
