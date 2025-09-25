import { z } from 'zod';
import type { getWeather } from './ai/tools/get-weather';
// Artifact-related tools removed
import type { InferUITool, LanguageModelUsage, UIMessage } from 'ai';

// Artifact types removed
import type { Suggestion } from './db/schema';

export type DataPart = { type: 'append-message'; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
// Removed artifact tool types

export type ChatTools = {
  getWeather: weatherTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: string;
  clear: null;
  finish: null;
  usage: LanguageModelUsage;
  reward: { delta: number; todayTotal: number; lifetimeTotal?: number };
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}
