// AI Flow stub for related products suggestion
export interface SuggestRelatedProductsInput {
  productIds: string[];
  customerId?: string;
  salesHistory?: string; // JSON string
}

export interface RelatedProduct {
  productId: string;
  productName: string;
  relevanceScore: number;
  reason: string;
}

export interface SuggestRelatedProductsOutput {
  suggestions: RelatedProduct[];
  basedOn: string;
}

// Placeholder function - would be replaced with actual AI implementation
export async function suggestRelatedProducts(
  _input: SuggestRelatedProductsInput
): Promise<SuggestRelatedProductsOutput> {
  return {
    suggestions: [],
    basedOn: 'purchase_history',
  };
}
