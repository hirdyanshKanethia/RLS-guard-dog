"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function HomePage() {
  const supabase = createClient();
  const router = useRouter();

  // State for the login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Handler for Head Teacher Login (GitHub)
  const handleGitHubLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${
          process.env.NEXT_PUBLIC_SITE_URL || location.origin
        }/auth/callback`,
      },
    });
  };

  // UPDATED Handler for Student & Teacher Login (Email/Password)
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");

    const { data: loginData, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError) {
      setError(loginError.message); // Handles "Invalid login credentials"
      return;
    }

    if (loginData.user) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", loginData.user.id)
        .single();

      if (profileError || !profile) {
        setError("Could not find a profile for this user.");
        await supabase.auth.signOut();
      } else if (profile.role === "student") {
        // If the user is a student, redirect them immediately.
        router.push("/student");
      } else if (profile.role === "teacher") {
        // If the user is a teacher, redirect them immediately.
        router.push("/teacher");
      } else {
        // If the role is not student or teacher (e.g., head_teacher), it's invalid for this form.
        setError("Invalid role for this login method.");
        await supabase.auth.signOut();
      }
    }
  };

  // This hook handles users who are already logged in when they visit the page
  useEffect(() => {
    const getSessionAndRedirect = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const response = await fetch("/api/get-role");
        if (response.ok) {
          const { role } = await response.json();
          switch (role) {
            case "teacher":
              router.push("/teacher");
              break;
            case "head_teacher":
              router.push("/head-teacher");
              break;
            case "student":
              router.push("/student");
              break;
            default:
              break;
          }
        }
      }
    };
    getSessionAndRedirect();
  }, [router, supabase]);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-sm p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            RLS Guard Dog
          </h1>
          <p className="text-gray-600">Please select your login method</p>
        </div>

        {/* Head Teacher Login Section */}
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-800 mb-3">
            For Head Teachers
          </h2>
          <button
            onClick={handleGitHubLogin}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-md transition-colors duration-200 flex items-center justify-center"
          >
            <span className="ml-3">Log In with GitHub</span>
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-3 text-gray-500">OR</span>
          </div>
        </div>

        {/* Student & Teacher Login Section */}
        <div>
          <h2 className="text-lg font-medium text-gray-800 mb-3 text-center">
            For Teachers & Students
          </h2>
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-md border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-md border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors duration-200"
            >
              Log In
            </button>
            {error && (
              <p className="text-red-600 text-sm text-center pt-2">{error}</p>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
