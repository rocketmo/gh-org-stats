import {
  RepoInfo,
  UserInfo,
  UserInfoExtended,
  UserInfoExtendedCounts,
  UserRepoInfo,
} from './types';
import { buildDefaultRepoInfo, buildDefaultUserInfo, buildDefaultUserInfoExtended } from './util';
import { Commit } from '../gql/query/commits';
import { PullRequest } from '../gql/query/pull-requests/types';
import { Repo } from '../gql/query/repos';
import { User } from '../gql/query/users';

export class OrgDataAggregator {
  private allowedUsersSet: Set<string>;
  private repoMap: Map<string, RepoInfo>;
  private userMap: Map<string, UserInfoExtended>;
  private userByRepoMap: Map<string, Map<string, UserInfo>>;

  constructor() {
    this.allowedUsersSet = new Set<string>();
    this.repoMap = new Map<string, RepoInfo>();
    this.userMap = new Map<string, UserInfoExtended>();
    this.userByRepoMap = new Map<string, Map<string, UserInfo>>();
  }

  aggregateRepos(repos: Repo[]): void {
    for (const repo of repos) {
      if (this.repoMap.has(repo.name)) {
        continue;
      }

      this.repoMap.set(repo.name, buildDefaultRepoInfo(repo.name));
    }
  }

  aggregateCommits(commits: Commit[]): void {
    for (const commit of commits) {
      this.addCommitToRepoMap(commit);
      this.addCommitToUserMap(commit);
      this.addCommitToUserByRepoMap(commit);
    }
  }

  aggregatePullRequests(pullRequests: PullRequest[]): void {
    for (const pullRequest of pullRequests) {
      this.addPullRequestToRepoMap(pullRequest);
      this.addPullRequestToUserMap(pullRequest);
      this.addPullRequestToUserByRepoMap(pullRequest);
    }
  }

  aggregateUsers(users: User[]): void {
    for (const user of users) {
      this.allowedUsersSet.add(user.login);

      let userInfo = this.userMap.get(user.login);
      if (!userInfo) {
        userInfo = buildDefaultUserInfoExtended(user.login, user.name);
        this.userMap.set(user.login, userInfo);
      }
    }
  }

  getRepoNames(): string[] {
    return Array.from(this.repoMap.keys());
  }

  getRepoEntries(): RepoInfo[] {
    return Array.from(this.repoMap.values());
  }

  getUserEntries(): UserInfoExtendedCounts[] {
    return Array.from(this.userMap.values()).map((userInfoExtended) => {
      return {
        login: userInfoExtended.login,
        name: userInfoExtended.name,
        commits: userInfoExtended.commits,
        additions: userInfoExtended.additions,
        deletions: userInfoExtended.deletions,
        pulls: userInfoExtended.pulls,
        pullsMerged: userInfoExtended.pullsMerged,
        reviews: userInfoExtended.reviews,
        reviewThreads: userInfoExtended.reviews,
        comments: userInfoExtended.comments,
        uniqueRepoCommitCount: userInfoExtended.uniqueRepoCommits.size,
        uniqueRepoReviewCount: userInfoExtended.uniqueRepoReviews.size,
      };
    });
  }

  getUserByRepoEntries(): UserRepoInfo[] {
    const entries: UserRepoInfo[] = [];
    for (const [repoName, userInfoEntries] of this.userByRepoMap.entries()) {
      for (const userInfo of userInfoEntries.values()) {
        entries.push({ ...userInfo, repo: repoName });
      }
    }

    return entries;
  }

  private addCommitToRepoMap(commit: Commit): void {
    const repoInfo = this.getRepoFromMap(commit.repo);
    repoInfo.commits += 1;
    repoInfo.additions += commit.additions;
    repoInfo.deletions += commit.deletions;
  }

  private addCommitToUserMap(commit: Commit): void {
    if (!this.allowedUsersSet.has(commit.authorLogin)) {
      return;
    }

    const userInfoExtended = this.getUserExtendedFromMap(commit.authorLogin, commit.authorName);
    userInfoExtended.commits += 1;
    userInfoExtended.additions += commit.additions;
    userInfoExtended.deletions += commit.deletions;
    userInfoExtended.uniqueRepoCommits.add(commit.repo);
  }

  private addCommitToUserByRepoMap(commit: Commit): void {
    const userInfo = this.getUserByRepo(commit.repo, commit.authorLogin, commit.authorName);
    userInfo.commits += 1;
    userInfo.additions += commit.additions;
    userInfo.deletions += commit.deletions;
  }

  private addPullRequestToRepoMap(pullRequest: PullRequest): void {
    const repoInfo = this.getRepoFromMap(pullRequest.repo);
    repoInfo.pulls += 1;
    repoInfo.pullsMerged += pullRequest.wasMerged ? 1 : 0;
    repoInfo.reviews += pullRequest.reviewUsers.length;

    for (const commentCountObj of pullRequest.reviewCommentsCount) {
      repoInfo.comments += commentCountObj.comments;
      repoInfo.reviewThreads += commentCountObj.reviewThreads;
    }
  }

  private addPullRequestToUserMap(pullRequest: PullRequest): void {
    if (!this.allowedUsersSet.has(pullRequest.author.login)) {
      return;
    }

    const userInfoExtended = this.getUserExtendedFromMap(
      pullRequest.author.login,
      pullRequest.author.name,
    );
    userInfoExtended.pulls += 1;
    userInfoExtended.pullsMerged += pullRequest.wasMerged ? 1 : 0;

    this.addPullRequestReviewersToUserMap(pullRequest.repo, pullRequest.reviewUsers);
    this.addPullRequestCommentersToUserMap(pullRequest.reviewCommentsCount);
  }

  private addPullRequestToUserByRepoMap(pullRequest: PullRequest): void {
    const userInfo = this.getUserByRepo(
      pullRequest.repo,
      pullRequest.author.login,
      pullRequest.author.name,
    );
    userInfo.pulls += 1;
    userInfo.pullsMerged += pullRequest.wasMerged ? 1 : 0;

    this.addPullRequestReviewersToUserByRepoMap(pullRequest.repo, pullRequest.reviewUsers);
    this.addPullRequestCommentersToUserByRepoMap(pullRequest.repo, pullRequest.reviewCommentsCount);
  }

  private addPullRequestReviewersToUserMap(
    repo: string,
    reviewers: PullRequest['reviewUsers'],
  ): void {
    for (const reviewer of reviewers) {
      if (!this.allowedUsersSet.has(reviewer.login)) {
        continue;
      }

      const userInfoExtended = this.getUserExtendedFromMap(reviewer.login, reviewer.name);
      userInfoExtended.reviews += 1;
      userInfoExtended.uniqueRepoReviews.add(repo);
    }
  }

  private addPullRequestReviewersToUserByRepoMap(
    repo: string,
    reviewers: PullRequest['reviewUsers'],
  ): void {
    for (const reviewer of reviewers) {
      const userInfo = this.getUserByRepo(repo, reviewer.login, reviewer.name);
      userInfo.reviews += 1;
    }
  }

  private addPullRequestCommentersToUserMap(commenters: PullRequest['reviewCommentsCount']): void {
    for (const commenter of commenters) {
      if (!this.allowedUsersSet.has(commenter.login)) {
        continue;
      }

      const userInfoExtended = this.getUserExtendedFromMap(commenter.login, commenter.name);
      userInfoExtended.comments += commenter.comments;
      userInfoExtended.reviewThreads += commenter.reviewThreads;
    }
  }

  private addPullRequestCommentersToUserByRepoMap(
    repo: string,
    commenters: PullRequest['reviewCommentsCount'],
  ): void {
    for (const commenter of commenters) {
      const userInfo = this.getUserByRepo(repo, commenter.login, commenter.name);
      userInfo.comments += commenter.comments;
      userInfo.reviewThreads += commenter.reviewThreads;
    }
  }

  private getRepoFromMap(repoName: string): RepoInfo {
    let repoInfo = this.repoMap.get(repoName);

    if (!repoInfo) {
      repoInfo = buildDefaultRepoInfo(repoName);
      this.repoMap.set(repoName, repoInfo);
    }

    return repoInfo;
  }

  private getUserExtendedFromMap(userLogin: string, userName: string): UserInfoExtended {
    let userInfoExtended = this.userMap.get(userLogin);

    if (!userInfoExtended) {
      userInfoExtended = buildDefaultUserInfoExtended(userLogin, userName);
      this.userMap.set(userLogin, userInfoExtended);
    }

    return userInfoExtended;
  }

  private getUserByRepo(repoName: string, userLogin: string, userName: string): UserInfo {
    let userMap = this.userByRepoMap.get(repoName);
    if (!userMap) {
      userMap = new Map<string, UserInfo>();
      this.userByRepoMap.set(repoName, userMap);
    }

    let userInfo = userMap.get(userLogin);
    if (!userInfo) {
      userInfo = buildDefaultUserInfo(userLogin, userName);
      userMap.set(userLogin, userInfo);
    }

    return userInfo;
  }
}
