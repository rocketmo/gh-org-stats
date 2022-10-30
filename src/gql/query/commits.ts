import { gql, GraphQLClient } from 'graphql-request';
import { waitForRateLimit } from '../../util';
import { UNKNOWN_USER } from '../../constants';

interface CommitsQueryOptions {
  org: string;
  repo: string;
  startDate?: string;
  endDate?: string;
  after?: string;
}

export interface Commit {
  org: string;
  repo: string;
  author: string;
  committedDate: string;
  additions: number;
  deletions: number;
}

function getCommitsQuery(opts: CommitsQueryOptions): string {
  let historyOpts = 'first: 100';

  if (opts.startDate) {
    historyOpts += `, since: "${opts.startDate}"`;
  }

  if (opts.endDate) {
    historyOpts += `, until: "${opts.endDate}"`;
  }

  if (opts.after) {
    historyOpts += `, after: "${opts.after}"`;
  }

  return gql`
    {
      repository(owner: "${opts.org}", name: "${opts.repo}") {
        defaultBranchRef {
          target {
            ... on Commit {
              history(${historyOpts}) {
                nodes {
                  author {
                    name,
                    user {
                      login
                    }
                  },
                  committedDate,
                  additions,
                  deletions,
                  signature { isValid }
                },
                pageInfo {
                  startCursor,
                  endCursor,
                  hasNextPage
                }
              }
            }
          }
        }
      }
    }
  `;
}

export async function getCommits(
  client: GraphQLClient,
  opts: CommitsQueryOptions,
): Promise<Commit[]> {
  const commits: Commit[] = [];
  let after = opts.after;

  do {
    const query = getCommitsQuery({ ...opts, after });
    const results = await client.request(query);

    const history = results.repository.defaultBranchRef.target.history;
    after = history.pageInfo.hasNextPage ? history.pageInfo.endCursor : undefined;

    for (const node of history.nodes) {
      if (!node.signature?.isValid) continue;

      commits.push({
        org: opts.org,
        repo: opts.repo,
        author: node?.author?.user?.login || UNKNOWN_USER,
        committedDate: node.committedDate,
        additions: node.additions || 0,
        deletions: node.deletions || 0,
      });
    }

    if (after) {
      await waitForRateLimit();
    }
  } while (after);

  return commits;
}
