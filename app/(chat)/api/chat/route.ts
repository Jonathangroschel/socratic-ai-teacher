import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  type LanguageModelUsage,
  smoothStream,
  stepCountIs,
  streamText,
} from 'ai';
import { auth, type UserType } from '@/app/(auth)/auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  getUserProfileByUserId,
  updateChatLastContextById,
} from '@/lib/db/queries';
import { convertToUIMessages, generateUUID } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { posthogServer, trackMessageSent } from '@/lib/analytics/posthog-server';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import { mem0 } from '@/lib/memory/mem0';
import { evaluateAndReward } from '@/lib/rewards/evaluate';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import type { ChatModel } from '@/lib/ai/models';
import type { VisibilityType } from '@/components/visibility-selector';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
      clientTimeZone,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel['id'];
      selectedVisibilityType: VisibilityType;
      clientTimeZone?: string;
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const { longitude, latitude, city, country } = geolocation(request);
    // Prefer Vercel-provided timezone header, then client-provided, else null
    const headerTimeZone = request.headers.get('x-vercel-ip-timezone');
    const timeZone = headerTimeZone || clientTimeZone || null;

    // Gracefully handle profile fetch - if table doesn't exist, continue without profile
    let profile = null;
    try {
      const profileRaw = await getUserProfileByUserId({ userId: session.user.id });
      profile = profileRaw
        ? {
          interests: Array.isArray(profileRaw.interests)
            ? (profileRaw.interests as Array<{ category: string; topics: string[] }>)
            : null,
          goals: Array.isArray(profileRaw.goals)
            ? (profileRaw.goals as string[])
            : null,
          timeBudgetMins:
            typeof profileRaw.timeBudgetMins === 'number'
              ? profileRaw.timeBudgetMins
              : null,
        }
        : null;
    } catch (error) {
      console.warn('Failed to fetch user profile for chat, continuing without profile:', error);
    }

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
      timeZone,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    // Fire-and-forget analytics for DAU/MAU (guests included)
    try {
      const firstMessageToday = messageCount === 0;
      // Approximate 30d message count using DB query window 30*24h (best-effort)
      const messageCount30d = await getMessageCountByUserId({ id: session.user.id, differenceInHours: 24 * 30 });
      await trackMessageSent({
        userId: session.user.id,
        userType: session.user.type,
        chatId: id,
        city,
        country,
        timeZone,
        firstMessageToday,
        messageCount24h: messageCount + 1,
        messageCount30d,
      });
    } catch (_) { }

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    let finalUsage: LanguageModelUsage | undefined;

    // Retrieve recent learning memory to inject as brief context
    let memoryBlock = '';
    if (mem0 && session?.user?.id) {
      try {
        const results = await mem0.search(
          'progress OR last session OR session log OR completed topics OR weaknesses OR next steps OR review candidates OR concept deck',
          {
            user_id: session.user.id,
            top_k: 5,
          } as any,
        );
        const top = Array.isArray(results)
          ? results.slice(0, 3).map((r: any) => `- ${r?.content ?? ''}`).join('\n')
          : '';
        if (top && top.trim()) {
          memoryBlock = `\n\nRecent learning memory (summarized):\n${top}`;
        }
      } catch (err) {
        console.warn('mem0.search failed', err);
      }
    }

    let uiWriter: any = null;
    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        uiWriter = dataStream;
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          temperature: 0.7,
          system: `${systemPrompt({ selectedChatModel, requestHints, profile })}${memoryBlock}\n\nMemory policy: Only remember content relevant to the student's learning journey (skills, concepts mastered/struggled with, misconceptions, goals, time budget, level, next steps). Do not store unrelated personal details.\n\nAnti-repeat policy: From 'Recent learning memory', extract 'Completed topics' and avoid repeating the exact same topic in the next 3 sessions or 7 days. If the user explicitly requests a repeat or it's due for spaced review, change the depth/focus (advance the topic) rather than reusing the same plan.\n\nReview policy: If no 'Recent learning memory' block is present or it contains no prior concepts, OMIT the Review segment (do not invent review cards). Do not output placeholder text such as 'No review cards due today'. If Review is omitted, replace it with either: (a) an extra Applied task (4–5 min) tied to today's topic, or (b) a quick thought exercise (≤2 min) to apply today's concept. Only include Review if specific prior concepts are present or the user explicitly asks for review.`,
          messages: convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(5),
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : [
                'createDocument',
                'updateDocument',
                'requestSuggestions',
              ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          tools: {
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
          onFinish: async ({ usage }) => {
            finalUsage = usage;
            dataStream.write({ type: 'data-usage', data: usage });
          },
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        await saveMessages({
          messages: messages.map((message) => ({
            id: message.id,
            role: message.role,
            parts: message.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        });

        if (finalUsage) {
          try {
            await updateChatLastContextById({
              chatId: id,
              context: finalUsage,
            });
          } catch (err) {
            console.warn('Unable to persist last usage for chat', id, err);
          }
        }

        // Best-effort: store a concise learning memory
        if (mem0 && session?.user?.id) {
          try {
            const userText = message.parts
              .map((p) => (p.type === 'text' ? p.text : ''))
              .filter(Boolean)
              .join('\n')
              .trim();

            const assistantText = messages
              .filter((m) => m.role === 'assistant')
              .at(-1)?.parts
              ?.map((p) => (p.type === 'text' ? p.text : ''))
              .filter(Boolean)
              .join('\n')
              .trim() ?? '';

            const payload = [
              userText ? { role: 'user', content: userText } : null,
              assistantText ? { role: 'assistant', content: assistantText } : null,
            ].filter(Boolean) as Array<{ role: 'user' | 'assistant'; content: string }>;

            if (payload.length > 0) {
              await mem0.add(payload as any, {
                user_id: session.user.id,
                metadata: { category: 'learning_progress' },
                async_mode: true,
              });
            }
          } catch (err) {
            console.warn('mem0.add failed', err);
          }
        }

        // Evaluate and persist rewards after the full assistant message is available
        try {
          const userText = message.parts
            .map((p) => (p.type === 'text' ? p.text : ''))
            .filter(Boolean)
            .join('\n')
            .trim();

          const assistantText = messages
            .filter((m) => m.role === 'assistant')
            .at(-1)?.parts
            ?.map((p) => (p.type === 'text' ? p.text : ''))
            .filter(Boolean)
            .join('\n')
            .trim() ?? '';

          const reward = await evaluateAndReward({
            userId: session.user.id,
            chatId: id,
            messageId: messages.at(-1)?.id ?? undefined,
            userText,
            assistantText,
          });
          if (reward && reward.delta && reward.delta > 0) {
            try {
              uiWriter?.write?.({
                type: 'data-reward',
                data: {
                  delta: reward.delta,
                  todayTotal: reward.todayTotal,
                  lifetimeTotal: reward.lifetimeTotal,
                },
              });
            } catch { }
          }
        } catch (err) {
          console.warn('reward evaluation failed', err);
        }
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () =>
          stream.pipeThrough(new JsonToSseTransformStream()),
        ),
      );
    } else {
      return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error('Unhandled error in chat API:', error);
    return new ChatSDKError('offline:chat').toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
