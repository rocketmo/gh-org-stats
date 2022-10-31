export interface RepoInfo {
  name: string;
  commits: number;
  additions: number;
  deletions: number;
  pulls: number;
  reviews: number;
  comments: number;
}

export interface UserInfo {
  login: string;
  name: string;
  commits: number;
  additions: number;
  deletions: number;
  pulls: number;
  reviews: number;
  comments: number;
}

export interface UserInfoExtended extends UserInfo {
  uniqueRepoCommits: Set<string>;
  uniqueRepoReviews: Set<string>;
}

export interface UserInfoExtendedCounts extends UserInfo {
  uniqueRepoCommitCount: number;
  uniqueRepoReviewCount: number;
}

export interface UserRepoInfo extends UserInfo {
  repo: string;
}
