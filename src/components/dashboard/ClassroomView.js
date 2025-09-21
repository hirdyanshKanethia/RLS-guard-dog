"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function ClassroomView({ initialClassrooms, schoolId }) {
  const supabase = createClient();
  const [classrooms, setClassrooms] = useState(initialClassrooms);

  const [editing, setEditing] = useState({ progressId: null, score: "" });
  const [isAdding, setIsAdding] = useState({ studentId: null });
  const [newRecord, setNewRecord] = useState({ subject: "", score: "" });
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleEditClick = (progress) => {
    setEditing({ progressId: progress.id, score: progress.score });
    setMessage({ type: "", text: "" });
  };

  const handleCancel = () => {
    setEditing({ progressId: null, score: "" });
    setIsAdding({ studentId: null });
    setNewRecord({ subject: "", score: "" });
  };

  const handleSave = async (progressId) => {
    const newScore = parseInt(editing.score, 10);
    if (isNaN(newScore) || newScore < 0 || newScore > 100) {
      setMessage({ type: "error", text: "Score must be between 0 and 100." });
      return;
    }

    const { error } = await supabase
      .from("progress")
      .update({ score: newScore })
      .eq("id", progressId);

    if (error) {
      setMessage({ type: "error", text: "Failed to update score." });
    } else {
      const updatedClassrooms = classrooms.map((c) => ({
        ...c,
        profiles: c.profiles.map((p) => ({
          ...p,
          progress: p.progress.map((prog) =>
            prog.id === progressId ? { ...prog, score: newScore } : prog
          ),
        })),
      }));
      setClassrooms(updatedClassrooms);
      setMessage({ type: "success", text: "Score updated successfully!" });
      handleCancel();
    }
  };

  const handleAddRecord = async (studentId, classroomId, schoolId) => {
    console.log("SCHOOL", schoolId);
    const newScore = parseInt(newRecord.score, 10);
    if (
      !newRecord.subject.trim() ||
      isNaN(newScore) ||
      newScore < 0 ||
      newScore > 100
    ) {
      setMessage({
        type: "error",
        text: "Please provide a valid subject and score.",
      });
      return;
    }

    const { data: insertedRecord, error } = await supabase
      .from("progress")
      .insert({
        student_id: studentId,
        classroom_id: classroomId,
        school_id: schoolId,
        subject: newRecord.subject,
        score: newScore,
      })
      .select()
      .single();

    if (error) {
      setMessage({ type: "error", text: "Failed to add record." });
      console.log("[ERROR] ", error);
    } else {
      const updatedClassrooms = classrooms.map((c) =>
        c.id === classroomId
          ? {
              ...c,
              profiles: c.profiles.map((p) =>
                p.id === studentId
                  ? { ...p, progress: [...p.progress, insertedRecord] }
                  : p
              ),
            }
          : c
      );
      setClassrooms(updatedClassrooms);
      setMessage({ type: "success", text: "Record added successfully!" });
      handleCancel();
    }
  };

  // NEW: Handler for deleting a progress record
  const handleDelete = async (progressId, studentId, classroomId) => {
    if (!window.confirm("Are you sure you want to delete this record?")) {
      return;
    }

    const { error } = await supabase
      .from("progress")
      .delete()
      .eq("id", progressId);

    if (error) {
      setMessage({ type: "error", text: "Failed to delete record." });
      console.error(error);
    } else {
      // Optimistically update UI
      const updatedClassrooms = classrooms.map((c) =>
        c.id === classroomId
          ? {
              ...c,
              profiles: c.profiles.map((p) =>
                p.id === studentId
                  ? {
                      ...p,
                      progress: p.progress.filter(
                        (prog) => prog.id !== progressId
                      ),
                    }
                  : p
              ),
            }
          : c
      );
      setClassrooms(updatedClassrooms);
      setMessage({ type: "success", text: "Record deleted successfully!" });
    }
  };

  return (
    <main className="space-y-6">
      {message.text && (
        <div
          className={`p-4 rounded-lg text-center border ${
            message.type === "error"
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-green-50 border-green-200 text-green-700"
          }`}
        >
          {message.text}
        </div>
      )}
      {classrooms.map(({ id: classroomId, name, profiles }) => (
        <div
          key={classroomId}
          className="bg-white border border-gray-200 shadow-sm rounded-lg p-6"
        >
          <h2 className="text-xl font-medium text-gray-800 mb-6 border-b border-gray-200 pb-3">
            {name}
          </h2>
          <ul className="space-y-6">
            {profiles.map((student) => (
              <li
                key={student.id}
                className="bg-gray-50 border border-gray-100 p-4 rounded-lg"
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-lg text-gray-900">
                    {student.full_name}
                  </h3>
                  {isAdding.studentId !== student.id && (
                    <button
                      onClick={() => setIsAdding({ studentId: student.id })}
                      className="bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-3 rounded-md text-sm transition-colors duration-200"
                    >
                      Add Record
                    </button>
                  )}
                </div>
                <div className="pl-4 mt-4">
                  <table className="min-w-full text-left mt-2">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="py-2 text-gray-700 font-medium">
                          Subject
                        </th>
                        <th className="py-2 text-gray-700 font-medium">
                          Score
                        </th>
                        <th className="py-2 text-right text-gray-700 font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {student.progress
                        .sort((a, b) => a.subject.localeCompare(b.subject))
                        .map((p) => (
                          <tr key={p.id} className="border-b border-gray-100">
                            <td className="py-2 text-gray-900">{p.subject}</td>
                            <td className="py-2 text-gray-900">
                              {editing.progressId === p.id ? (
                                <input
                                  type="number"
                                  value={editing.score}
                                  onChange={(e) =>
                                    setEditing({
                                      ...editing,
                                      score: e.target.value,
                                    })
                                  }
                                  className="bg-white border border-gray-300 rounded-md p-1 w-20 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              ) : (
                                p.score
                              )}
                            </td>
                            <td className="py-2 text-right">
                              {editing.progressId === p.id ? (
                                <>
                                  <button
                                    onClick={() => handleSave(p.id)}
                                    className="text-green-600 hover:text-green-700 font-medium mr-3"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancel}
                                    className="text-gray-500 hover:text-gray-600"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <div className="space-x-4">
                                  <button
                                    onClick={() => handleEditClick(p)}
                                    className="text-blue-600 hover:text-blue-700 font-medium"
                                  >
                                    Edit
                                  </button>
                                  {/* NEW: Remove Record Button */}
                                  <button
                                    onClick={() =>
                                      handleDelete(
                                        p.id,
                                        student.id,
                                        classroomId
                                      )
                                    }
                                    className="text-red-600 hover:text-red-700 font-medium"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      {isAdding.studentId === student.id && (
                        <tr className="bg-blue-50">
                          <td className="py-2">
                            <input
                              type="text"
                              placeholder="Subject"
                              value={newRecord.subject}
                              onChange={(e) =>
                                setNewRecord({
                                  ...newRecord,
                                  subject: e.target.value,
                                })
                              }
                              className="bg-white border border-gray-300 rounded-md p-1 w-full text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="number"
                              placeholder="Score"
                              value={newRecord.score}
                              onChange={(e) =>
                                setNewRecord({
                                  ...newRecord,
                                  score: e.target.value,
                                })
                              }
                              className="bg-white border border-gray-300 rounded-md p-1 w-20 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() =>
                                handleAddRecord(
                                  student.id,
                                  classroomId,
                                  schoolId
                                )
                              }
                              className="text-green-600 hover:text-green-700 font-medium mr-3"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancel}
                              className="text-gray-500 hover:text-gray-600"
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {student.progress.length === 0 &&
                    isAdding.studentId !== student.id && (
                      <p className="text-gray-500 italic text-center py-4">
                        No progress records found.
                      </p>
                    )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </main>
  );
}
