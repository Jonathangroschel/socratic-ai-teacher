'use server';

import { z } from 'zod';

import { createUser, getUser, transferUserContentByUserId, transferUserProfileByUserId } from '@/lib/db/queries';
import { auth, signIn } from './auth';

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export interface LoginActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data';
}

export const login = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    return { status: 'failed' };
  }
};

export interface RegisterActionState {
  status:
    | 'idle'
    | 'in_progress'
    | 'success'
    | 'failed'
    | 'user_exists'
    | 'invalid_data';
}

export const register = async (
  _: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    // Check if the email is already registered
    const [existingUser] = await getUser(validatedData.email);
    if (existingUser) {
      return { status: 'user_exists' } as RegisterActionState;
    }
    
    // Create the new user
    await createUser(validatedData.email, validatedData.password);
    // Get the newly created user to get the ID
    const [newUser] = await getUser(validatedData.email);
    const newUserId = newUser?.id;

    // If currently signed in as guest, transfer profile by user id
    const session = await auth();
    if (session?.user?.type === 'guest' && newUserId) {
      try {
        await transferUserProfileByUserId({
          fromUserId: session.user.id,
          toUserId: newUserId,
        });
        await transferUserContentByUserId({
          fromUserId: session.user.id,
          toUserId: newUserId,
        });
      } catch (transferError) {
        console.error('Error transferring profile:', transferError);
        // Continue even if transfer fails
      }
    }
    
    // Sign in with the new credentials
    await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }
    console.error('Registration error:', error);
    return { status: 'failed' };
  }
};

