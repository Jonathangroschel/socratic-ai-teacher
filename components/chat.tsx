'use client';

import { DefaultChatTransport, type LanguageModelUsage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useEffect, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, fetchWithErrorHandlers, generateUUID } from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { unstable_serialize } from 'swr/infinite';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { toast } from './toast';
import type { Session } from 'next-auth';
import { useSearchParams } from 'next/navigation';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { ChatSDKError } from '@/lib/errors';
import type { Attachment, ChatMessage } from '@/lib/types';
import { useDataStream } from './data-stream-provider';
import { AccountNudgeBanner } from './account-nudge-banner';

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  session,
  autoResume,
  initialLastContext,
  isReturningVisitor,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  autoResume: boolean;
  initialLastContext?: LanguageModelUsage;
  isReturningVisitor?: boolean;
}) {
  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>('');
  const [usage, setUsage] = useState<LanguageModelUsage | undefined>(
    initialLastContext,
  );
  const [messageCountThisSession, setMessageCountThisSession] = useState(0);
  const [showAccountNudge, setShowAccountNudge] = useState(false);
  const [todayRewardTotal, setTodayRewardTotal] = useState<number>(0);
  const isGuestUser = session?.user?.type === 'guest';

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest({ messages, id, body }) {
        const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return {
          body: {
            id,
            message: messages.at(-1),
            selectedChatModel: initialChatModel,
            selectedVisibilityType: visibilityType,
            clientTimeZone,
            ...body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
      if (dataPart.type === 'data-usage') {
        setUsage(dataPart.data);
      }
      if (dataPart.type === 'data-reward') {
        const { todayTotal, delta, cap, min, max } = dataPart.data as any;
        if (typeof todayTotal === 'number') setTodayRewardTotal(todayTotal);
        else if (typeof delta === 'number') setTodayRewardTotal((t) => t + delta);
        const total = typeof todayTotal === 'number' ? todayTotal : undefined;
        if (typeof cap === 'number' && typeof total === 'number' && total >= cap) {
          toast({ type: 'success', description: `Daily earnings cap reached (${cap.toLocaleString()}). Come back tomorrow!` });
        }
      }
    },
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast({
          type: 'error',
          description: error.message,
        });
      }
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get('query');

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      sendMessage({
        role: 'user' as const,
        parts: [{ type: 'text', text: query }],
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id]);

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  // Track user messages this session for nudge triggering (guest-only handled server via middleware, but we just show UI)
  useEffect(() => {
    const userMsgs = messages.filter((m) => m.role === 'user').length;
    setMessageCountThisSession(userMsgs);
  }, [messages]);

  useEffect(() => {
    // Conditions: at least 2 user messages; not readonly; snooze rules
    if (isReadonly) return;
    // Only show for guest users
    if (!isGuestUser) return;
    if (messageCountThisSession < 2) return;
    // snooze key
    const last = localStorage.getItem('accountNudge:last');
    const lastAt = last ? Number(last) : 0;
    const twelveHours = 12 * 60 * 60 * 1000;
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const lifetime = 0; // optional future: fetch lifetime
    const snooze = lifetime >= 10000 ? twelveHours : twentyFourHours;
    if (Date.now() - lastAt < snooze) return;
    // Don’t show while streaming
    if (status === 'streaming' || status === 'submitted') return;
    setShowAccountNudge(true);
  }, [messageCountThisSession, isReadonly, status, isGuestUser]);

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background touch-pan-y overscroll-behavior-contain">
        <ChatHeader
          chatId={id}
          selectedVisibilityType={initialVisibilityType}
          isReadonly={isReadonly}
          session={session}
        />

        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          regenerate={regenerate}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
          selectedModelId={initialChatModel}
          isReturningVisitor={isReturningVisitor}
        />

        <div className="sticky bottom-0 flex gap-2 px-2 md:px-4 pb-3 md:pb-4 mx-auto w-full bg-background max-w-4xl z-[1] border-t-0">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              sendMessage={sendMessage}
              selectedVisibilityType={visibilityType}
              selectedModelId={initialChatModel}
              usage={usage}
              nudge={isGuestUser && showAccountNudge ? {
                visible: true,
                todayTotal: todayRewardTotal,
                onClose: () => {
                  setShowAccountNudge(false);
                  localStorage.setItem('accountNudge:last', String(Date.now()));
                }
              } : undefined}
            />
          )}
        </div>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        sendMessage={sendMessage}
        messages={messages}
        setMessages={setMessages}
        regenerate={regenerate}
        votes={votes}
        isReadonly={isReadonly}
        selectedVisibilityType={visibilityType}
        selectedModelId={initialChatModel}
      />
    </>
  );
}
