import { RepoInfo, UserInfo, UserInfoExtended } from './types';

export function buildDefaultRepoInfo(repoName: string): RepoInfo {
  return {
    name: repoName,
    commits: 0,
    additions: 0,
    deletions: 0,
    pulls: 0,
    pullsMerged: 0,
    reviews: 0,
    reviewThreads: 0,
    comments: 0,
  };
}

export function buildDefaultUserInfo(userLogin: string, userName: string): UserInfo {
  return {
    login: userLogin,
    name: userName,
    commits: 0,
    additions: 0,
    deletions: 0,
    pulls: 0,
    pullsMerged: 0,
    reviews: 0,
    reviewThreads: 0,
    comments: 0,
  };
}

export function buildDefaultUserInfoExtended(
  userLogin: string,
  userName: string,
): UserInfoExtended {
  return {
    ...buildDefaultUserInfo(userLogin, userName),
    uniqueRepoCommits: new Set<string>(),
    uniqueRepoReviews: new Set<string>(),
  };
}
