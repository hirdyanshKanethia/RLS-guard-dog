"use client"; // Convert to a Client Component

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client"; // Use the client-side helper
import { useRouter } from "next/navigation";
import SignOutButton from "@/components/auth/SignOutButton";
import ClassroomView from "@/components/dashboard/ClassroomView";

export default function TeacherPage() {
  const supabase = createClient();
  const router = useRouter();

  // State for data and UI feedback
  const [teacherData, setTeacherData] = useState(null);
  const [classrooms, setClassrooms] = useState([]);
  const [classAverages, setClassAverages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [message, setMessage] = useState("");

  // Function to fetch the latest class averages
  const fetchAverages = async () => {
    try {
      const response = await fetch("/api/class-averages");
      if (response.ok) {
        const averages = await response.json();
        setClassAverages(averages);
      }
    } catch (e) {
      console.error("Could not fetch class averages", e);
      setMessage("Error: Could not retrieve averages.");
    }
  };

  // Fetch all initial data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!profile || profile.role !== "teacher") {
        router.push("/");
        return;
      }

      const { data: fetchedTeacherData, error } = await supabase
        .from("profiles")
        .select(
          `
          full_name,
          school_id,
          teacher_classroom_assignments (
            classrooms (
              id,
              name,
              profiles!profiles_classroom_id_fkey (id, full_name, role, progress (id, subject, score))
            )
          )
        `
        )
        .eq("id", user.id)
        .single();

      if (error || !fetchedTeacherData) {
        console.error("Error fetching teacher data:", error);
        setLoading(false);
        return;
      }

      setTeacherData(fetchedTeacherData);

      const classroomsWithAssignments =
        fetchedTeacherData.teacher_classroom_assignments || [];
      const processedClassrooms = classroomsWithAssignments
        .map((assignment) => {
          const classroom = assignment.classrooms;
          if (!classroom) return null;
          const studentsOnly = classroom.profiles.filter(
            (p) => p.role === "student"
          );
          return { ...classroom, profiles: studentsOnly };
        })
        .filter(Boolean);

      setClassrooms(processedClassrooms);

      await fetchAverages();
      setLoading(false);
    };

    fetchData();
  }, [supabase, router]);

  // Handler for the "Calculate Averages" button
  const handleCalculateAverages = async () => {
    setIsCalculating(true);
    setMessage("Triggering calculation...");

    const triggerResponse = await fetch("/api/trigger-average-calculation", {
      method: "POST",
    });
    if (!triggerResponse.ok) {
      setMessage("Error: Failed to start calculation process.");
      setIsCalculating(false);
      return;
    }

    setMessage("Calculation in progress...");
    setTimeout(() => {
      fetchAverages();
      setMessage("Averages have been updated.");
      setIsCalculating(false);
    }, 3000); // 3-second delay
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading Teacher Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              Teacher Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Welcome, {teacherData?.full_name}!
            </p>
          </div>
          <SignOutButton />
        </header>

        {/* Button and message display section */}
        <div className="my-6 p-4 bg-white border border-gray-200 rounded-lg flex items-center justify-between shadow-sm">
          <p className="text-gray-700 flex-grow">
            {message ||
              "Click the button to refresh class average calculations."}
          </p>
          <button
            onClick={handleCalculateAverages}
            disabled={isCalculating}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 rounded-md transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isCalculating ? "Calculating..." : "Calculate Averages"}
          </button>
        </div>

        {/* Display Class Averages above the main classroom view */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {classrooms.map((classroom) => {
            const averageData = classAverages.find(
              (avg) => avg.classroom_id === classroom.id
            );
            return (
              <div
                key={classroom.id}
                className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm"
              >
                <h3 className="font-medium text-lg text-gray-800">
                  {classroom.name}
                </h3>
                {averageData ? (
                  <p className="text-2xl font-semibold text-blue-600 mt-2">
                    {averageData.average_score}
                  </p>
                ) : (
                  <p className="text-gray-500 mt-2">
                    No average calculated yet.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <ClassroomView
          initialClassrooms={classrooms}
          schoolId={teacherData?.school_id}
        />
      </div>
    </div>
  );
}
