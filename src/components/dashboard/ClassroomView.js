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
    console.log("SCHOOL", schoolId)
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
      console.log("[ERROR] ", error)
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
    <main className="space-y-8">
      {message.text && (
        <div
          className={`p-4 rounded-lg text-center ${
            message.type === "error"
              ? "bg-red-900/50 text-red-300"
              : "bg-green-900/50 text-green-300"
          }`}
        >
          {message.text}
        </div>
      )}
      {classrooms.map(({ id: classroomId, name, profiles }) => (
        <div
          key={classroomId}
          className="bg-gray-800 shadow-lg rounded-2xl p-6"
        >
          <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">
            {name}
          </h2>
          <ul className="space-y-4">
            {profiles.map((student) => (
              <li key={student.id} className="bg-gray-700 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">{student.full_name}</h3>
                  {isAdding.studentId !== student.id && (
                    <button
                      onClick={() => setIsAdding({ studentId: student.id })}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm"
                    >
                      Add Record
                    </button>
                  )}
                </div>
                <div className="pl-4 mt-2">
                  <table className="min-w-full text-left mt-2">
                    <thead>
                      <tr className="border-b border-gray-600">
                        <th className="py-2">Subject</th>
                        <th className="py-2">Score</th>
                        <th className="py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {student.progress
                        .sort((a, b) => a.subject.localeCompare(b.subject))
                        .map((p) => (
                          <tr key={p.id}>
                            <td className="py-2">{p.subject}</td>
                            <td className="py-2">
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
                                  className="bg-gray-800 rounded p-1 w-20"
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
                                    className="text-green-400 hover:text-green-300 font-semibold mr-3"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancel}
                                    className="text-gray-400 hover:text-gray-300"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <div className="space-x-4">
                                  <button
                                    onClick={() => handleEditClick(p)}
                                    className="text-purple-400 hover:text-purple-300 font-semibold"
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
                                    className="text-red-400 hover:text-red-300 font-semibold"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      {isAdding.studentId === student.id && (
                        <tr className="bg-gray-600/50">
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
                              className="bg-gray-800 rounded p-1 w-full"
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
                              className="bg-gray-800 rounded p-1 w-20"
                            />
                          </td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() =>
                                handleAddRecord(student.id, classroomId, schoolId)
                              }
                              className="text-green-400 hover:text-green-300 font-semibold mr-3"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancel}
                              className="text-gray-400 hover:text-gray-300"
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
                      <p className="text-gray-400 italic text-center py-4">
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
