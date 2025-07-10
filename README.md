# CCIP Agent - Blockchain Assistant

A conversational AI agent powered by TypeScript that enables cross-chain token transfers using Chainlink's CCIP (Cross-Chain Interoperability Protocol). The agent provides a natural language interface for blockchain operations through an integrated MCP (Model Context Protocol) server.

## 🌟 Features

- **🤖 Conversational AI Interface** - Natural language interactions with blockchain operations
- **🔗 Cross-chain Token Transfers** - Seamless transfers from Sepolia to Arbitrum Sepolia via Chainlink CCIP
- **⚡ MCP Server Integration** - Tool server compatible with AI assistants and LLM clients
- **📚 Built-in Help System** - User-friendly guidance and documentation
- **🔒 Security-First Design** - Environment-based configuration with security best practices
- **⏱️ Real-time Operations** - Live transaction tracking and status updates
- **🛠️ TypeScript** - Full type safety and modern development experience

## 🎯 What the Agent Can Do

- **Transfer tokens between blockchains** with simple natural language requests
- **Provide current time and date** information
- **Guide users** through blockchain operations step-by-step
- **Check token balances** before attempting transfers
- **Track transactions** with hash and message ID reporting
- **Offer helpful explanations** about blockchain concepts

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A testnet wallet with ETH for gas fees
- Test tokens on Sepolia network
- Access to an LLM endpoint (Ollama/Llama) - optional for chat client

## 🚀 Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd ccip-agent
   npm install
   ```

2. **Environment Configuration:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

   **⚠️ SECURITY WARNING:** Never commit your actual `.env` file with real private keys!

3. **Required Environment Variables:**
   ```env
   RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
   PRIVATE_KEY=0x...your_private_key
   ROUTER_ADDRESS=0x...ccip_router_address
   DESTINATION_CHAIN_SELECTOR=3478487238524512106  # Arbitrum Sepolia
   ```

4. **Start the MCP Server:**
   ```bash
   npm run server
   ```

5. **Start the Chat Client (in another terminal):**
   ```bash
   npm start
   ```

## 💬 How to Use the Agent

Once both server and client are running, you can interact naturally:

### Example Conversations:

**Getting Help:**
```
You: What can you help me with?
Agent: [Shows comprehensive help with all capabilities]
```

**Checking Time:**
```
You: What time is it?
Agent: The current time is 2025-07-10T14:30:00.000Z
```

**Token Transfer:**
```
You: Transfer 10 tokens of 0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05 to the account 0x742d35Cc6634C0532925a3b8D5c9E9A6e3fCa44C
Agent: I'll help you transfer 10 tokens. Let me check your balance first...
[Processes transfer and provides transaction hash]
```

## 🛠️ Available Commands

### Development Scripts
```bash
# Start MCP server
npm run server

# Start chat client
npm start

# Development with auto-reload
npm run dev          # Client with auto-reload
npm run dev:server   # Server with auto-reload

# Code quality
npm run build        # TypeScript compilation
npm run lint         # ESLint checking
npm run format       # Prettier formatting
```

## 🔧 Available Tools & Capabilities

The MCP server provides these tools that can be used by AI assistants:

### 1. **help** 
- **Purpose:** Provides user-friendly guidance and documentation
- **Usage:** Ask "What can you help me with?" or "Show me the help"
- **Returns:** Comprehensive guide with examples and requirements

### 2. **getCurrentTime**
- **Purpose:** Returns current date and time
- **Usage:** Ask "What time is it?" or "What's the current date?"
- **Returns:** ISO formatted timestamp

### 3. **moveToken**
- **Purpose:** Cross-chain token transfer from Sepolia to Arbitrum Sepolia
- **Requirements:**
  - Token contract address on Sepolia (0x...)
  - Amount of tokens to transfer
  - Destination wallet address (0x...)
- **Process:** 
  - Checks balance automatically
  - Approves router if sufficient balance
  - Executes cross-chain transfer
  - Returns transaction hash and message ID
- **Duration:** 5-10 minutes for completion

### 4. **helloWorld**
- **Purpose:** Simple greeting for testing
- **Usage:** Say "Hello" or test the connection
- **Returns:** Friendly greeting message

## 🏗️ Architecture

```
┌─────────────────┐    HTTP/MCP     ┌─────────────────┐
│   AI Assistant  │ ◄─────────────► │   MCP Server    │
│   (Client)      │                 │                 │
└─────────────────┘                 └─────────┬───────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │ Chainlink CCIP  │
                                    │ Sepolia ► Arb   │
                                    └─────────────────┘
```

## 📁 Project Structure

```
ccip-agent/
├── src/
│   ├── client.ts          # Interactive chat client with Llama integration
│   ├── tool-server.mts    # MCP server with session management
│   ├── config.ts          # Configuration utilities
│   └── types.ts           # TypeScript type definitions
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── .env.example           # Environment template
└── README.md              # This file
```

## 🔒 Security Best Practices

1. **🔐 Private Key Management**
   - Never commit private keys to version control
   - Use `.env` files that are gitignored
   - Consider using hardware wallets for production

2. **🧪 Testnet Development**
   - Always test on Sepolia/Arbitrum Sepolia first
   - Use testnet tokens for all development
   - Validate addresses and amounts before mainnet

3. **⚡ Transaction Safety**
   - Balance checks before every transfer
   - Input validation on all parameters
   - Proper error handling and user feedback
   - Transaction monitoring and status updates

4. **🛡️ Environment Security**
   - Use environment variables for all sensitive data
   - Validate RPC endpoints and contract addresses
   - Monitor for unusual activity

## 🚨 Troubleshooting

### Common Issues:

**Server won't start:**
```bash
# Check if port 3001 is available
lsof -i :3001
# Kill existing process if needed
kill -9 <PID>
```

**"Tool not found" error:**
- Ensure server is running first (`npm run server`)
- Check server logs for session creation
- Restart both server and client

**Transaction failures:**
- Verify sufficient ETH for gas fees
- Check token balance before transfer
- Ensure correct contract addresses
- Validate destination address format

**Connection issues:**
- Verify RPC URL is accessible
- Check environment variables
- Ensure network connectivity

## 🔄 Development Workflow

1. **Setup:** Clone repo, install deps, configure `.env`
2. **Server:** Start MCP server (`npm run server`)
3. **Client:** Start chat client (`npm start`) 
4. **Test:** Try basic commands like "help" and "what time is it?"
5. **Token Transfer:** Test with small amounts first
6. **Monitor:** Check transaction status on block explorers

## 🌍 Supported Networks

- **Source:** Ethereum Sepolia Testnet
- **Destination:** Arbitrum Sepolia Testnet
- **Protocol:** Chainlink CCIP

*Note: Easily extensible to other CCIP-supported networks*

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow existing code style (TypeScript + Prettier)
4. Add tests for new functionality
5. Update documentation
6. Submit a pull request

**Guidelines:**
- Follow conventional commit messages
- Maintain type safety
- Add JSDoc comments for public APIs
- Test on testnets before mainnet features

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues:** GitHub Issues for bug reports
- **Discussions:** GitHub Discussions for questions
- **Security:** Email security@yourproject.com for security issues

---

**⚠️ Disclaimer:** This software is provided as-is for educational and development purposes. Always test thoroughly on testnets before using with real funds.
