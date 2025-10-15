import { serve } from "@upstash/workflow/nextjs";
import { exec } from "child_process";
import { promisify } from "util";
import { readFile } from "fs/promises";
import { utapi } from "../uploadthing/core";
import { createWriteStream, createReadStream } from "fs";
import OpenAI from "openai";
import axios from "axios";
import { Redis } from "@upstash/redis";

const execPromise = promisify(exec);
const openai = new OpenAI();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL as string,
  token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
});

// TODO: delete all the downloaded files after processing

export const { POST } = serve(async (context) => {
  const mergedFilePath = `merged-${context.workflowRunId}.mp3`;
  const mergedUrl = await context.run(
    "merge audio files and upload",
    async () => {
      const body = context.requestPayload;

      // @ts-expect-error
      const fileUris: string[] = body?.payload;
      const workflowRunId = context.workflowRunId;
      const inputArgs = fileUris.map((url) => `-i "${url}"`).join(" ");
      const streamInputs = fileUris.map((_, i) => `[${i}:a]`).join("");
      const cmd = `ffmpeg ${inputArgs} -filter_complex "${streamInputs}concat=n=${fileUris.length}:v=0:a=1[a]" -map "[a]" -acodec libmp3lame -q:a 2 "${mergedFilePath}" -y`;
      console.log("Running:", cmd);
      const { stdout, stderr } = await execPromise(cmd);

      if (stderr) {
        console.error(`FFmpeg failed: ${stderr}`);
      }
      if (stdout) {
        console.log(stdout);
        console.log(`✅ Merged audio saved to ${mergedFilePath}`);
      }

      const outputFile = await readFile(mergedFilePath);
      // @ts-expect-error
      const mergedAudio = new File([outputFile], mergedFilePath, {
        type: "audio/mpeg",
      });
      console.log("Uploading merged audio...");
      const uploadedFile = await utapi.uploadFiles(mergedAudio);
      console.log("Uploaded merged audio:", uploadedFile);
      console.log("mergedUrl", uploadedFile.data?.ufsUrl!);
      const merged = uploadedFile.data?.ufsUrl!;

      await redis.set(`workflow:${workflowRunId}:audio`, merged);
      await redis.set(
        `workflow:${workflowRunId}:status`,
        "Running AI tasks..."
      );
      return merged;
    }
  );
  const transcriptionPromise = context.run(
    "generate transcription and save",
    async () => {
      await downloadAudio(mergedUrl, mergedFilePath);

      const transcription = await openai.audio.transcriptions.create({
        file: createReadStream(mergedFilePath),
        model: "whisper-1",
        response_format: "verbose_json",
        timestamp_granularities: ["word"],
      });
      console.log(transcription);
      console.log(transcription.text);
      await redis.set(
        `workflow:${context.workflowRunId}:transcription`,
        transcription
      );
    }
  );
  const summaryPromise = context.run("run summary agent", async () => {
    const audioResponse = await fetch(mergedUrl);
    const buffer = await audioResponse.arrayBuffer();
    const base64str = Buffer.from(buffer).toString("base64");

    const summary = await openai.chat.completions.create({
      model: "gpt-4o-audio-preview",
      modalities: ["text"],
      messages: [
        {
          role: "system",
          content:
            "You are a part of a system that summarizes audio files into extremely short titles.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Summarize the following audio in no more than 10 words. This should be a title-like summary, not a full sentence summary.",
            },
            {
              type: "input_audio",
              input_audio: { data: base64str, format: "mp3" },
            },
          ],
        },
      ],
    });
    const summaryText = summary.choices[0].message?.content || "No summary";
    console.log("Generated summary:", summaryText);
    await redis.set(`workflow:${context.workflowRunId}:summary`, summaryText);
  });

  await Promise.all([transcriptionPromise, summaryPromise]);
  await context.run("Complete workflow", async () => {
    await redis.set(`workflow:${context.workflowRunId}:status`, "Complete");
  });
});

async function downloadAudio(url: string, outputPath: string): Promise<void> {
  const response = await axios({
    method: "get",
    url: url,
    responseType: "stream",
  });

  const writer = createWriteStream(outputPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}
