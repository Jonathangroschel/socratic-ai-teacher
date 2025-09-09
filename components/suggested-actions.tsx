'use client';

import { motion } from 'framer-motion';
import { memo } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { VisibilityType } from './visibility-selector';
import type { ChatMessage } from '@/lib/types';
import { Suggestion } from './elements/suggestion';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils';

interface SuggestedActionsProps {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  selectedVisibilityType: VisibilityType;
}

function PureSuggestedActions({
  chatId,
  sendMessage,
  selectedVisibilityType,
}: SuggestedActionsProps) {
  const { data: profile } = useSWR('/api/profile', fetcher);
  const topics: string[] =
    profile?.interests?.flatMap((c: any) => c.topics) ?? [];
  const fallback = [
    'Start my daily session',
    'Teach me something useful in 20 minutes',
    'Warm-up quiz to begin today',
    'Review yesterday\'s concepts',
  ];

  const topPicks = topics.slice(0, 6);
  const suggestedActions =
    topPicks.length >= 2
      ? [
          `Kick off with: ${topPicks[0]}`,
          `Quick explainer then quiz on: ${topPicks[1]}`,
          topPicks[2] ? `5-min micro-task: ${topPicks[2]}` : fallback[2],
          fallback[0],
        ]
      : fallback;

  return (
    <div data-testid="suggested-actions" className="grid sm:grid-cols-2 gap-2 w-full">
        {suggestedActions.map((suggestedAction, index) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.05 * index }}
            key={suggestedAction}
          >
            <Suggestion
              suggestion={suggestedAction}
              onClick={(suggestion) => {
                window.history.replaceState({}, '', `/chat/${chatId}`);
                sendMessage({
                  role: 'user',
                  parts: [{ type: 'text', text: suggestion }],
                });
              }}
              className="text-left w-full h-auto whitespace-normal p-3"
            >
              {suggestedAction}
            </Suggestion>
          </motion.div>
        ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) return false;
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType)
      return false;

    return true;
  },
);
