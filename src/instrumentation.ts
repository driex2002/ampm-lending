/**
 * Next.js Instrumentation Hook
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * This file runs once when the Next.js server starts (Node.js runtime only).
 * It is the correct place to start long-lived background processes such as
 * schedulers, because it runs outside the React/RSC request cycle and is
 * guaranteed to execute before the first request is handled.
 */
export async function register() {
  // Only run in the Node.js runtime (not in the Edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("@/lib/scheduler");
    startScheduler();
  }
}
