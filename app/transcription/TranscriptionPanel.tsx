"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import ClientTranscriptionView from "./ClientTranscriptionView";

async function fetchTranscription(id: string) {
  const res = await fetch(`/api/transcription/${id}`);
  if (!res.ok) throw new Error("Failed to fetch transcription");
  return res.json();
}

type Props = { id: string };

export default function TranscriptionPanel({ id }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["transcription", id],
    queryFn: () => fetchTranscription(id),
  });

  if (isLoading) return <div>Loading…</div>;
  if (error) return <div>Error loading transcription</div>;

  return (
    <div>
      <ClientTranscriptionView
        audioUrl={data.audioUrl}
        transcription={data.transcription}
        summary={data.summary}
      />
    </div>
  );
}
