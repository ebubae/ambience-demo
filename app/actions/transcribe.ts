"use server";

import { Client } from "@upstash/workflow";
import { cookies } from "next/headers";
import { utapi } from "../api/uploadthing/core";
import { Redis } from "@upstash/redis";

const client = new Client({ token: process.env.QSTASH_TOKEN });
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const BASE_URL =
  process.env.NODE_ENV === "production"
    ? `https://${process.env.VERCEL_URL}`
    : `http://localhost:3000`;

export async function transcribeAction(
  files?: File[] | null,
  recordedBlob?: Blob | null
) {
  const cookieStore = await cookies();
  const ambienceUserId = cookieStore.get("ambience_user_id")?.value;

  const payload: File[] = files || [];

  if (!files && !recordedBlob) {
    return { error: "No audio provided" };
  }

  if (recordedBlob) {
    const recordingFile = new File([recordedBlob], `${ambienceUserId}.mp3`);
    payload.push(recordingFile);
  }

  const fileUris = await Promise.all(
    payload.map(async (file) => {
      const uploadedFile = await utapi.uploadFiles(file);
      // TODO: handle upload errors
      return uploadedFile.data?.ufsUrl;
    })
  );

  const { workflowRunId } = await client.trigger({
    url: `${BASE_URL}/api/transcribe`,
    body: {
      ambience_user_id: ambienceUserId,
      payload: fileUris,
    },
    retries: 3,
    retryDelay: "1000 * pow(2, retried)",
    flowControl: {
      key: ambienceUserId || "anonymous",
      rate: 10,
      parallelism: 2,
      period: "1m",
    },
  });

  await redis.lpush(`user:${ambienceUserId}:workflows`, workflowRunId);
  await redis.set(`workflow:${workflowRunId}:status`, "Processing audio...");
  return { workflowRunId };
}
