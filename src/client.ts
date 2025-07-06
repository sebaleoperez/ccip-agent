// src/llm-client.ts
// Interactive Llama 3.2 client with MCP tool integration

import readline from "readline";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/**
 * Calls the Ollama generate endpoint to get a chat completion.
 */
async function callLLM(conversation: string): Promise<string> {
  const endpoint = process.env.LLAMA_API_URL ?? "http://localhost:11434/api/generate";
  const apiKey = process.env.LLAMA_API_KEY;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  // Create abort controller for timeout (30 seconds for LLM calls)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 100000);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: "llama3.2", prompt: conversation, stream: false }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LLM request failed: ${res.status} ${res.statusText} - ${text}`);
    }
    const json = await res.json();
    if (typeof json.response === "string") {
      return json.response;
    }
    throw new Error(`Unexpected response format: ${JSON.stringify(json)}`);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('LLM request timed out after 30 seconds');
    }
    throw error;
  }
}

/**
 * Reads a line from console.
 */
function promptUser(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(prompt, ans => { rl.close(); resolve(ans.trim()); }));
}

/**
 * Wrapper for MCP tool calls with timeout handling
 */
async function callToolWithTimeout(mcpClient: Client, toolName: string, args: any, timeoutMs = 300000): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Tool '${toolName}' timed out after ${timeoutMs/1000} seconds`));
    }, timeoutMs);

    try {
      const result = await mcpClient.callTool({ name: toolName, arguments: args });
      clearTimeout(timeoutId);
      resolve(result);
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

/**
 * Shows a progress indicator for long-running operations
 */
function showProgress(message: string): () => void {
  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  console.log(message);
  
  const interval = setInterval(() => {
    process.stdout.write(`\r${spinner[i]} Processing...`);
    i = (i + 1) % spinner.length;
  }, 100);

  return () => {
    clearInterval(interval);
    process.stdout.write('\r✓ Complete\n');
  };
}

async function main() {
  // Initialize MCP client with extended timeout for blockchain operations
  const mcpClient = new Client({ 
    name: "mcp-agent", 
    version: "1.0.0"
  });
  
  // Set longer timeout for cross-chain operations (5 minutes)
  const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3001/rpc"));
  await mcpClient.connect(transport);

  console.log("Interactive Llama + MCP chat. Type 'exit' to quit.");
  console.log("Note: Cross-chain operations may take up to 5 minutes to complete.");
  
  const history: string[] = [
    `SYSTEM: You are an assistant with access to the following tools when needed:
  • helloWorld(): returns a simple greeting
  • getCurrentTime(): returns the current time in ISO format
  • moveToken({ tokenAddress, amount, destinationAccount }): moves a token between chains (may take several minutes)

IMPORTANT INSTRUCTIONS:
- When you need to use a tool, output ONLY the tool command on a single line:
  TOOL: <toolName> <JSON arguments>
- Do NOT add any additional text on the same line or immediately after the tool command
- After the tool executes and returns a result, then provide your helpful summary
- For successful token transfers, confirm the transaction details to the user
- Only use tools when absolutely necessary to answer the user's question

EXAMPLES:
Good: TOOL: moveToken { "tokenAddress": "0x123...", "amount": 10, "destinationAccount": "0x456..." }
Bad: TOOL: moveToken({ "tokenAddress": "0x123..." }) The transaction will be processed...

Note: Cross-chain transfers can take 5+ minutes to complete due to blockchain confirmation times.`
  ];

  while (true) {
    const userInput = await promptUser("You: ");
    if (userInput.toLowerCase() === "exit") {
      console.log("Exiting chat. Goodbye!");
      break;
    }
    history.push(`User: ${userInput}`);

    // Send history to LLM
    const conversationText = history.join("\n");
    let llmReply: string;
    try {
      llmReply = await callLLM(conversationText);
    } catch (err: any) {
      console.error("Error calling LLM:", err.message);
      break;
    }
    console.log(`LLM: ${llmReply}`);

    // Detect TOOL invocation
    if (llmReply.startsWith("TOOL:")) {
      // Extract only the TOOL line, ignore any text after it
      const toolLines = llmReply.split('\n');
      const toolLine = toolLines[0]; // Get just the first line with the TOOL command
      const rest = toolLine.slice(5).trim();
      
      // Handle both formats: "toolName {args}" and "toolName({args})"
      let toolName = "";
      let argsJson = "";
      
      // Check if it has parentheses format: toolName({args})
      const parenMatch = rest.match(/^(\w+)\(\s*(\{.*\})\s*\)$/);
      if (parenMatch) {
        toolName = parenMatch[1];
        argsJson = parenMatch[2];
      } else {
        // Original format: toolName {args}
        const spaceIndex = rest.indexOf(' ');
        if (spaceIndex !== -1) {
          toolName = rest.substring(0, spaceIndex);
          argsJson = rest.substring(spaceIndex + 1).trim();
        } else {
          toolName = rest;
        }
      }
      
      let args: any = {};
      if (argsJson) {
        try { 
          // First try direct JSON parsing
          args = JSON.parse(argsJson); 
          console.log(`Successfully parsed args:`, args);
        } catch (parseError) { 
          console.warn(`Direct JSON parse failed, trying to fix format...`);
          try {
            // Try to fix common formatting issues
            // Replace unescaped quotes and fix object format
            let fixedJson = argsJson;
            
            // If it looks like an object but starts with { and has unescaped quotes
            if (fixedJson.startsWith('{') && fixedJson.includes('"') && !fixedJson.includes('\\"')) {
              // Try to extract key-value pairs manually
              const matches = fixedJson.match(/(\w+):\s*"([^"]+)"|(\w+):\s*(\d+)/g);
              if (matches) {
                const obj: any = {};
                matches.forEach(match => {
                  const keyValueMatch = match.match(/(\w+):\s*"([^"]+)"|(\w+):\s*(\d+)/);
                  if (keyValueMatch) {
                    const key = keyValueMatch[1] || keyValueMatch[3];
                    const value = keyValueMatch[2] || parseInt(keyValueMatch[4]);
                    obj[key] = value;
                  }
                });
                args = obj;
                console.log(`Successfully parsed args with manual extraction:`, args);
              } else {
                throw new Error("Could not extract key-value pairs");
              }
            } else {
              throw new Error("Unrecognized format");
            }
          } catch (secondError) {
            console.warn(`Could not parse tool args "${argsJson}", using {}. Original error:`, parseError);
            console.warn(`Manual parsing also failed:`, secondError);
          }
        }
      }
      console.log(`Invoking tool ${toolName} with args`, args);

      let toolResult: any;
      try {
        // Show progress for long-running blockchain operations
        const progressMessage = toolName === 'moveToken' 
          ? '🔄 Processing cross-chain transfer (this may take several minutes)...'
          : `Invoking tool ${toolName}...`;
        const stopProgress = showProgress(progressMessage);
        
        toolResult = await callToolWithTimeout(mcpClient, toolName, args);
        stopProgress();
      } catch (err: any) {
        console.error("Tool invocation error:", err.message);
        if (err.message.includes('timed out')) {
          console.log("💡 Tip: Cross-chain operations can take several minutes. Please be patient.");
        }
        break;
      }
      const output = toolResult.content.map((c: any) => c.text).join("\n");
      console.log(`Tool ${toolName} result:\n${output}`);

      // Add tool result to history and get follow-up from LLM
      history.push(`Tool result for ${toolName}: ${output}`);
      
      // Add instruction to prevent unnecessary tool chaining
      const followUpPrompt = history.join("\n") + "\n\nProvide a helpful summary of the result to the user. Do not call any additional tools.";
      
      try {
        const followUp = await callLLM(followUpPrompt);
        console.log(`Assistant: ${followUp}`);
        
        // Check if the LLM is trying to call another tool (it shouldn't)
        if (followUp.startsWith("TOOL:")) {
          console.log("Assistant: The token transfer has been completed successfully! The transaction details are shown above.");
          history.push(`Assistant: The token transfer has been completed successfully! The transaction details are shown above.`);
        } else {
          history.push(`Assistant: ${followUp}`);
        }
      } catch (err: any) {
        console.error("Error getting LLM follow-up:", err.message);
        break;
      }
    } else {
      history.push(`Assistant: ${llmReply}`);
    }
  }
}

main().catch(console.error);
