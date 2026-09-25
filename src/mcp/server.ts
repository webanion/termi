#!/usr/bin/env node
// MCP server for Termi's saved commands. It speaks JSON-RPC over stdio, one message per line,
// and reads and writes the same settings.json as the app. A running Termi watches that file,
// so changes show in the sidebar right away.
//
// Build it with `npm run build`, then run it with plain Node: `node out/main/mcpServer.js`.
// It has no runtime dependencies.

import { version } from '../../package.json';
import { serveStdio, type Reply, type Request } from './jsonRpc';
import { ToolError, TOOLS, type ToolArgs } from './tools';
import { docsText, DOCS_URI, RESOURCES } from './docs';

const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

const INSTRUCTIONS =
  'Termi is the user\'s own terminal app. "Saved commands" are entries in its sidebar that open a tab ' +
  'with 1 to 4 terminals. When the user mentions Termi, or asks to list, add, change, rename, or set up ' +
  'a saved command, use these tools. Call list_saved_commands first when you need an id or want to check ' +
  'what exists. A running Termi picks up changes right away. If you are not sure how something works, ' +
  `call get_termi_docs or read the ${DOCS_URI} resource.`;

function callTool(params: Request['params']): Reply {
  const tool = TOOLS.find((t) => t.name === params?.name);
  if (!tool) return { error: { code: -32602, message: `Unknown tool: ${params?.name}` } };
  try {
    const result = tool.run((params?.arguments as ToolArgs) || {});
    if (typeof result === 'string')
      return { result: { content: [{ type: 'text', text: result }] } };
    return {
      result: {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      },
    };
  } catch (error) {
    const text =
      error instanceof ToolError
        ? error.message
        : `Termi could not do that: ${(error as Error).message}`;
    return { result: { content: [{ type: 'text', text }], isError: true } };
  }
}

function readResource(params: Request['params']): Reply {
  const resource = RESOURCES.find((r) => r.uri === params?.uri);
  if (!resource) return { error: { code: -32002, message: `Resource not found: ${params?.uri}` } };
  try {
    return {
      result: {
        contents: [{ uri: resource.uri, mimeType: resource.mimeType, text: docsText(TOOLS) }],
      },
    };
  } catch (error) {
    return {
      error: { code: -32603, message: `Could not read the docs: ${(error as Error).message}` },
    };
  }
}

function handle(request: Request): Reply {
  switch (request.method) {
    case 'initialize': {
      const asked = request.params?.protocolVersion;
      return {
        result: {
          protocolVersion:
            typeof asked === 'string' && PROTOCOL_VERSIONS.includes(asked)
              ? asked
              : PROTOCOL_VERSIONS[0],
          capabilities: { tools: {}, resources: {} },
          serverInfo: { name: 'termi', title: 'Termi', version },
          instructions: INSTRUCTIONS,
        },
      };
    }
    case 'ping':
      return { result: {} };
    case 'tools/list':
      return { result: { tools: TOOLS.map(({ run, ...tool }) => tool) } };
    case 'tools/call':
      return callTool(request.params);
    case 'resources/list':
      return { result: { resources: RESOURCES } };
    case 'resources/templates/list':
      return { result: { resourceTemplates: [] } };
    case 'resources/read':
      return readResource(request.params);
    default:
      return { error: { code: -32601, message: `Method not found: ${request.method}` } };
  }
}

serveStdio(handle);
