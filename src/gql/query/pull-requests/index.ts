import { GraphQLClient } from 'graphql-request';
import moment, { Moment } from 'moment';
import { waitForRateLimit, waitForPullRequestRateLimit } from '../../../util';
import { UNKNOWN_LOGIN, UNKNOWN_USER } from '../../../constants';
import {
  Comment,
  PullRequest,
  PullRequestsQueryOptions,
  Review,
  ReviewData,
  ReviewThread,
  ReviewCommentsCount,
  ReviewThreadData,
} from './types';
import {
  getCommentsQuery,
  getPullRequestsQuery,
  getReviewsQuery,
  getReviewThreadsQuery,
} from './util';
import { User } from '../users';

export async function getPullRequests(
  client: GraphQLClient,
  opts: PullRequestsQueryOptions,
): Promise<PullRequest[]> {
  const pullRequests: PullRequest[] = [];
  let after = opts.after;

  const startMoment = opts.startDate ? moment(opts.startDate) : undefined;
  const endMoment = opts.endDate ? moment(opts.endDate) : undefined;

  do {
    const query = getPullRequestsQuery({ ...opts, after });
    const results = await client.request(query);

    const pullRequestData = results.repository.pullRequests;
    after = pullRequestData.pageInfo.hasNextPage ? pullRequestData.pageInfo.endCursor : undefined;

    for (const node of pullRequestData.nodes) {
      const createdAtMoment = moment(node.createdAt);
      const mergedAtMoment = node.mergedAt ? moment(node.mergedAt) : undefined;

      if (startMoment && createdAtMoment.isBefore(startMoment)) {
        after = undefined;
        break;
      }

      if (endMoment && createdAtMoment.isAfter(endMoment)) {
        continue;
      }

      // Extract the reviewers and review comments
      const reviewersMap = await buildReviewersMap(
        client,
        node.reviews,
        node.id,
        node.author?.login,
        startMoment,
        endMoment,
      );
      const reviewCommentsMap = await buildReviewCommentsMap(
        client,
        node.reviewThreads,
        node.id,
        startMoment,
        endMoment,
      );

      pullRequests.push({
        org: opts.org,
        repo: opts.repo,
        author: {
          login: node.author?.login || UNKNOWN_LOGIN,
          name: node.author?.name || node.author?.login || UNKNOWN_USER,
        },
        wasMerged:
          !!node.merged &&
          (!startMoment || mergedAtMoment.isAfter(startMoment)) &&
          (!endMoment || mergedAtMoment.isBefore(endMoment)),
        reviewUsers: Array.from(reviewersMap.values()),
        reviewCommentsCount: Array.from(reviewCommentsMap.values()),
      });
    }

    if (after) {
      await waitForPullRequestRateLimit();
    }
  } while (after);

  return pullRequests;
}

async function buildReviewersMap(
  client: GraphQLClient,
  reviewData: ReviewData,
  pullRequestId: string,
  pullRequestAuthorLogin: string,
  startMoment?: Moment,
  endMoment?: Moment,
): Promise<Map<string, User>> {
  const reviewersMap = new Map<string, User>();
  const reviews = [...reviewData.nodes];

  if (reviewData.pageInfo.hasNextPage) {
    const additionalReviews = await getRemainingReviews(
      client,
      pullRequestId,
      reviewData.pageInfo.endCursor,
    );
    reviews.push(...additionalReviews);
  }

  for (const review of reviews) {
    // Don't include self-reviews
    if (review.author?.login === pullRequestAuthorLogin) {
      continue;
    }

    // Don't include reviews that are outside the date bouds
    const reviewMoment = moment(review.createdAt);
    if (
      (startMoment && reviewMoment.isBefore(startMoment)) ||
      (endMoment && reviewMoment.isAfter(endMoment))
    ) {
      continue;
    }

    const login = review.author?.login || UNKNOWN_LOGIN;
    reviewersMap.set(login, {
      login,
      name: review.author?.name || review.author?.login || UNKNOWN_USER,
    });
  }

  return reviewersMap;
}

async function buildReviewCommentsMap(
  client: GraphQLClient,
  reviewThreadData: ReviewThreadData,
  pullRequestId: string,
  startMoment?: Moment,
  endMoment?: Moment,
): Promise<Map<string, ReviewCommentsCount>> {
  const reviewCommentsMap = new Map<string, ReviewCommentsCount>();
  const reviewThreads = [...reviewThreadData.nodes];

  if (reviewThreadData.pageInfo.hasNextPage) {
    const additionalReviewThreads = await getRemainingReviewThreads(
      client,
      pullRequestId,
      reviewThreadData.pageInfo.endCursor,
    );
    reviewThreads.push(...additionalReviewThreads);
  }

  for (const reviewThread of reviewThreads) {
    const comments = [...reviewThread.comments.nodes];

    if (reviewThread.comments.pageInfo.hasNextPage) {
      const additionalComments = await getRemainingComments(
        client,
        reviewThread.id,
        reviewThread.comments.pageInfo.endCursor,
      );
      comments.push(...additionalComments);
    }

    for (let commentIdx = 0; commentIdx < comments.length; commentIdx += 1) {
      const comment = comments[commentIdx];

      // Don't include comments that are outside the date bounds
      const commentMoment = moment(comment.createdAt);
      if (
        (startMoment && commentMoment.isBefore(startMoment)) ||
        (endMoment && commentMoment.isAfter(endMoment))
      ) {
        continue;
      }

      let reviewCommentCount: ReviewCommentsCount = reviewCommentsMap.get(comment.author?.login);
      if (!reviewCommentCount) {
        const login = comment.author?.login || UNKNOWN_LOGIN;
        reviewCommentCount = {
          login,
          name: comment.author?.name || comment.author?.login || UNKNOWN_USER,
          reviewThreads: 0,
          comments: 0,
        };
        reviewCommentsMap.set(login, reviewCommentCount);
      }

      reviewCommentCount.comments += 1;

      if (commentIdx === 0) {
        reviewCommentCount.reviewThreads += 1;
      }
    }
  }

  return reviewCommentsMap;
}

async function getRemainingReviews(
  client: GraphQLClient,
  pullRequestId: string,
  after: string,
): Promise<Review[]> {
  const reviews: Review[] = [];
  let currentAfter = after;

  while (currentAfter) {
    const query = getReviewsQuery(pullRequestId, currentAfter);
    const results = await client.request(query);

    const reviewData = results.node.reviews;
    currentAfter = reviewData.pageInfo.hasNextPage ? reviewData.pageInfo.endCursor : undefined;

    for (const node of reviewData.nodes) {
      reviews.push({
        author: node.author,
        createdAt: node.createdAt,
      });
    }

    if (currentAfter) {
      await waitForRateLimit();
    }
  }

  return reviews;
}

async function getRemainingReviewThreads(
  client: GraphQLClient,
  pullRequestId: string,
  after: string,
): Promise<ReviewThread[]> {
  const reviewThreads: ReviewThread[] = [];
  let currentAfter = after;

  while (currentAfter) {
    const query = getReviewThreadsQuery(pullRequestId, currentAfter);
    const results = await client.request(query);

    const reviewThreadData = results.node.reviewThreads;
    currentAfter = reviewThreadData.pageInfo.hasNextPage
      ? reviewThreadData.pageInfo.endCursor
      : undefined;

    for (const node of reviewThreadData.nodes) {
      reviewThreads.push({
        id: node.id,
        comments: node.comments || [],
      });
    }

    if (currentAfter) {
      await waitForRateLimit();
    }
  }

  return reviewThreads;
}

async function getRemainingComments(
  client: GraphQLClient,
  reviewThreadId: string,
  after: string,
): Promise<Comment[]> {
  const comments: Comment[] = [];
  let currentAfter = after;

  while (currentAfter) {
    const query = getCommentsQuery(reviewThreadId, currentAfter);
    const results = await client.request(query);

    const commentData = results.node.comments;
    currentAfter = commentData.pageInfo.hasNextPage ? commentData.pageInfo.endCursor : undefined;

    for (const node of commentData.nodes) {
      comments.push({
        author: node.author,
        createdAt: node.createdAt,
      });
    }

    if (currentAfter) {
      await waitForRateLimit();
    }
  }

  return comments;
}
