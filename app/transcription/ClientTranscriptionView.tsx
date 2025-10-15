"use client";

import React from "react";
import TranscriptionView from "./TranscriptionView";

type Props = {
  audioUrl?: string | null;
  transcription?: any;
  summary?: string | null;
};

export default function ClientTranscriptionView({
  audioUrl,
  transcription,
  summary,
}: Props) {
  return (
    <TranscriptionView
      audioUrl={audioUrl}
      transcription={transcription}
      summary={summary}
    />
  );
}
