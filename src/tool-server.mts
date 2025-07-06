// src/mcp-server.mts
import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import dotenv from 'dotenv';
import * as CCIP from '@chainlink/ccip-js';
import { createPublicClient, createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Minimal ERC-20 ABI to fetch balance
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function'
  }
];

async function start() {
  // 1. Set up Express
  const app = express();
  app.use(express.json());

  // 2. Create the MCP server and register the tool
  const server = new McpServer({ name: "hello-server", version: "1.0.0" });
  server.registerTool(
    "helloWorld",
    {
      title: "Hello World",
      description: "Returns a simple greeting",
      inputSchema: {},
    },
    async () => ({ content: [{ type: "text", text: "Hello, world!" }] })
  );

  // Register the getCurrentTime tool
  server.registerTool(
    "getCurrentTime",
    {
      title: "Get Current Time",
      description: "Returns the current time in ISO format",
      inputSchema: {},
    },
    async () => ({ content: [{ type: "text", text: new Date().toISOString() }] })
  );

  // Regiser the token movement tool
  server.registerTool(
    "moveToken",
    {
      title: "Move Token",
      description: "Moves a token from Sepolia to a Arbitrum Sepolia",
      inputSchema: {
        tokenAddress: z.string(),
        amount: z.number(),
        destinationAccount: z.string(),
      },
    },
    async (input) => {      
      let response = "a";

      dotenv.config();

      const {
          RPC_URL,
          PRIVATE_KEY,
          ROUTER_ADDRESS,
          DESTINATION_CHAIN_SELECTOR
      } = process.env;

      const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
      
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(RPC_URL)
      });
      const walletClient = createWalletClient({
        chain: sepolia,
        transport: http(RPC_URL),
        account
      });

      const router = ROUTER_ADDRESS as `0x${string}`;
      const token = input.tokenAddress as `0x${string}`;
      const destination = input.destinationAccount as `0x${string}`;
      const chainSelector = DESTINATION_CHAIN_SELECTOR as string;
      const amount = BigInt(input.amount);

      // 0) Check token balance
      console.log('🔍 Checking token balance...');
      const balance = await publicClient.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [account.address]
      }) as bigint;
      console.log(`🔍 Token balance for ${account.address}: ${balance.toString()}`);
      if (balance < amount) {
        response = `❌ Insufficient token balance: you have ${balance}, but need ${amount}`;
      }
      else {
        // 1) Approve Router to move your tokens
        console.log('✅ Approving router...');
        const ccip = CCIP.createClient();
        await ccip.approveRouter({
          client: walletClient,
          routerAddress: router,
          tokenAddress: token,
          amount,
          waitForReceipt: true
        });
        console.log('✅ Router approved.');

        // 2) Send the cross-chain transfer
        console.log('🚀 Sending transfer...');
        const { txHash, messageId } = await ccip.transferTokens({
          client: walletClient,
          routerAddress: router,
          tokenAddress: token,
          amount,
          destinationAccount: destination,
          destinationChainSelector: chainSelector
        });
        console.log('🚀 Transfer sent. txHash:', txHash);
        console.log('📨 Message ID:', messageId);

        response = `Moved ${input.amount} tokens from ${input.tokenAddress} to ${input.destinationAccount} on Arbitrum Sepolia with txHash ${txHash} and message ID ${messageId}.`;
        
      }

      return {
        content: [
          {
            type: "text",
            text: response,
          },
        ],
      };
    }
  );

  // 3. Transport map per session
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  // 4. HTTP endpoint for MCP (POST /rpc)
  app.post("/rpc", async (req: Request, res: Response) => {
    // Extract or assign sessionId
    let sessionId = req.headers["mcp-session-id"] as string;
    if (!sessionId) sessionId = "default";

    // Create transport if it doesn't exist
    if (!transports[sessionId]) {
      transports[sessionId] = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => sessionId,
        // optional: enable DNS rebinding protection if desired
        enableDnsRebindingProtection: false,
      });
      await server.connect(transports[sessionId]);
    }

    // Delegate the request to the transport
    await transports[sessionId].handleRequest(req, res, req.body);
  });

  // 5. Start the HTTP server
  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`🔹 MCP HTTP server listening at http://localhost:${PORT}/rpc`);
  });
}

start().catch((err) => {
  console.error("Error starting MCP server:", err);
  process.exit(1);
});
