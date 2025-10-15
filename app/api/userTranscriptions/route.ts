import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { cookies } from "next/headers";
import OpenAI from "openai";

// Initialize Upstash Redis client using env vars (UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL as string,
  token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
});

/**
 * GET /api/userTranscriptions
 * - Reads the `ambience_user_id` cookie
 * - Looks up workflow IDs for the user in Redis
 * - Fetches transcription data for each workflow id and returns an array
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const ambienceUserId = cookieStore.get("ambience_user_id")?.value;

    if (!ambienceUserId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Common pattern: user workflows stored under a set or list key like `user:{id}:workflows`
    const userWorkflowsKey = `user:${ambienceUserId}:workflows`;

    // Try SMEMBERS first (set), fall back to LRANGE (list)
    const workflowIds = (await redis.lrange(userWorkflowsKey, 0, 32)) || [];

    // For each workflow id, attempt to fetch transcription info. We'll try a few likely keys
    const workflowData = await Promise.all(
      workflowIds.map(async (id) => {
        const transcription = (await redis.get(
          `workflow:${id}:transcription`
        )) as OpenAI.Audio.Transcriptions.TranscriptionVerbose;
        const summary = (await redis.get(`workflow:${id}:summary`)) as string;
        return { workflowId: id, transcription, summary };
      })
    );

    return NextResponse.json({ workflowData });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
