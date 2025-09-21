"use client"; // Convert this to a Client Component to handle user interaction

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client"; // Use the client-side Supabase helper
import { useRouter } from "next/navigation";
import SignOutButton from "@/components/auth/SignOutButton";

export default function HeadTeacherPage() {
  const supabase = createClient();
  const router = useRouter();

  // State for managing data and UI feedback
  const [school, setSchool] = useState(null);
  const [allProgress, setAllProgress] = useState([]);
  const [classAverages, setClassAverages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [message, setMessage] = useState("");

  // Function to fetch the latest class averages from our API route
  const fetchAverages = async () => {
    try {
      const response = await fetch("/api/class-averages");
      if (response.ok) {
        const averages = await response.json();
        setClassAverages(averages);
      }
    } catch (e) {
      console.error("Could not fetch class averages", e);
      setMessage("Error: Could not retrieve class averages.");
    }
  };

  // Fetch all initial data when the page loads
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
        .select("role, school_id")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "head_teacher") {
        router.push("/");
        return;
      }

      const { data: schoolData, error } = await supabase
        .from("schools")
        .select(
          `name, classrooms (id, name, profiles:profiles!profiles_classroom_id_fkey(id, full_name, role), teacher_classroom_assignments(profiles(full_name)))`
        )
        .eq("id", profile.school_id)
        .single();

      if (error || !schoolData) {
        console.error("Error fetching school data:", error);
        setLoading(false);
        return;
      }

      const { data: progressData } = await supabase
        .from("progress")
        .select("*");

      // Filter profiles to only show students
      const schoolWithFilteredStudents = {
        ...schoolData,
        classrooms: schoolData.classrooms.map((c) => ({
          ...c,
          profiles: c.profiles.filter((p) => p.role === "student"),
        })),
      };

      setSchool(schoolWithFilteredStudents);
      setAllProgress(progressData || []);

      // Fetch the initial averages from MongoDB
      await fetchAverages();

      setLoading(false);
    };

    fetchData();
  }, [supabase, router]);

  // Handler for the "Get Class Averages" button
  const handleCalculateAverages = async () => {
    setIsCalculating(true);
    setMessage("Triggering calculation...");

    // Step 1: Securely call our API route to invoke the Edge Function
    const triggerResponse = await fetch("/api/trigger-average-calculation", {
      method: "POST",
    });

    if (!triggerResponse.ok) {
      setMessage("Error: Failed to start the calculation process.");
      setIsCalculating(false);
      return;
    }

    setMessage("Calculation in progress... Fetching new results.");

    // Step 2: Wait a moment for the function to run, then fetch the new averages
    setTimeout(() => {
      fetchAverages();
      setMessage("Averages have been successfully updated.");
      setIsCalculating(false);
    }, 3000); // 3-second delay to allow for processing
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading Dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold">Head Teacher Dashboard</h1>
            <p className="text-gray-400 mt-2">Overseeing {school?.name}</p>
          </div>
          <SignOutButton />
        </header>

        {/* NEW: Button and message display section */}
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

        <main className="space-y-8">
          {school?.classrooms.map((classroom) => {
            const teacherAssignment =
              classroom.teacher_classroom_assignments[0];
            const teacherName = teacherAssignment?.profiles?.full_name;
            // Find the average for this specific classroom from our state
            const averageData = classAverages.find(
              (avg) => avg.classroom_id === classroom.id
            );

            return (
              <div
                key={classroom.id}
                className="bg-gray-800 shadow-lg rounded-2xl p-6"
              >
                <div className="border-b border-gray-700 pb-2 mb-4 flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-semibold">{classroom.name}</h2>
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
                  {/* Display the average score */}
                  {averageData && (
                    <div className="text-right">
                      <span className="text-sm text-gray-400 block">
                        Class Average
                      </span>
                      <span className="text-2xl font-bold text-purple-400">
                        {averageData.average_score}
                      </span>
                    </div>
                  )}
                </div>

                {/* The existing student and progress display logic remains unchanged */}
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
          })}
        </main>
      </div>
    </div>
  );
}
