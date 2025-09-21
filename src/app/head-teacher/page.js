import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/auth/SignOutButton";

// This is a Server Component, running on the server
export default async function HeadTeacherPage() {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/"); // Redirect home if not logged in
  }

  // Fetch the user's profile to check their role and get their school_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, school_id")
    .eq("id", user.id)
    .single();

  // Security check: ensure the user is a head_teacher
  if (!profile || profile.role !== "head_teacher") {
    // You might want to redirect to a generic dashboard or show an error
    redirect("/");
  }

  // Fetch all data for the school. RLS policies will enforce security.
  const { data: school, error } = await supabase
    .from("schools")
    .select(
      `
          name,
          classrooms (
            id,
            name,
            profiles:profiles!profiles_classroom_id_fkey ( id, full_name ),
            
            teacher_classroom_assignments (
              profiles ( full_name )
            )
          )
        `
    )
    .eq("id", profile.school_id)
    .single();

  // Fetch all progress records for the school. RLS will also protect this.
  const { data: allProgress } = await supabase.from("progress").select("*");

  if (error) {
    console.log("[ERROR] ", error);
    return (
      <p className="text-center text-red-500">Error loading school data.</p>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold">Head Teacher Dashboard</h1>
            <p className="text-gray-400 mt-2">Overseeing {school.name}</p>
          </div>
          <SignOutButton />
        </header>

        <main className="space-y-8">
          {school.classrooms.length > 0 ? (
            school.classrooms.map((classroom) => {
              // NEW: Get the teacher's name from the nested data
              const teacherAssignment =
                classroom.teacher_classroom_assignments[0];
              const teacherName = teacherAssignment?.profiles?.full_name;

              return (
                <div
                  key={classroom.id}
                  className="bg-gray-800 shadow-lg rounded-2xl p-6"
                >
                  <div className="border-b border-gray-700 pb-2 mb-4">
                    <h2 className="text-2xl font-semibold">{classroom.name}</h2>
                    {/* NEW: Display the teacher's name */}
                    {teacherName ? (
                      <p className="text-sm text-purple-400 font-medium">
                        Taught by: {teacherName}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 italic">
                        No teacher assigned
                      </p>
                    )}
                  </div>

                  {classroom.profiles.length > 0 ? (
                    <ul className="space-y-4">
                      {classroom.profiles.map((student) => (
                        <li
                          key={student.id}
                          className="bg-gray-700 p-4 rounded-lg"
                        >
                          <h3 className="font-bold text-lg">
                            {student.full_name}
                          </h3>
                          <div className="pl-4 mt-2">
                            {allProgress?.filter(
                              (p) => p.student_id === student.id
                            ).length > 0 ? (
                              <ul className="list-disc list-inside text-gray-300">
                                {allProgress
                                  .filter((p) => p.student_id === student.id)
                                  .map((progress) => (
                                    <li key={progress.id}>
                                      {progress.subject}:{" "}
                                      <span className="font-semibold text-white">
                                        {progress.score}
                                      </span>
                                    </li>
                                  ))}
                              </ul>
                            ) : (
                              <p className="text-gray-400 italic">
                                No progress records found.
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400 text-center">
                      No students assigned to this classroom.
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-center text-gray-400">
              No classrooms found for this school.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
