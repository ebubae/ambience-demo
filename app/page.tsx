"use client";
import React, { useState } from "react";
import AudioToggle from "./components/AudioToggle";
import Sidebar from "./components/Sidebar";
import WorkflowLoading from "./components/WorkflowLoading";
import TranscriptionPanel from "./transcription/TranscriptionPanel";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export default function Home() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [runningWorkflowId, setRunningWorkflowId] = useState<string | null>(
    null
  );

  return (
    <QueryClientProvider client={queryClient}>
      <div className="font-sans min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex gap-6">
            <div className="hidden md:block">
              <Sidebar onSelect={(id) => setSelectedId(id)} />
            </div>

            <main className="flex-1">
              <div className="w-full max-w-3xl">
                <div className="flex flex-col gap-6">
                  {runningWorkflowId ? (
                    <WorkflowLoading
                      workflowId={runningWorkflowId}
                      onComplete={(id) => {
                        // clear loading and select the new transcription
                        setRunningWorkflowId(null);
                        setSelectedId(id || null);
                      }}
                    />
                  ) : selectedId ? (
                    <TranscriptionPanel id={selectedId} />
                  ) : (
                    <div>
                      <h2 className="text-xl font-semibold mb-2">
                        Ambience Demo
                      </h2>
                      <div className="text-sm text-muted mb-4">
                        This demo allows you to upload, view, and save medical
                        transcription data.
                      </div>
                      <AudioToggle
                        onComplete={(id) => setRunningWorkflowId(id || null)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}
