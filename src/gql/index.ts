import { GraphQLClient } from 'graphql-request';
import { ENDPOINT } from '../constants';

export function createGQLClient(personalAccessToken: string): GraphQLClient {
  return new GraphQLClient(ENDPOINT, {
    headers: {
      authorization: `bearer ${personalAccessToken}`,
    },
  });
}
