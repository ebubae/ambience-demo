"use client";
import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  id: string;
  onDeleted: () => void;
  onRenamed: () => void;
};

export default function SidebarMenuItem({ id, onDeleted, onRenamed }: Props) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const deleteItem = async () => {
    if (!confirm("Delete this transcription? This action cannot be undone."))
      return;
    try {
      const res = await fetch(`/api/transcription/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setOpen(false);
      // optimistically remove from cache
      try {
        qc.setQueryData(["userTranscriptions"], (old: any) =>
          // @ts-expect-error
          old.filter((workflow) => workflow?.workflowId !== id)
        );
      } catch (e) {}
      onDeleted();
    } catch (e) {
      console.error(e);
      alert("Could not delete transcription");
    }
  };

  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const saveRename = async () => {
    if (!newTitle || newTitle.trim().length === 0) return;

    // snapshot current cache for rollback
    const previous = qc.getQueryData(["userTranscriptions"]);

    // optimistic update: set new summary locally
    try {
      qc.setQueryData(["userTranscriptions"], (old: any) => {
        if (!Array.isArray(old)) return old;
        return (old as any[]).map((workflow) =>
          workflow?.workflowId === id
            ? { ...workflow, summary: newTitle }
            : workflow
        );
      });

      // close dropdown immediately to reflect saved state
      setOpen(false);
      setRenaming(false);

      const res = await fetch(`/api/transcription/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ summary: newTitle }),
      });

      if (!res.ok) throw new Error("Rename failed");

      onRenamed();
    } catch (e) {
      console.error(e);
      // rollback
      try {
        qc.setQueryData(["userTranscriptions"], previous as any);
      } catch (err) {}
      alert("Could not rename transcription");
    }
  };

  const cancelRename = () => {
    setRenaming(false);
    setNewTitle("");
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen((s) => !s)}
        aria-expanded={open}
        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        title="More"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted"
        >
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-lg z-10 p-2">
          {!renaming ? (
            <div className="flex flex-col">
              <button
                onClick={() => {
                  setRenaming(true);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Rename
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  deleteItem();
                }}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Delete
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="New title"
                className="px-2 py-1 rounded bg-gray-50 dark:bg-gray-700 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveRename();
                  if (e.key === "Escape") cancelRename();
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => saveRename()}
                  className="px-2 py-1 text-sm bg-foreground text-background rounded"
                >
                  Save
                </button>
                <button
                  onClick={() => cancelRename()}
                  className="px-2 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
