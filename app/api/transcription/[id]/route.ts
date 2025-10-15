import { NextResponse, NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import { cookies } from "next/headers";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL as string,
  token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const audioKey = `workflow:${id}:audio`;
  const transcriptionKey = `workflow:${id}:transcription`;
  const summaryKey = `workflow:${id}:summary`;

  const [audioUrl, transcriptionRaw, summaryRaw] = await Promise.all([
    redis.get(audioKey),
    redis.get(transcriptionKey),
    redis.get(summaryKey),
  ]);

  return NextResponse.json({
    audioUrl: audioUrl ?? null,
    transcription: transcriptionRaw ?? null,
    summary: summaryRaw ?? null,
  });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const audioKey = `workflow:${id}:audio`;
  const transcriptionKey = `workflow:${id}:transcription`;
  const summaryKey = `workflow:${id}:summary`;
  const statusKey = `workflow:${id}:status`;

  try {
    // delete keys
    await redis.del(audioKey, transcriptionKey, summaryKey, statusKey);

    // try to remove the workflow id from the user's list
    const cookieStore = await cookies();
    const ambienceUserId = cookieStore.get("ambience_user_id")?.value;
    if (ambienceUserId) {
      // remove all occurrences
      await redis.lrem(`user:${ambienceUserId}:workflows`, 0, id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Could not delete workflow" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const body = await req.json();
    // allow updating the summary value (rename)
    if (typeof body.summary === "string") {
      await redis.set(`workflow:${id}:summary`, body.summary);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Could not update summary" },
      { status: 500 }
    );
  }
}
