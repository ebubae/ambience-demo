import { NextResponse, NextRequest } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL as string,
  token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const statusKey = `workflow:${id}:status`;
  const status = await redis.get(statusKey);
  if (!status) {
    return NextResponse.json({
      status: "unknown",
    });
  }

  return NextResponse.json({
    status: status as string,
  });
}
