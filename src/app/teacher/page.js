import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/auth/SignOutButton";
import ClassroomView from "@/components/dashboard/ClassroomView";

export default async function TeacherPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  // Fetch profile to verify role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "teacher") {
    redirect("/"); // Or to an unauthorized page
  }

  // Fetch all data for this teacher in a single, nested query
  const { data: teacherData, error } = await supabase
    .from("profiles")
    .select(
      `
      full_name,
      school_id,
      teacher_classroom_assignments (
        classrooms (
          id,
          name,
          profiles!profiles_classroom_id_fkey (
            id,
            full_name,
            role,
            progress (
              id,
              subject,
              score
            )
          )
        )
      )
    `
    )
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching teacher data:", error);
    return (
      <p className="text-center text-red-500">Could not load dashboard data.</p>
    );
  }

  // Extract and process the classroom data from the nested structure
  const classroomsWithAssignments =
    teacherData?.teacher_classroom_assignments || [];

  const classrooms = classroomsWithAssignments
    .map((assignment) => {
      const classroom = assignment.classrooms;
      if (!classroom) return null;

      const studentsOnly = classroom.profiles.filter(
        (profile) => profile.role === "student"
      );

      return {
        ...classroom,
        profiles: studentsOnly, 
      };
    })
    .filter(Boolean); 

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold">Teacher Dashboard</h1>
            <p className="text-gray-400 mt-2">
              Welcome, {teacherData.full_name}!
            </p>
          </div>
          <SignOutButton />
        </header>
        <ClassroomView
          initialClassrooms={classrooms}
          schoolId={teacherData.school_id}
        />
      </div>
    </div>
  );
}
