import { cookies } from 'next/headers';

import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { auth } from '../(auth)/auth';
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
    console.log('Profile found:', profile);
    console.log('Onboarding completed:', profile?.onboardingCompleted);
  } catch (error) {
    // If table doesn't exist or other DB error, treat as incomplete onboarding
    console.warn('Failed to fetch user profile, redirecting to onboarding:', error);
  }
  
  if (!profile || !profile.onboardingCompleted) {
    console.log('Redirecting to onboarding - profile:', !!profile, 'onboardingCompleted:', profile?.onboardingCompleted);
    redirect('/onboarding');
  }

  const id = generateUUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');

  if (!modelIdFromCookie) {
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
        />
        <DataStreamHandler />
      </>
    );
  }

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        initialChatModel={modelIdFromCookie.value}
        initialVisibilityType="private"
        isReadonly={false}
        session={session}
        autoResume={false}
      />
      <DataStreamHandler />
    </>
  );
}
