import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { getRewardTransactionsPageByUserId } from '@/lib/db/queries';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? 20)));
    const cursorRaw = searchParams.get('cursor');
    let cursor: { createdAt: Date; id: string } | null = null;
    if (cursorRaw) {
      const [createdAtIso, id] = cursorRaw.split('|');
      if (createdAtIso && id) cursor = { createdAt: new Date(createdAtIso), id };
    }

    const { items, nextCursor } = await getRewardTransactionsPageByUserId({
      userId: session.user.id,
      limit,
      cursor,
    });

    return Response.json({ items, nextCursor });
  } catch (e) {
    return new ChatSDKError('bad_request:api').toResponse();
  }
}


