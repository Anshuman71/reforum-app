# Reforum

Reforum is a self-hosted, single-community forum starter kit built with Next.js, Hono, Drizzle, Better Auth, and adapter-based infrastructure.

## Email Adapter

The default local configuration uses `noopEmailAdapter()`, so auth emails are intentionally not sent until a provider adapter is configured.

The email boundary lives in `src/server/adapters/email`:

- `sendEmail(params)` is the shared utility for transactional email.
- `noopEmailAdapter()` is the development/default adapter.
- `resendEmailAdapter()` is the Resend adapter blueprint.
- Verification and password-reset email helpers are wired into Better Auth through `src/server/adapters/email/auth.ts`.

## Resend Environment Variables

To use the Resend adapter, configure these environment variables:

```bash
RESEND_API_KEY="re_..."
EMAIL_FROM="Reforum <hello@example.com>"
```

`RESEND_API_KEY` is the API key from Resend. `EMAIL_FROM` must use a sender/domain verified in Resend.

Then update `reforum.config.ts` to use the Resend adapter:

```ts
import { resendEmailAdapter } from "@/server/adapters/email/resend";
import { getResendEmailEnvs } from "@/server/lib/envs";

const resendEnvs = getResendEmailEnvs();

export default defineConfig({
  // ...
  email: resendEmailAdapter({
    apiKey: resendEnvs.RESEND_API_KEY,
    defaultFrom: resendEnvs.EMAIL_FROM,
  }),
});
```

Self-hosters can implement their own provider by returning an `EmailAdapter` with a `sendEmail` method.
