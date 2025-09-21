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
      <div className="min-h-screen flex items-center justify-center">
        Loading Teacher Dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold">Teacher Dashboard</h1>
            <p className="text-gray-400 mt-2">
              Welcome, {teacherData?.full_name}!
            </p>
          </div>
          <SignOutButton />
        </header>

        {/* Button and message display section */}
        <div className="my-6 p-4 bg-gray-800 rounded-lg flex items-center justify-between shadow-md">
          <p className="text-gray-300 flex-grow">
            {message ||
              "Click the button to refresh class average calculations."}
          </p>
          <button
            onClick={handleCalculateAverages}
            disabled={isCalculating}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-5 rounded-lg transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed whitespace-nowrap"
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
                className="bg-gray-800 p-4 rounded-lg shadow-md"
              >
                <h3 className="font-semibold text-lg">{classroom.name}</h3>
                {averageData ? (
                  <p className="text-2xl font-bold text-purple-400">
                    {averageData.average_score}
                  </p>
                ) : (
                  <p className="text-gray-400">No average calculated yet.</p>
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
