export const DEFAULT_CHAT_MODEL: string = 'chat-model';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'GPT-5 Nano',
    description: 'Ultra-fast model optimized for quick Socratic teaching responses',
  },
  {
    id: 'chat-model-reasoning',
    name: 'GPT-5 Nano Reasoning',
    description: 'Fast reasoning model for rapid Socratic questioning and feedback',
  },
];
