import readline from 'readline';

// JSON-RPC 2.0 over stdio, one message per line.

export type RequestId = string | number;

export interface Request {
  id?: RequestId | null;
  method?: string;
  params?: Record<string, unknown>;
}

export type Reply = { result: unknown } | { error: { code: number; message: string } };

function send(message: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`);
}

// Read requests from stdin and answer each with handle(). Exit when stdin closes.
export function serveStdio(handle: (request: Request) => Reply): void {
  const input = readline.createInterface({ input: process.stdin });
  input.on('line', (line) => {
    if (!line.trim()) return;
    let request: Request;
    try {
      request = JSON.parse(line) as Request;
    } catch {
      send({ id: null, error: { code: -32700, message: 'Parse error' } });
      return;
    }
    // A message without an id is a notification, so it gets no reply.
    if (request.id === undefined || request.id === null) return;
    send({ id: request.id, ...handle(request) });
  });
  input.on('close', () => process.exit(0));
}
