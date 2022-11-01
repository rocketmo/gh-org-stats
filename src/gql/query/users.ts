import { gql, GraphQLClient } from 'graphql-request';
import { waitForRateLimit } from '../../util';

export interface UsersQueryOptions {
  org: string;
  after?: string;
}

export interface User {
  login: string;
  name: string;
}

function getUserQuery(opts: UsersQueryOptions): string {
  let memberOpts = 'first: 100';

  if (opts.after) {
    memberOpts += `, after: "${opts.after}"`;
  }

  return gql`
    {
      organization(login: "${opts.org}") {
        membersWithRole(${memberOpts}) {
          nodes { login, name },
          pageInfo {
            endCursor,
            hasNextPage
          }
        }
      }
    }
  `;
}

export async function getUsers(client: GraphQLClient, opts: UsersQueryOptions): Promise<User[]> {
  const users: User[] = [];
  let after = opts.after;

  do {
    const query = getUserQuery({ ...opts, after });
    const results = await client.request(query);

    const userData = results.organization.membersWithRole;
    after = userData.pageInfo.hasNextPage ? userData.pageInfo.endCursor : undefined;

    for (const node of userData.nodes) {
      users.push({
        login: node.login,
        name: node.name || node.login,
      });
    }

    if (after) {
      await waitForRateLimit();
    }
  } while (after);

  return users;
}
