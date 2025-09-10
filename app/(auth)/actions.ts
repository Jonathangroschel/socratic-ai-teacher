'use server';

import { z } from 'zod';

import { createUser, getUser, transferGuestProfileToUser } from '@/lib/db/queries';
import { guestRegex } from '@/lib/constants';

import { signIn } from './auth';

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
      redirect: true,
      redirectTo: '/',
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

    // Get the current session token from the cookie
    const cookieHeader = formData.get('cookie-header') as string;
    const guestEmail = cookieHeader ? extractGuestEmail(cookieHeader) : null;
    
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
    
    // If we have a guest email and a new user ID, try to transfer profile data
    if (guestEmail && newUserId) {
      console.log('Attempting to transfer profile from guest:', guestEmail, 'to new user:', newUserId);
      try {
        await transferGuestProfileToUser({
          guestEmail,
          newUserId,
        });
      } catch (transferError) {
        console.error('Error transferring profile:', transferError);
        // Continue with sign-in even if transfer fails
      }
    }
    
    // Sign in with the new credentials
    await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: true,
      redirectTo: '/',
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

// Helper function to extract guest email from cookie header
function extractGuestEmail(cookieHeader: string): string | null {
  try {
    // Find the next-auth.session-token cookie
    const sessionMatch = cookieHeader.match(/next-auth\.session-token=([^;]+)/);
    if (!sessionMatch) return null;
    
    // Decode the JWT token (simplified approach)
    const token = sessionMatch[1];
    const payload = token.split('.')[1];
    if (!payload) return null;
    
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
    const email = decodedPayload.email;
    
    // Check if it's a guest email
    if (email && guestRegex.test(email)) {
      return email;
    }
    return null;
  } catch (error) {
    console.error('Error extracting guest email:', error);
    return null;
  }
}
