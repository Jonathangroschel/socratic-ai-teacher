export const DEFAULT_CHAT_MODEL: string = 'chat-model';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'GPT-4.1',
    description: 'Advanced model optimized for high-quality Socratic teaching responses',
  },
  {
    id: 'chat-model-reasoning',
    name: 'GPT-4.1 Reasoning',
    description: 'Advanced reasoning model for complex Socratic questioning and feedback',
  },
];
