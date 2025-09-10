import 'server-only';

import MemoryClient from 'mem0ai';

let client: MemoryClient | null = null;

try {
  if (process.env.MEM0_API_KEY) {
<<<<<<< HEAD
    client = new MemoryClient(process.env.MEM0_API_KEY);
=======
    client = new MemoryClient({ apiKey: process.env.MEM0_API_KEY });
>>>>>>> test-gpt5
  }
} catch (_) {
  client = null;
}

export const mem0 = client;


