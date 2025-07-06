// src/types.ts
export interface TransferParams {
  tokenAddress: string;
  amount: number;
  destinationAccount: string;
}

export interface TransferResult {
  success: boolean;
  txHash?: string;
  messageId?: string;
  error?: string;
}

export interface ToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}
