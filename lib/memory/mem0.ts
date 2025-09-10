import 'server-only';

import MemoryClient from 'mem0ai';

let client: MemoryClient | null = null;

try {
  if (process.env.MEM0_API_KEY) {
    client = new MemoryClient(process.env.MEM0_API_KEY);
  }
} catch (_) {
  client = null;
}

export const mem0 = client;


