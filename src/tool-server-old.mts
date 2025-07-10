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
  const server = new McpServer({ name: "tool-server", version: "1.0.0" });
  
  console.log("🔧 Registering tools...");
  
  server.registerTool(
    "helloWorld",
    {
      title: "Hello World",
      description: "Returns a simple greeting",
      inputSchema: {},
    },
    async () => {
      console.log("📞 helloWorld tool called");
      return { content: [{ type: "text", text: "Hello, world!!" }] };
    }
  );
  console.log("✅ Registered helloWorld tool");

  // Register the getCurrentTime tool
  server.registerTool(
    "getCurrentTime",
    {
      title: "Get Current Time",
      description: "Returns the current time in ISO format",
      inputSchema: {},
    },
    async () => {
      console.log("📞 getCurrentTime tool called");
      return { content: [{ type: "text", text: new Date().toISOString() }] };
    }
  );
  console.log("✅ Registered getCurrentTime tool");

  // Register the token movement tool
  server.registerTool(
    "moveToken",
    {
      title: "Move Token",
      description: "Moves a token from Sepolia to a Arbitrum Sepolia",
      inputSchema: {
        tokenAddress: z.string().describe("The address of the token to move in the origin chain"),
        amount: z.number().describe("The amount of tokens to move, you should have enough balance"),
        destinationAccount: z.string().describe("The address of the destination account"),
      },
    },
    async (input) => {      

      console.log("🔹 moveToken tool called with input:", input);

      let response = "";

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

  // 3. Transport map per session - each session gets its own server instance
  const sessions: Record<string, { transport: StreamableHTTPServerTransport; server: McpServer }> = {};

  // 4. HTTP endpoint for MCP (POST /rpc)
  app.post("/rpc", async (req: Request, res: Response) => {
    console.log("📨 Received RPC request");
    
    // Extract or assign sessionId
    let sessionId = req.headers["mcp-session-id"] as string;
    if (!sessionId) sessionId = "default";

    console.log(`🔗 Session ID: ${sessionId}`);

    // Create session if it doesn't exist
    if (!sessions[sessionId]) {
      console.log(`🆕 Creating new session: ${sessionId}`);
      
      // Create a new server instance for this session
      const sessionServer = new McpServer({ name: "tool-server", version: "1.0.0" });
      
      // Register all tools for this session
      sessionServer.registerTool(
        "helloWorld",
        {
          title: "Hello World",
          description: "Returns a simple greeting",
          inputSchema: {},
        },
        async () => {
          console.log("📞 helloWorld tool called");
          return { content: [{ type: "text", text: "Hello, world!!" }] };
        }
      );
      
      sessionServer.registerTool(
        "getCurrentTime",
        {
          title: "Get Current Time",
          description: "Returns the current time in ISO format",
          inputSchema: {},
        },
        async () => {
          console.log("📞 getCurrentTime tool called");
          return { content: [{ type: "text", text: new Date().toISOString() }] };
        }
      );
      
      // Register moveToken tool (keeping existing implementation)
      sessionServer.registerTool(
        "moveToken",
        {
          title: "Move Token",
          description: "Moves a token from Sepolia to a Arbitrum Sepolia",
          inputSchema: {
            tokenAddress: z.string().describe("The address of the token to move in the origin chain"),
            amount: z.number().describe("The amount of tokens to move, you should have enough balance"),
            destinationAccount: z.string().describe("The address of the destination account"),
          },
        },
        async (input) => {      
          console.log("🔹 moveToken tool called with input:", input);
          let response = "";
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
      
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => sessionId,
        enableDnsRebindingProtection: false,
      });
      
      await sessionServer.connect(transport);
      
      sessions[sessionId] = { transport, server: sessionServer };
      console.log(`✅ Created and connected session: ${sessionId}`);
    }

    // Delegate the request to the session's transport
    console.log(`🔄 Handling request for session: ${sessionId}`);
    await sessions[sessionId].transport.handleRequest(req, res, req.body);
  });

  // 5. Start the HTTP server
  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`🔹 MCP HTTP server listening at http://localhost:${PORT}/rpc`);
    console.log("🔧 Registered tools:", ["helloWorld", "getCurrentTime", "moveToken"]);
  });
}

start().catch((err) => {
  console.error("Error starting MCP server:", err);
  process.exit(1);
});
