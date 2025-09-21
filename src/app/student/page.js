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
      <p className="text-center text-red-600">
        Could not load your profile data.
      </p>
    );
  }

  // Sort the progress records by subject name
  const sortedProgress = studentProfile.progress.sort((a, b) =>
    a.subject.localeCompare(b.subject)
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              Student Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Welcome, {studentProfile.full_name}!
            </p>
          </div>
          <SignOutButton />
        </header>

        <main className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
          <h2 className="text-xl font-medium text-gray-800 mb-6">
            Your Progress
          </h2>
          {sortedProgress.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="p-4 text-gray-700 font-medium">Subject</th>
                    <th className="p-4 text-gray-700 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProgress.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="p-4 text-gray-900">{p.subject}</td>
                      <td className="p-4 font-medium text-gray-900">
                        {p.score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic text-center py-8">
              No progress records have been added for you yet.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
