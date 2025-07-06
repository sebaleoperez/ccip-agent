# CCIP Token Transfer Tool

A TypeScript application that enables cross-chain token transfers using Chainlink's CCIP (Cross-Chain Interoperability Protocol) with an integrated Tool server for LLM interactions.

## Features

- **Cross-chain token transfers** using Chainlink CCIP
- **Tool server** for LLM tool integration
- **Interactive chat client** with Llama integration
- **TypeScript** with strict type checking
- **Environment-based configuration**

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A testnet wallet with some ETH and test tokens
- Access to an LLM endpoint (Ollama/Llama)

## Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

   **⚠️ SECURITY WARNING:** Never commit your actual `.env` file with real private keys!

3. **Required Environment Variables:**
   - `RPC_URL`: Origin chain RPC endpoint
   - `PRIVATE_KEY`: Your wallet private key 
   - `ROUTER_ADDRESS`: CCIP router address
   - `TOKEN_ADDRESS`: Token contract address
   - `DESTINATION_CHAIN_SELECTOR`: Target chain selector
   - `DESTINATION_ACCOUNT`: Destination wallet address

## Usage

### Start the MCP Server
```bash
npm run server
```

### Start the Client
```bash
npm start
```

### Development Mode
```bash
# Watch mode for client
npm run dev

# Watch mode for server
npm run dev:server
```

## Available Tools

The server provides these tools:

1. **helloWorld()** - Simple greeting
2. **getCurrentTime()** - Returns current timestamp
3. **moveToken(tokenAddress, amount, destinationAccount)** - Cross-chain token transfer

## Security Best Practices

1. **Never commit private keys** to version control
2. **Use testnet tokens only** for development
3. **Validate all inputs** before processing transactions
4. **Monitor transaction status** and handle failures gracefully
5. **Use environment variables** for all sensitive configuration

## Development

```bash
# Build the project
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

## Project Structure

```
src/
├── client.ts          # LLM chat client
└── tool-server.mts    # MCP server with CCIP tools
```

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation as needed
4. Never commit sensitive information

## License

MIT
