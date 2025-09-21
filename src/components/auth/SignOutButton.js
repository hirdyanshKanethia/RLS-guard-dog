    'use client';

    import { createClient } from '@/utils/supabase/client';
    import { useRouter } from 'next/navigation';

    export default function SignOutButton() {
      const router = useRouter();
      const supabase = createClient();

      const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/'); // Redirect to homepage after sign out
        router.refresh(); // Refresh the page to clear any cached data
      };

      return (
        <button
          onClick={handleSignOut}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
        >
          Sign Out
        </button>
      );
    }
    
