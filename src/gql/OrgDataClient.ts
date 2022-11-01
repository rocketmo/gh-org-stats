import { GraphQLClient } from 'graphql-request';
import { ENDPOINT } from '../constants';
import { Commit, CommitsQueryOptions, getCommits } from './query/commits';
import { getPullRequests } from './query/pull-requests';
import { PullRequest, PullRequestsQueryOptions } from './query/pull-requests/types';
import { getRepos, Repo, ReposQueryOptions } from './query/repos';
import { getUsers, User, UsersQueryOptions } from './query/users';

export class OrgDataClient {
  private client: GraphQLClient;

  constructor(personalAccessToken: string) {
    this.client = new GraphQLClient(ENDPOINT, {
      headers: {
        authorization: `bearer ${personalAccessToken}`,
      },
    });
  }

  async getCommits(opts: CommitsQueryOptions): Promise<Commit[]> {
    return await getCommits(this.client, opts);
  }

  async getPullRequests(opts: PullRequestsQueryOptions): Promise<PullRequest[]> {
    return await getPullRequests(this.client, opts);
  }

  async getRepos(opts: ReposQueryOptions): Promise<Repo[]> {
    return await getRepos(this.client, opts);
  }

  async getUsers(opts: UsersQueryOptions): Promise<User[]> {
    return await getUsers(this.client, opts);
  }
}
