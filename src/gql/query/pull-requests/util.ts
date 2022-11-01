import { gql } from 'graphql-request';
import { PullRequestsQueryOptions } from './types';

export function getPullRequestsQuery(opts: PullRequestsQueryOptions): string {
  let pullRequestOpts = 'first: 100, orderBy: { direction: DESC, field: CREATED_AT }';

  if (opts.after) {
    pullRequestOpts += `, after: "${opts.after}"`;
  }

  return gql`
    {
      repository(owner: "${opts.org}", name: "${opts.repo}") {
        pullRequests(${pullRequestOpts}) {
          nodes {
            id,
            merged,
            mergedAt
            createdAt,
            author {
              ... on User { login, name }
            },
            reviews(first: 10) {
              nodes {
                createdAt,
                author {
                  ... on User { login, name }
                }
              },
              pageInfo {
                endCursor,
                hasNextPage
              }
            },
            reviewThreads(first: 10) {
              nodes {
                id,
                comments(first: 10) {
                  nodes {
                    createdAt,
                    author {
                      ... on User { login, name }
                    }
                  },
                  pageInfo {
                    endCursor,
                    hasNextPage
                  }
                }
              },
              pageInfo {
                endCursor,
                hasNextPage
              }
            }
          },
          pageInfo {
            endCursor,
            hasNextPage
          }
        }
      }
    }
  `;
}

export function getReviewsQuery(pullRequestId: string, after: string): string {
  return gql`
    {
      node(id: "${pullRequestId}") {
        ... on PullRequest {
          reviews(first: 100, after: "${after}") {
            nodes {
              createdAt,
              author {
                ... on User { login, name }
              }
            },
            pageInfo {
              endCursor,
              hasNextPage
            }
          }
        }
      }
    }
  `;
}

export function getReviewThreadsQuery(pullRequestId: string, after: string): string {
  return gql`
    {
      node(id: "${pullRequestId}") {
        ... on PullRequest {
          reviewThreads(first: 100, after: "${after}") {
            nodes {
              id,
              comments(first: 10) {
                nodes {
                  createdAt,
                  author {
                    ... on User { login, name }
                  }
                },
                pageInfo {
                  endCursor,
                  hasNextPage
                }
              }
            },
            pageInfo {
              endCursor,
              hasNextPage
            }
          }
        }
      }
    }
  `;
}

export function getCommentsQuery(reviewThreadId: string, after: string): string {
  return gql`
    {
      node(id: "${reviewThreadId}") {
        ... on PullRequestReviewThread {
          comments(first: 100, after: "${after}") {
            nodes {
              createdAt,
              author {
                ... on User { login, name }
              }
            },
            pageInfo {
              endCursor,
              hasNextPage
            }
          }
        }
      }
    }
  `;
}
