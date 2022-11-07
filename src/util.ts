import { RATE_LIMIT_DELAY, RATE_LIMIT_DELAY_PR } from './constants';

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForRateLimit(): Promise<void> {
  await sleep(RATE_LIMIT_DELAY);
}

export async function waitForPullRequestRateLimit(): Promise<void> {
  await sleep(RATE_LIMIT_DELAY_PR);
}
