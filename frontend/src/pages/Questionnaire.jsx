import { useState, useEffect } from "react";
import { Plus, Trash2, FileSpreadsheet, Download, RefreshCw } from "lucide-react";
import PageHeader from "../components/PageHeader";

export default function Questionnaire() {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingQuestions, setSavingQuestions] = useState(false);

  const API_BASE = window.location.origin;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [qRes, rRes] = await Promise.all([
        fetch(`${API_BASE}/api/questions`),
        fetch(`${API_BASE}/api/lead-responses`)
      ]);
      const qData = await qRes.json();
      const rData = await rRes.json();
      setQuestions(qData);
      setResponses(rData);
    } catch (err) {
      console.error("Failed to load questionnaire data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddQuestion = async () => {
    if (!newQuestion.trim()) return;
    const updated = [...questions, newQuestion.trim()];
    setQuestions(updated);
    setNewQuestion("");
    await saveQuestions(updated);
  };

  const handleDeleteQuestion = async (index) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    await saveQuestions(updated);
  };

  const saveQuestions = async (updatedList) => {
    setSavingQuestions(true);
    try {
      await fetch(`${API_BASE}/api/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedList)
      });
    } catch (err) {
      alert("Failed to save questions: " + err.message);
    } finally {
      setSavingQuestions(false);
    }
  };

  const handleExportCSV = () => {
    if (responses.length === 0) return;
    const headers = ["Timestamp", "Lead Phone", "Question Asked", "Response / Answer"];
    const rows = responses.map((r) => [
      new Date(r.created_at).toLocaleString(),
      r.policyholder_phone || "Web Call",
      r.question,
      r.answer
    ]);

    const csvContent = 
      "data:text/csv;charset=utf-8," + 
      [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Lead_Responses_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pb-12">
      <PageHeader 
        title="Lead Questionnaire CRM" 
        subtitle="Manage questions asked during voice calls and view recorded answers as a spreadsheet grid"
        action={
          <div className="flex gap-2">
            <button 
              onClick={fetchData}
              className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl transition-all cursor-pointer border border-gray-200"
            >
              <RefreshCw size={15} /> Refresh
            </button>
            <button 
              onClick={handleExportCSV}
              disabled={responses.length === 0}
              className="flex items-center gap-1.5 bg-[var(--color-trust)] disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-sm disabled:cursor-not-allowed"
            >
              <Download size={15} /> Export CSV
            </button>
          </div>
        }
      />

      <div className="px-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Side: Question List Config */}
        <div className="card p-5 xl:col-span-1 h-fit">
          <h3 className="font-semibold text-[15px] text-[var(--color-ink)] mb-1">AI Questionnaire Flow</h3>
          <p className="text-xs text-[var(--color-muted)] mb-4">
            These questions will be asked sequentially by the AI agent during the call to gather details.
          </p>

          <div className="space-y-2 mb-4">
            {questions.map((q, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-gray-50 border border-[var(--color-border)] rounded-xl text-sm">
                <span className="font-medium text-gray-700 flex-1">{q}</span>
                <button 
                  onClick={() => handleDeleteQuestion(idx)}
                  className="text-gray-400 hover:text-[var(--color-danger)] transition-colors cursor-pointer p-1"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {questions.length === 0 && (
              <div className="text-sm text-[var(--color-muted)] italic text-center py-4">No active questions.</div>
            )}
          </div>

          <div className="flex gap-2">
            <input 
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Add new question..."
              className="flex-1 px-3 py-2 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:border-[var(--color-trust)] bg-white"
            />
            <button 
              onClick={handleAddQuestion}
              disabled={savingQuestions}
              className="bg-[var(--color-trust)] text-white p-2.5 rounded-xl hover:opacity-90 transition-all cursor-pointer flex items-center justify-center"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Right Side: Excel-like Response Table */}
        <div className="xl:col-span-2 space-y-4">
          <div className="card p-5 overflow-hidden">
            <h3 className="font-semibold text-[15px] text-[var(--color-ink)] mb-1 flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-emerald-600" /> Recorded Responses Grid
            </h3>
            <p className="text-xs text-[var(--color-muted)] mb-4">
              Spreadsheet view of all information extracted and saved by the AI during live calls.
            </p>

            {loading ? (
              <div className="text-center py-12 text-sm text-[var(--color-muted)]">Loading responses...</div>
            ) : (
              <div className="overflow-x-auto border border-gray-150 rounded-xl">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs text-[var(--color-muted)] font-medium border-b border-gray-150">
                      <th className="px-4 py-3 font-semibold border-r border-gray-150">Timestamp</th>
                      <th className="px-4 py-3 font-semibold border-r border-gray-150">Lead / Phone</th>
                      <th className="px-4 py-3 font-semibold border-r border-gray-150">Question Asked</th>
                      <th className="px-4 py-3 font-semibold">Response / Answer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map((r, idx) => (
                      <tr key={r.id || idx} className="border-b border-gray-150 hover:bg-gray-50 last:border-b-0">
                        <td className="px-4 py-2.5 border-r border-gray-150 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 border-r border-gray-150 font-medium text-gray-700 whitespace-nowrap">
                          {r.policyholder_phone || "Web Call"}
                        </td>
                        <td className="px-4 py-2.5 border-r border-gray-150 text-xs text-gray-600 font-mono">
                          {r.question}
                        </td>
                        <td className="px-4 py-2.5 text-gray-800 bg-emerald-50/20 font-medium">
                          {r.answer}
                        </td>
                      </tr>
                    ))}
                    {responses.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-sm text-[var(--color-muted)] italic">
                          No responses captured yet. Trigger calls to populate this spreadsheet!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
