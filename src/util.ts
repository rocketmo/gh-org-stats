import { RATE_LIMIT_DELAY } from './constants';

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForRateLimit(): Promise<void> {
  await sleep(RATE_LIMIT_DELAY);
}
