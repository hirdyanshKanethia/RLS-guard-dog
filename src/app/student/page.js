import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/auth/SignOutButton";

export default async function StudentPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  // Fetch the student's profile and their progress records in one go.
  // The RLS policy for 'progress' will automatically filter records for this user.
  const { data: studentProfile, error } = await supabase
    .from("profiles")
    .select(
      `
      full_name,
      progress (
        id,
        subject,
        score
      )
    `
    )
    .eq("id", user.id)
    .single();

  if (error || !studentProfile) {
    console.error("Error fetching student profile:", error);
    return (
      <p className="text-center text-red-500">
        Could not load your profile data.
      </p>
    );
  }

  // Sort the progress records by subject name
  const sortedProgress = studentProfile.progress.sort((a, b) =>
    a.subject.localeCompare(b.subject)
  );

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold">Student Dashboard</h1>
            <p className="text-gray-400 mt-2">
              Welcome, {studentProfile.full_name}!
            </p>
          </div>
          <SignOutButton />
        </header>

        <main className="bg-gray-800 shadow-lg rounded-2xl p-6">
          <h2 className="text-2xl font-semibold mb-4">Your Progress</h2>
          {sortedProgress.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="p-4">Subject</th>
                    <th className="p-4">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProgress.map((p) => (
                    <tr key={p.id} className="border-b border-gray-700">
                      <td className="p-4">{p.subject}</td>
                      <td className="p-4 font-semibold text-white">
                        {p.score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 italic text-center py-4">
              No progress records have been added for you yet.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
