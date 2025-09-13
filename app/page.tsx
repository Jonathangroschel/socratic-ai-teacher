import { redirect } from 'next/navigation';

export default function LandingRedirect() {
  // On the app subdomain, send anyone who hits "/" straight to "/chat".
  redirect('/chat');
}


