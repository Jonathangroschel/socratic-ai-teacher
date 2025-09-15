import { cookies } from 'next/headers';

import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { auth } from '../../(auth)/auth';
import { redirect } from 'next/navigation';
import { getUserProfileByUserId } from '@/lib/db/queries';

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
  }

  // If user hasn't completed onboarding, send them to onboarding
  // Gracefully handle case where UserProfile table doesn't exist yet
  let profile = null;
  try {
    profile = await getUserProfileByUserId({ userId: session.user.id });
  } catch (error) {
    // If table doesn't exist or other DB error, treat as incomplete onboarding
    console.warn('Failed to fetch user profile, redirecting to onboarding:', error);
  }

  if (!profile || !profile.onboardingCompleted) {
    redirect('/onboarding');
  }

  const id = generateUUID();

  const hasVisited = Boolean(cookies().get('poly_visited'));

  // Always use the default chat model for the product experience.
  // We intentionally ignore any previously stored model selection.
  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        initialChatModel={DEFAULT_CHAT_MODEL}
        initialVisibilityType="private"
        isReadonly={false}
        session={session}
        autoResume={false}
        isReturningVisitor={hasVisited}
      />
      <DataStreamHandler />
    </>
  );
}


