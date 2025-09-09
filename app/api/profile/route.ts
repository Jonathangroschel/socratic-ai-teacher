import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { getUserProfileByUserId, upsertUserProfile } from '@/lib/db/queries';
import { SelectedInterestsSchema } from '@/lib/onboarding/interests';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  try {
    const profile = await getUserProfileByUserId({ userId: session.user.id });
    return Response.json(profile ?? null, { status: 200 });
  } catch (error) {
    return new ChatSDKError('bad_request:api').toResponse();
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  try {
    const json = await request.json();
    const parsed = SelectedInterestsSchema.extend({
      onboardingCompleted: (value: unknown) => Boolean(value) as any,
    }).safeParse(json);

    if (!parsed.success) {
      return new ChatSDKError('bad_request:api').toResponse();
    }

    const { interests, goals, timeBudgetMins } = parsed.data as any;

    await upsertUserProfile({
      userId: session.user.id,
      interests,
      goals,
      timeBudgetMins,
      onboardingCompleted: true,
    });

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    return new ChatSDKError('bad_request:api').toResponse();
  }
}


