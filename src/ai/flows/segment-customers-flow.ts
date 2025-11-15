'use server';
/**
 * @fileOverview A customer segmentation AI agent.
 *
 * - segmentCustomers - A function that handles the customer segmentation process.
 * - SegmentCustomersInput - The input type for the segmentCustomers function.
 * - SegmentCustomersOutput - The return type for the segmentCustomers function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SegmentCustomersInputSchema = z.object({
  customers: z.string().describe('A JSON string of all customer data.'),
  sales: z.string().describe('A JSON string of all sales transaction data.'),
  payments: z.string().describe('A JSON string of all payment data.'),
});
export type SegmentCustomersInput = z.infer<typeof SegmentCustomersInputSchema>;

const CustomerSegmentSchema = z.object({
    customerId: z.string().describe('The unique identifier for the customer.'),
    customerName: z.string().describe('The name of the customer.'),
    segment: z.enum(['VIP', 'Trung thành', 'Tiềm năng', 'Nguy cơ rời bỏ', 'Mới', 'Không hoạt động']).describe('The segment the customer belongs to.'),
    reason: z.string().describe('A brief explanation for why the customer was placed in this segment.'),
    suggestedAction: z.string().describe('A concrete, actionable suggestion for this customer (e.g., "Gửi voucher giảm giá độc quyền", "Chủ động gọi điện hỏi thăm và nhắc nợ nhẹ nhàng").'),
});

const SegmentCustomersOutputSchema = z.object({
    analysisSummary: z.string().describe('A high-level summary of the customer base segmentation.'),
    segments: z.array(CustomerSegmentSchema).describe('An array of all customers with their assigned segments.'),
});
export type SegmentCustomersOutput = z.infer<typeof SegmentCustomersOutputSchema>;

export async function segmentCustomers(
  input: SegmentCustomersInput
): Promise<SegmentCustomersOutput> {
  return segmentCustomersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'segmentCustomersPrompt',
  input: {schema: SegmentCustomersInputSchema},
  output: {schema: SegmentCustomersOutputSchema},
  prompt: `You are a professional business analyst specializing in customer segmentation for a retail business. Your task is to analyze customer data based on Recency, Frequency, and Monetary (RFM) principles, along with their debt status.

  **IMPORTANT: All output text must be in VIETNAMESE.**

  **Analyze the following data:**
  1.  **Customers:** \`\`\`json\n{{{customers}}}\n\`\`\`
  2.  **Sales Transactions:** \`\`\`json\n{{{sales}}}\n\`\`\`
  3.  **Payments:** \`\`\`json\n{{{payments}}}\n\`\`\`

  **Your Task:**
  1.  **Calculate Key Metrics for Each Customer:**
      *   **Recency:** How recently they purchased.
      *   **Frequency:** How often they purchase.
      *   **Monetary Value:** How much they spend.
      *   **Debt Status:** Calculate current debt (Total Sales - Total Payments).

  2.  **Segment Each Customer:** Classify each customer into ONE of the following segments based on the metrics. Be thoughtful and consider combinations of factors.
      *   **VIP:** High frequency, high monetary value, recent purchases, and good payment history (low or manageable debt).
      *   **Trung thành (Loyal):** High frequency, consistent purchases over a long period, even if monetary value isn't the highest. Good payment history.
      *   **Tiềm năng (Potential):** Recent customers with high monetary value in a few purchases, or customers who are increasing their purchasing frequency.
      *   **Nguy cơ rời bỏ (At Risk):** Haven't purchased in a long time (low recency), previously had good frequency/monetary value. High debt can also be a risk factor.
      *   **Mới (New):** Made only one or two purchases recently.
      *   **Không hoạt động (Inactive):** Very low recency, frequency, and monetary value.

  3.  **Provide Justification and Suggestions:**
      *   For each customer, provide a concise 'reason' for their segmentation.
      *   Provide a concrete and actionable 'suggestedAction' for each customer. For example, for a VIP, suggest "Gửi voucher giảm giá độc quyền". For an "At Risk" customer, suggest "Chủ động gọi điện hỏi thăm và nhắc nợ nhẹ nhàng".

  4.  **Summarize Findings:** Provide a brief, high-level 'analysisSummary' of the overall customer base (e.g., "Phần lớn khách hàng là khách hàng trung thành, nhưng có một nhóm khách hàng tiềm năng đáng chú ý cần được nuôi dưỡng. Cần có hành động ngay với nhóm có nguy cơ rời bỏ.").

  **Output Format:**
  Return a JSON object that strictly adheres to the 'SegmentCustomersOutputSchema'. Ensure every customer from the input is present in the output 'segments' array.`,
});

const segmentCustomersFlow = ai.defineFlow(
  {
    name: 'segmentCustomersFlow',
    inputSchema: SegmentCustomersInputSchema,
    outputSchema: SegmentCustomersOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
