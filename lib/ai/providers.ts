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
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require('./models.mock');
      return customProvider({
        languageModels: {
          'chat-model': chatModel,
          'chat-model-reasoning': reasoningModel,
          'title-model': titleModel,
          'artifact-model': artifactModel,
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
        'artifact-model': gateway.languageModel('openai/gpt-4.1'),
        // Use a widely supported model for rewards to avoid deployment mismatches
        'reward-model': gateway.languageModel('openai/gpt-4.1'),
      },
    });
