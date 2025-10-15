"use client";

import React, { useEffect, useRef, useState } from "react";

type Word = {
  word: string;
  start?: number;
  end?: number;
};

type Props = {
  audioUrl?: string | null;
  transcription?: any;
  summary?: string | null;
};

export default function TranscriptionView({
  audioUrl,
  transcription,
  summary,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentWordIdx, setCurrentWordIdx] = useState<number | null>(null);

  const words: Word[] = (transcription && transcription.words) || [];

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const handler = () => {
      const t = a.currentTime;
      if (!words || words.length === 0) return setCurrentWordIdx(null);
      // find last word with start <= t
      let idx = -1;
      for (let i = 0; i < words.length; i++) {
        const s = Number(words[i].start ?? NaN);
        const e = Number(words[i].end ?? NaN);
        if (!isFinite(s)) continue;
        if (t >= s && (isFinite(e) ? t < e : true)) {
          idx = i;
          break;
        }
      }
      setCurrentWordIdx(idx === -1 ? null : idx);
    };

    a.addEventListener("timeupdate", handler);
    return () => a.removeEventListener("timeupdate", handler);
  }, [words]);

  const seekTo = (start?: number) => {
    if (!audioRef.current || start === undefined || start === null) return;
    audioRef.current.currentTime = Number(start);
    // keep play state intuitive: play after seek
    audioRef.current.play().catch(() => {});
  };

  return (
    <div>
      {"summary" in Object(transcription) ? null : null}
      <div className="mb-4">
        <div className="mb-3">
          <h1 className="text-3xl font-bold text-white">{summary}</h1>
        </div>

        {audioUrl ? (
          <audio
            ref={audioRef}
            controls
            src={String(audioUrl)}
            className="w-full"
          />
        ) : (
          <div className="text-sm text-muted">No audio available.</div>
        )}
      </div>

      <div className="mb-3">
        <h3 className="text-sm font-medium mb-2 text-white">
          Transcription text
        </h3>

        {transcription && transcription.text ? (
          <div className="break-words text-white text-2xl leading-relaxed">
            {words && words.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {words.map((w, i) => (
                  <button
                    key={i}
                    onClick={() => seekTo(Number(w.start ?? 0))}
                    className={`text-xl px-3 py-2 rounded-md transition-colors focus:outline-none shadow-sm min-w-[48px] flex items-center justify-center ${
                      currentWordIdx === i
                        ? "bg-yellow-400 text-black ring-2 ring-yellow-300"
                        : "bg-white/6 text-white hover:bg-white/20"
                    }`}
                    title={
                      w.start !== undefined
                        ? `Seek to ${w.start.toFixed(2)}s`
                        : undefined
                    }
                  >
                    {w.word}
                  </button>
                ))}
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-white text-2xl">
                {transcription.text}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted">
            No transcription text available.
          </div>
        )}
      </div>
    </div>
  );
}
