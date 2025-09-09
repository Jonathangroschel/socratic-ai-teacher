export const DEFAULT_CHAT_MODEL: string = 'chat-model';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'GPT-5 Mini',
    description: 'Fast and efficient model optimized for conversational AI and teaching',
  },
  {
    id: 'chat-model-reasoning',
    name: 'GPT-5 Mini Reasoning',
    description: 'Uses chain-of-thought reasoning for complex Socratic questioning',
  },
];
