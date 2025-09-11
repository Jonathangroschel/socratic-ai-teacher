declare module 'mem0ai' {
  export interface MemoryMessage {
    role: 'user' | 'assistant';
    content: string | { type: 'image_url'; image_url: { url: string } };
  }

  export interface MemoryClientOptions {
    apiKey: string;
    host?: string;
    organizationName?: string;
    projectName?: string;
    organizationId?: string | number;
    projectId?: string | number;
  }

  export interface MemoryAddOptions {
    user_id?: string;
    agent_id?: string;
    app_id?: string;
    run_id?: string;
    metadata?: Record<string, any>;
    async_mode?: boolean;
  }

  export interface MemorySearchOptions {
    user_id?: string;
    top_k?: number;
  }

  export default class MemoryClient {
    constructor(options: MemoryClientOptions);
    add(messages: MemoryMessage[], options?: MemoryAddOptions): Promise<any[]>;
    search(query: string, options?: MemorySearchOptions): Promise<any[]>;
  }
}


