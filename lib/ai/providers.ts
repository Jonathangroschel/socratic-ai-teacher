import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { isTestEnvironment } from '../constants';

export const myProvider = isTestEnvironment
  ? (() => {
    const {
      chatModel,
      reasoningModel,
      titleModel,
    } = require('./models.mock');
    return customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'reward-model': chatModel,
      },
    });
  })()
  : customProvider({
    languageModels: {
      'chat-model': gateway.languageModel('openai/gpt-4.1'),
      'chat-model-reasoning': wrapLanguageModel({
        model: gateway.languageModel('openai/gpt-4.1'),
        middleware: extractReasoningMiddleware({ tagName: 'think' }),
      }),
      'title-model': gateway.languageModel('openai/gpt-4.1'),
      // Rewards: cost-efficient scorer
      'reward-model': gateway.languageModel('openai/gpt-4o-mini'),
    },
  });
