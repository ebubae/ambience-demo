## To view this project locally:

1. Install project requirements with `pnpm install`
2. Run the Next JS local dev server with `pnpm dev`
3. Get a set of QStash [credentials](https://upstash.com/docs/workflow/quickstarts/vercel-nextjs#step-3%3A-configure-environment-variables)
4. Run the QStash local server with `npx @upstash/qstash-cli dev`
5. Open the project at `localhost:3000`

## To run transcriptions:

The following env variables need to be set in `.env.local`

1. Get a set of QStash [credentials](https://upstash.com/docs/workflow/quickstarts/ and set the `QSTASH_URL`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, and `QSTASH_NEXT_SIGNING_KEY`
2. Get an OpenAI [API key](https://platform.openai.com/api-keys) and set `OPENAI_API_KEY`
3. Get an uploadthing [token](https://docs.uploadthing.com/getting-started/appdir) and set `UPLOADTHING_TOKEN`
4. Set the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` by setting up your [Upstash account](https://upstash.com/docs/redis/quickstarts/nextjs-app-router#2-connect-to-redis). You probably already have an account since we're also using QStash

**Please note: you must have ffmpeg installed on your computer.**

See you all at the interview!
