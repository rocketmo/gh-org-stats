import dotenv from 'dotenv';
import { OrgDataAggregator } from './src/aggregator/OrgDataAggregator';
import { OrgDataClient } from './src/gql/OrgDataClient';
import { OrgDataExporter } from './src/exporter/OrgDataExporter';
import { waitForRateLimit } from './src/util';

dotenv.config();
main();

async function main(): Promise<void> {
  const client = new OrgDataClient(process.env.PAT);
  const aggregator = new OrgDataAggregator();

  await aggregateRepoData(client, aggregator);
  await aggregateUserData(client, aggregator);
  await aggregateCommitData(client, aggregator);
  await aggregatePullRequestData(client, aggregator);

  const exporter = new OrgDataExporter(aggregator);
  await exporter.exportRepoData();
  await exporter.exportUserData();
  await exporter.exportUserByRepoData();

  console.log('DONE!');
}

async function aggregateRepoData(
  client: OrgDataClient,
  aggregator: OrgDataAggregator,
): Promise<void> {
  const repos = await client.getRepos({ org: process.env.ORG });
  aggregator.aggregateRepos(repos);
  console.log(`Aggregated ${repos.length} repo(s).`);

  await waitForRateLimit();
}

async function aggregateUserData(
  client: OrgDataClient,
  aggregator: OrgDataAggregator,
): Promise<void> {
  const users = await client.getUsers({ org: process.env.ORG });
  aggregator.aggregateUsers(users);
  console.log(`Aggregated ${users.length} user(s).`);

  await waitForRateLimit();
}

async function aggregateCommitData(
  client: OrgDataClient,
  aggregator: OrgDataAggregator,
): Promise<void> {
  for (const repoName of aggregator.getRepoNames()) {
    const commits = await client.getCommits({
      org: process.env.ORG,
      repo: repoName,
      startDate: process.env.START_DATE,
      endDate: process.env.END_DATE,
    });

    aggregator.aggregateCommits(commits);
    console.log(`Aggregated ${commits.length} commit(s) for ${repoName}.`);

    await waitForRateLimit();
  }
}

async function aggregatePullRequestData(
  client: OrgDataClient,
  aggregator: OrgDataAggregator,
): Promise<void> {
  for (const repoName of aggregator.getRepoNames()) {
    const pullRequests = await client.getPullRequests({
      org: process.env.ORG,
      repo: repoName,
      startDate: process.env.START_DATE,
      endDate: process.env.END_DATE,
    });

    aggregator.aggregatePullRequests(pullRequests);
    console.log(`Aggregated ${pullRequests.length} pull request(s) for ${repoName}.`);

    await waitForRateLimit();
  }
}
