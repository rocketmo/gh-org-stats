import {
  RepoInfo,
  UserInfo,
  UserInfoExtended,
  UserInfoExtendedCounts,
  UserRepoInfo,
} from './types';
import { buildDefaultRepoInfo, buildDefaultUserInfo, buildDefaultUserInfoExtended } from './util';
import { Commit } from '../gql/query/commits';
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
        reviews: userInfoExtended.reviews,
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
