import { gql, GraphQLClient } from 'graphql-request';
import { waitForRateLimit } from '../../util';

export interface ReposQueryOptions {
  org: string;
  after?: string;
}

export interface Repo {
  org: string;
  name: string;
}

function getRepoQuery(opts: ReposQueryOptions): string {
  let repoOpts = 'first: 100';

  if (opts.after) {
    repoOpts += `, after: "${opts.after}"`;
  }

  return gql`
    {
      organization(login: "${opts.org}") {
        repositories(${repoOpts}) {
          nodes { name },
          pageInfo {
            startCursor,
            endCursor,
            hasNextPage
          }
        }
      }
    }
  `;
}

export async function getRepos(client: GraphQLClient, opts: ReposQueryOptions): Promise<Repo[]> {
  const repos: Repo[] = [];
  let after = opts.after;

  do {
    const query = getRepoQuery({ ...opts, after });
    const results = await client.request(query);

    const repoData = results.organization.repositories;
    after = repoData.pageInfo.hasNextPage ? repoData.pageInfo.endCursor : undefined;

    for (const node of repoData.nodes) {
      repos.push({
        org: opts.org,
        name: node.name,
      });
    }

    if (after) {
      await waitForRateLimit();
    }
  } while (after);

  return repos;
}
