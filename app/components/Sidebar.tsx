"use client";
import React from "react";
import SidebarMenuItem from "./SidebarMenuItem";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

async function fetchUserTranscriptions() {
  const res = await fetch("/api/userTranscriptions");
  if (!res.ok) throw new Error("Failed to fetch transcriptions");
  const json = await res.json();
  return json.workflowData || [];
}

type SidebarProps = { onSelect: (id: string | null) => void };

export default function Sidebar({ onSelect }: SidebarProps) {
  const qc = useQueryClient();
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["userTranscriptions"],
    queryFn: fetchUserTranscriptions,
  });

  const createNew = () => {
    // navigate back to the home/new transcription UI (SPA: clear selection)
    onSelect(null);
    // ensure we have a fresh list
    qc.invalidateQueries({ queryKey: ["userTranscriptions"] });
  };

  return (
    <aside className="w-72 border-r border-gray-200 dark:border-gray-800 px-4 py-6">
      <div className="mb-4">
        <div className="flex justify-start mb-2">
          <button
            onClick={createNew}
            className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 text-foreground/90 hover:bg-gray-50 dark:hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-foreground/40"
          >
            New Transcription
          </button>
        </div>
        <h3 className="text-sm font-semibold">Transcriptions</h3>
      </div>

      {isLoading ? (
        <div className="text-xs text-muted">Loading…</div>
      ) : error ? (
        <div className="text-xs text-muted">Error loading transcriptions</div>
      ) : data.length === 0 ? (
        <div className="text-xs text-muted">No transcriptions yet.</div>
      ) : (
        <ul className="space-y-2">
          {data.map((workflow: any) => (
            <li
              key={workflow.workflowId || workflow.id}
              className={`flex items-start justify-between p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900`}
            >
              <div
                onClick={() => onSelect(workflow.workflowId || workflow.id)}
                className="truncate mr-2 text-sm"
                title={workflow?.summary?.title || workflow?.workflowId}
              >
                <div className="font-medium text-sm">
                  {workflow?.summary || workflow?.workflowId || "Untitled"}
                </div>
              </div>
              <div className="relative">
                <SidebarMenuItem
                  id={workflow.workflowId || workflow.id}
                  onDeleted={() =>
                    qc.invalidateQueries({ queryKey: ["userTranscriptions"] })
                  }
                  onRenamed={() =>
                    qc.invalidateQueries({ queryKey: ["userTranscriptions"] })
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
