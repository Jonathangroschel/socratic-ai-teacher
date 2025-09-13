import { redirect } from 'next/navigation';

export default async function Page() {
  // Redirect the legacy chat homepage to the new /chat route
  redirect('/chat');
}
