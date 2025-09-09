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
    const profileRaw = await getUserProfileByUserId({ userId: session.user.id });
    const profile = profileRaw
      ? {
          interests: Array.isArray(profileRaw.interests)
            ? profileRaw.interests
            : null,
          goals: Array.isArray(profileRaw.goals) ? profileRaw.goals : null,
          timeBudgetMins:
            typeof profileRaw.timeBudgetMins === 'number'
              ? profileRaw.timeBudgetMins
              : null,
          onboardingCompleted: Boolean(profileRaw.onboardingCompleted),
        }
      : null;
    return Response.json(profile, { status: 200 });
  } catch (error) {
    // If table doesn't exist yet, return null profile
    console.warn('Failed to fetch user profile:', error);
    return Response.json(null, { status: 200 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  try {
    const json = await request.json();
    console.log('Profile API received data:', JSON.stringify(json, null, 2));
    
    const parsed = SelectedInterestsSchema.safeParse(json);

    if (!parsed.success) {
      console.error('Profile validation failed:', parsed.error);
      return new ChatSDKError('bad_request:api').toResponse();
    }

    const { interests, goals, timeBudgetMins } = parsed.data;

    await upsertUserProfile({
      userId: session.user.id,
      interests,
      goals,
      timeBudgetMins,
      onboardingCompleted: true,
    });

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Profile upsert failed:', error);
    // If it's a database error (table doesn't exist), return a more specific error
    if (error instanceof Error && error.message.includes('relation') && error.message.includes('does not exist')) {
      return Response.json({ 
        error: 'Database table not ready yet. Please try again in a moment.',
        code: 'TABLE_NOT_EXISTS'
      }, { status: 503 });
    }
    return new ChatSDKError('bad_request:api').toResponse();
  }
}


