# AI Diet Assistant

A full-stack prototype for dietary profile collection, AI-assisted meal planning, meal feedback, health records, and reminders. The interface is primarily in Chinese.

## Stack

Next.js, React, TypeScript, NextAuth credentials authentication, Prisma with SQLite, Tailwind CSS, and DeepSeek through the OpenAI-compatible SDK.

## Local setup

Use a Node.js version compatible with the locked Next.js release (20.9 or newer).

1. Run `npm ci`.
2. Copy `.env.example` to `.env`. This filename lets both Next.js and the Prisma CLI read the configuration.
3. Generate a fresh authentication secret locally:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Paste the generated value into `NEXTAUTH_SECRET` in `.env`. Do not share it or commit it.
4. Set `DEEPSEEK_API_KEY` to a new key from your DeepSeek account. The code uses `https://api.deepseek.com` and `deepseek-chat`, despite the historical filename `src/lib/claude.ts`.
5. Run `npm run db:generate`, then `npm run db:push` to create a fresh database.
6. Run `npm run dev` and open `http://localhost:3000`. Register a new test account; no existing accounts or records are included.

No working API key or authentication secret is included. Configure both before running. AI routes currently construct their client during module loading, so an absent API key can cause initialization errors; an offline/demo mode is not implemented.

## Status and limitations

This is a prototype, not a production medical application. The presence of validation and safety-related code does not establish clinical accuracy. AI responses and generated plans need review. Reminder records do not by themselves establish a working background notification service.

## Configuration and data

No API keys, authentication secrets, local databases, or user records are included. Keep local environment files out of version control. AI features require a configured DeepSeek key.

This repository is an early prototype. Dependency installation, production builds, and live AI requests have not been verified as part of preparing this public repository.
