import { User } from '../users';

export interface PullRequestsQueryOptions {
  org: string;
  repo: string;
  startDate?: string;
  endDate?: string;
  after?: string;
}

export interface PullRequest {
  org: string;
  repo: string;
  author: User;
  wasMerged: boolean;
  reviewUsers: User[];
  reviewCommentsCount: ReviewCommentsCount[];
}

export interface ReviewCommentsCount extends User {
  comments: number;
  reviewThreads: number;
}

export interface PageInfo {
  endCursor: string;
  hasNextPage: boolean;
}

export interface Review {
  author: User;
  createdAt: string;
}

export interface ReviewData {
  nodes: Review[];
  pageInfo: PageInfo;
}

export interface Comment {
  author: User;
  createdAt: string;
}

export interface CommentData {
  nodes: Comment[];
  pageInfo: PageInfo;
}

export interface ReviewThread {
  id: string;
  comments: CommentData;
}

export interface ReviewThreadData {
  nodes: ReviewThread[];
  pageInfo: PageInfo;
}
