"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Memory = {
  id: string;
  content: string;
  category: string;
  createdAt?: string;
  updatedAt?: string;
};

const categories = [
  "general",
  "preference",
  "project",
  "personal",
];

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadMemories() {
    try {
      const response = await fetch("/api/memories", {
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load memories.",
        );
      }

      setMemories(
        Array.isArray(data.memories)
          ? data.memories
          : [],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load memories.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMemories();
  }, []);

  function resetForm() {
    setContent("");
    setCategory("general");
    setEditingId(null);
    setError("");
  }

  async function saveMemory() {
    const value = content.trim();

    if (!value) {
      setError("Memory content is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = editingId
        ? `/api/memories/${editingId}`
        : "/api/memories";

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: value,
          category,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to save memory.",
        );
      }

      if (editingId) {
        setMemories((current) =>
          current.map((memory) =>
            memory.id === editingId
              ? data.memory
              : memory,
          ),
        );
      } else {
        setMemories((current) => [
          ...current,
          data.memory,
        ]);
      }

      resetForm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save memory.",
      );
    } finally {
      setSaving(false);
    }
  }

  function editMemory(memory: Memory) {
    setEditingId(memory.id);
    setContent(memory.content);
    setCategory(memory.category);
    setError("");
  }

  async function deleteMemory(id: string) {
    if (!window.confirm("Delete this memory?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/memories/${id}`,
        {
          method: "DELETE",
        },
      );

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error || "Unable to delete memory.",
        );
      }

      setMemories((current) =>
        current.filter((memory) => memory.id !== id),
      );

      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete memory.",
      );
    }
  }

  return (
    <main className="cosmos min-h-dvh bg-[#050713] p-5 text-white">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-slate-400 transition hover:text-white"
          >
            ← Back to Neurai
          </Link>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#0c1020]/90 p-7 shadow-2xl">
          <h1 className="text-2xl font-semibold">
            Memory
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Memories are linked to your Neurai account.
          </p>

          <div className="mt-8 space-y-4">
            <textarea
              value={content}
              onChange={(event) =>
                setContent(event.target.value.slice(0, 1000))
              }
              placeholder="What should Neurai remember?"
              rows={4}
              className="w-full resize-none rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
            />

            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={
                    (category === item
                      ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300 "
                      : "border-white/10 bg-white/[.03] text-slate-400 ") +
                    "rounded-lg border px-3 py-2 text-xs capitalize"
                  }
                >
                  {item}
                </button>
              ))}
            </div>

            {error && (
              <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveMemory}
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update memory"
                    : "Save memory"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="px-1 text-sm font-semibold text-slate-400">
            Saved memories
          </h2>

          {loading ? (
            <div className="rounded-xl border border-white/10 bg-[#0c1020]/80 p-5 text-sm text-slate-500">
              Loading memories...
            </div>
          ) : memories.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-[#0c1020]/80 p-5 text-sm text-slate-500">
              No memories yet.
            </div>
          ) : (
            memories.map((memory) => (
              <div
                key={memory.id}
                className="rounded-xl border border-white/10 bg-[#0c1020]/80 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="rounded-md bg-white/[.05] px-2 py-1 text-[10px] uppercase tracking-wider text-slate-500">
                      {memory.category}
                    </span>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                      {memory.content}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => editMemory(memory)}
                      className="rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteMemory(memory.id)}
                      className="rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
