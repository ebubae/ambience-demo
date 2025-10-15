"use client";
import React, { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type Props = {
  workflowId: string;
  onComplete: (workflowId?: string) => void;
};

type StatusResp = { status: string };

async function fetchStatus(id: string): Promise<StatusResp> {
  const res = await fetch(`/api/status/${id}`);
  if (!res.ok) throw new Error("Failed to fetch status");
  return res.json();
}

export default function WorkflowLoading({ workflowId, onComplete }: Props) {
  const qc = useQueryClient();

  const completedRef = useRef(false);
  const [pollingEnabled, setPollingEnabled] = useState(true);

  const { data, isLoading, error } = useQuery<StatusResp>({
    queryKey: ["status", workflowId],
    queryFn: () => fetchStatus(workflowId),
    refetchInterval: 2000,
    enabled: pollingEnabled,
  });

  useEffect(() => {
    if (!data || completedRef.current) return;
    const status = String(data.status || "").toLowerCase();
    if (status === "complete" || status === "completed") {
      completedRef.current = true;
      setPollingEnabled(false);
      try {
        qc.invalidateQueries({ queryKey: ["userTranscriptions"] });
      } catch (e) {
        // ignore
      }
      onComplete(workflowId);
    }
  }, [data, workflowId, onComplete, qc]);

  return (
    <div className="w-full max-w-2xl mx-auto bg-white/40 dark:bg-black/30 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-medium mb-2">Transcription in progress</h3>
      <div className="text-sm text-muted mb-4">
        We're processing your audio. This view will update with live status
        messages.
      </div>

      <div className="rounded border p-3 bg-white/60 dark:bg-black/40">
        <div className="text-xs text-muted mb-2">Live status</div>
        <ul className="list-disc pl-5 space-y-1 text-sm">{data?.status}</ul>
      </div>
    </div>
  );
}
