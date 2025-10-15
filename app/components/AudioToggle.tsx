"use client";
import React, { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { transcribeAction } from "../actions/transcribe";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

type Mode = "upload" | "record";

type Props = {
  onComplete?: (workflowId?: string) => void;
};

export default function AudioToggle({ onComplete }: Props) {
  const [mode, setMode] = useState<Mode>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const qc = useQueryClient();

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;
    const arr = Array.from(list);
    // append to existing files
    setFiles((prev) => [...prev, ...arr]);
    setAudioUrl(null);
  };

  const onDropFiles = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setAudioUrl(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/mp3" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setRecordedBlob(blob);
        // stop all tracks
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);
    } catch (err) {
      console.error(err);
      alert("Could not access microphone. Check permissions and try again.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const clearAll = () => {
    setFiles([]);
    setAudioUrl(null);
    setRecordedBlob(null);
    setTranscription(null);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const src = result.source.index;
    const dest = result.destination.index;
    setFiles((prev) => {
      const copy = Array.from(prev);
      const [moved] = copy.splice(src, 1);
      copy.splice(dest, 0, moved);
      return copy;
    });
  };

  const transcribe = async () => {
    setTranscription(null);
    setTranscribing(true);
    try {
      // Call the server action to perform transcription
      const result = await transcribeAction(
        files.length ? files : null,
        recordedBlob
      );
      if (!result) {
        setTranscription("No response from server");
      } else if ((result as any).error) {
        setTranscription(String((result as any).error));
      } else if ((result as any).workflowRunId) {
        const workflowId = String((result as any).workflowRunId);
        // notify parent that a workflow has started so it can render the loading view
        try {
          onComplete?.(workflowId);
        } catch (e) {
          console.error("onComplete handler error", e);
        }
        setTranscription(JSON.stringify(result));
      } else if ((result as any).body) {
        const body = (result as any).body;
        if (body?.text) {
          const txt = body.text;
          setTranscription(txt);
          // notify react-query to refetch the user's transcriptions
          try {
            // if we have a queryClient, invalidate the list so the new transcription appears
            if (qc && typeof qc.invalidateQueries === "function") {
              qc.invalidateQueries({ queryKey: ["userTranscriptions"] });
            } else if (typeof window !== "undefined") {
              // fallback: simple refetch by hitting the endpoint (best-effort)
              fetch("/api/userTranscriptions");
            }
            onComplete?.();
          } catch (e) {
            console.error("Could not update transcriptions cache", e);
          }
        } else if (body?.error) setTranscription(String(body.error));
        else setTranscription(JSON.stringify(body));
      } else {
        setTranscription(JSON.stringify(result));
      }
    } catch (err) {
      setTranscription(String(err));
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white/40 dark:bg-black/30 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-center mb-4">
        <div className="inline-flex rounded-full bg-gray-200 dark:bg-gray-800 p-1">
          <button
            onClick={() => setMode("upload")}
            aria-pressed={mode === "upload"}
            className={`px-4 py-2 rounded-full transition-colors text-sm font-medium ${
              mode === "upload"
                ? "bg-foreground text-background"
                : "text-gray-700 dark:text-gray-200"
            }`}
          >
            Upload
          </button>
          <button
            onClick={() => setMode("record")}
            aria-pressed={mode === "record"}
            className={`ml-2 px-4 py-2 rounded-full transition-colors text-sm font-medium ${
              mode === "record"
                ? "bg-foreground text-background"
                : "text-gray-700 dark:text-gray-200"
            }`}
          >
            Record
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        {mode === "upload" ? (
          <div className="flex flex-col items-center gap-3 w-full">
            <input
              id="audio-files"
              type="file"
              accept="audio/*"
              multiple
              onChange={handleFiles}
              className="hidden"
            />
            <label
              htmlFor="audio-files"
              className="cursor-pointer rounded-md px-4 py-2 bg-foreground text-background"
            >
              Choose audio files
            </label>

            <div className="w-full">
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="files-droppable">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="mt-3"
                    >
                      <div
                        className="w-full border-dashed border-2 rounded p-6 text-center"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const dt = e.dataTransfer;
                          if (!dt) return;
                          const dropped = Array.from(dt.files).filter((f) =>
                            f.type.startsWith("audio/")
                          );
                          if (dropped.length) onDropFiles(dropped);
                        }}
                      >
                        <div className="text-sm mb-2">
                          Drop audio files here
                        </div>

                        {files.length === 0 && (
                          <div className="text-xs text-muted">
                            Or click "Choose audio files" to pick files.
                          </div>
                        )}

                        {files.length > 0 && (
                          <>
                            <div className="text-sm mb-2">
                              Selected files ({files.length}):
                            </div>

                            <ul className="list-none p-0 space-y-2">
                              {files.map((f, i) => (
                                <Draggable
                                  key={i}
                                  draggableId={`${i}-${f.name}`}
                                  index={i}
                                >
                                  {(dragProvided, snapshot) => (
                                    <li
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      {...dragProvided.dragHandleProps}
                                      className={`flex items-center justify-between rounded p-2 bg-white/80 dark:bg-black/60 border ${
                                        snapshot.isDragging
                                          ? "ring-2 ring-offset-2"
                                          : ""
                                      }`}
                                    >
                                      <div className="truncate text-sm">
                                        {f.name} — {(f.size / 1024).toFixed(1)}{" "}
                                        KB
                                      </div>
                                      <div className="ml-3">
                                        <button
                                          onClick={() =>
                                            setFiles((prev) =>
                                              prev.filter((_, idx) => idx !== i)
                                            )
                                          }
                                          className="text-xs px-2 py-1 rounded bg-gray-200"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </li>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </ul>

                            <div className="mt-3 w-full">
                              {/* Preview first file */}
                              {files[0] && (
                                <audio
                                  controls
                                  src={URL.createObjectURL(files[0])}
                                  className="w-full"
                                />
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              <div className="flex gap-2 mt-3 justify-center">
                <button
                  onClick={clearAll}
                  className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-black text-sm"
                >
                  Clear
                </button>
                <button
                  onClick={transcribe}
                  disabled={
                    transcribing || (files.length === 0 && !recordedBlob)
                  }
                  className="px-3 py-1 rounded bg-foreground text-background text-sm ml-2 disabled:opacity-60"
                >
                  {transcribing ? "Transcribing..." : "Transcribe"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="text-sm">Record audio from your microphone</div>
            <div className="flex gap-2 justify-center">
              {!recording ? (
                <button
                  onClick={startRecording}
                  className="px-4 py-2 rounded bg-red-600 text-white"
                >
                  Start
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="px-4 py-2 rounded bg-gray-200 text-black"
                >
                  Stop
                </button>
              )}
              <button
                onClick={clearAll}
                className="px-3 py-1 rounded bg-gray-200 text-black text-sm"
              >
                Clear
              </button>
              <button
                onClick={transcribe}
                disabled={transcribing}
                className="px-3 py-1 rounded bg-foreground text-background text-sm ml-2 disabled:opacity-60"
              >
                {transcribing ? "Transcribing..." : "Transcribe"}
              </button>
            </div>

            {audioUrl && (
              <div className="w-full mt-3">
                <audio controls src={audioUrl} className="w-full" />
              </div>
            )}
            {transcription && (
              <div className="w-full mt-3 rounded border p-3 bg-white/60 dark:bg-black/40">
                <div className="text-xs text-muted mb-1">Transcription</div>
                <div className="text-sm whitespace-pre-wrap">
                  {transcription}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
