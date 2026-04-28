# Free AI Setup (OpenRouter)

This project now supports a real LLM backend for `CodeCloner AI` via `api/ai-chat.js`.

## Why this option

- OpenRouter Free Models Router supports zero-cost inference using `openrouter/free`.
- API is OpenAI-compatible and easy to use with a secure server-side key.

## 1) Add environment variables in Vercel

Set these in Project Settings -> Environment Variables:

- `OPENROUTER_API_KEY` = your OpenRouter API key
- `OPENROUTER_MODEL` = `openrouter/free` (recommended free router)
- `OPENROUTER_REFERER` = `https://code-cloner.vercel.app` (or your domain)
- `OPENROUTER_APP_TITLE` = `Code Cloner`

Only `OPENROUTER_API_KEY` is required.

## 2) Redeploy

After setting env vars, redeploy the app.

## 3) Verify

Open any page and test the AI:

- `hello`
- `what is this website`
- `find android app articles`
- `developer details`

If key is missing, client will auto-fallback to local logic.
