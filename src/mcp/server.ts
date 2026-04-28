import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerMcpTools } from "./catalog.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "substack-cli",
    version: "0.1.0",
  });

  registerMcpTools(server);
  return server;
}

export async function runMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
}
