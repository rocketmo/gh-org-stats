import dotenv from 'dotenv';
import { GraphQLClient } from 'graphql-request';
import { createGQLClient } from './src/gql';
import { Commit, getCommits } from './src/gql/query/commits';
import { getRepos } from './src/gql/query/repos';
import { waitForRateLimit } from './src/util';

interface RepoInfo {
  name: string;
  commits: number;
  additions: number;
  deletions: number;
  pulls: number;
  reviews: number;
  comments: number;
}

interface UserInfo {
  name: string;
  commits: number;
  additions: number;
  deletions: number;
  pulls: number;
  reviews: number;
  comments: number;
  uniqueRepoCommits: Set<string>;
  uniqueRepoReviews: Set<string>;
}

dotenv.config();
main();

async function main(): Promise<void> {
  const client = createGQLClient(process.env.PAT);
  const repoMap = await buildRepoMap(client);
  const userMap = new Map<string, UserInfo>();

  for (const repoName of repoMap.keys()) {
    await aggregateCommitData(client, repoName, repoMap, userMap);
    await waitForRateLimit();
  }

  console.log('DONE!');
}

async function buildRepoMap(client: GraphQLClient): Promise<Map<string, RepoInfo>> {
  const repos = await getRepos(client, { org: process.env.ORG });
  const repoMap = new Map<string, RepoInfo>();

  for (const repo of repos) {
    repoMap.set(repo.name, buildDefaultRepoInfo(repo.name));
  }

  console.log(`Retrieved ${repos.length} repo(s).`);
  return repoMap;
}

async function aggregateCommitData(
  client: GraphQLClient,
  repo: string,
  repoMap: Map<string, RepoInfo>,
  userMap: Map<string, UserInfo>,
): Promise<void> {
  const commits = await getCommits(client, {
    org: process.env.ORG,
    repo,
    startDate: process.env.START_DATE,
    endDate: process.env.END_DATE,
  });

  for (const commit of commits) {
    addCommitToRepoMap(repoMap, commit);
    addCommitToUserMap(userMap, commit);
  }

  console.log(`Retrieved ${commits.length} commits for ${repo}.`);
}

function addCommitToRepoMap(repoMap: Map<string, RepoInfo>, commit: Commit): void {
  let repoInfo = repoMap.get(commit.repo);

  if (!repoInfo) {
    repoInfo = buildDefaultRepoInfo(commit.repo);
    repoMap.set(commit.repo, repoInfo);
  }

  repoInfo.commits += 1;
  repoInfo.additions += commit.additions;
  repoInfo.deletions += commit.deletions;
}

function addCommitToUserMap(userMap: Map<string, UserInfo>, commit: Commit): void {
  let userInfo = userMap.get(commit.author);

  if (!userInfo) {
    userInfo = buildDefaultUserInfo(commit.author);
    userMap.set(commit.author, userInfo);
  }

  userInfo.commits += 1;
  userInfo.additions += commit.additions;
  userInfo.deletions += commit.deletions;
  userInfo.uniqueRepoCommits.add(commit.repo);
}

function buildDefaultRepoInfo(repoName: string): RepoInfo {
  return {
    name: repoName,
    commits: 0,
    additions: 0,
    deletions: 0,
    pulls: 0,
    reviews: 0,
    comments: 0,
  };
}

function buildDefaultUserInfo(userName: string): UserInfo {
  return {
    name: userName,
    commits: 0,
    additions: 0,
    deletions: 0,
    pulls: 0,
    reviews: 0,
    comments: 0,
    uniqueRepoCommits: new Set<string>(),
    uniqueRepoReviews: new Set<string>(),
  };
}
