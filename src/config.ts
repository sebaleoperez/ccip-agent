// src/config.ts
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  rpcUrl: process.env.RPC_URL,
  privateKey: process.env.PRIVATE_KEY,
  routerAddress: process.env.ROUTER_ADDRESS,
  tokenAddress: process.env.TOKEN_ADDRESS,
  destinationChainSelector: process.env.DESTINATION_CHAIN_SELECTOR,
  destinationAccount: process.env.DESTINATION_ACCOUNT,
  amount: process.env.AMOUNT ? parseInt(process.env.AMOUNT) : 1,
  llamaApiUrl: process.env.LLAMA_API_URL ?? 'http://localhost:11434/api/generate',
  llamaApiKey: process.env.LLAMA_API_KEY,
  mcpServerPort: process.env.MCP_SERVER_PORT ? parseInt(process.env.MCP_SERVER_PORT) : 3001,
} as const;

export function validateConfig(): void {
  const required = ['rpcUrl', 'privateKey', 'routerAddress', 'destinationChainSelector'];
  const missing = required.filter(key => !config[key as keyof typeof config]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
