import { promises as fsPromises } from 'fs';
import { createObjectCsvWriter } from 'csv-writer';
import { OrgDataAggregator } from '../aggregator/OrgDataAggregator';
import { OUTPUT_PATH } from '../constants';

export class OrgDataExporter {
  aggregator: OrgDataAggregator;

  constructor(aggregator: OrgDataAggregator) {
    this.aggregator = aggregator;
  }

  async exportRepoData(): Promise<void> {
    await this.makeOutputDir();

    const repoEntries = this.aggregator.getRepoEntries();
    const csvWriter = createObjectCsvWriter({
      path: `${OUTPUT_PATH}/repos.csv`,
      header: [
        { id: 'name', title: 'Repository name' },
        { id: 'commits', title: 'Commits' },
        { id: 'additions', title: 'Lines added' },
        { id: 'deletions', title: 'Lines deleted' },
        { id: 'pulls', title: 'Pull requests created' },
        { id: 'pullsMerged', title: 'Pull requests merged' },
        { id: 'reviews', title: 'Code reviews' },
        { id: 'reviewThreads', title: 'Code review threads' },
        { id: 'comments', title: 'Code review thread comments' },
      ],
    });

    await csvWriter.writeRecords(repoEntries);
    console.log(`Wrote ${repoEntries.length} repo data row(s).`);
  }

  async exportUserData(): Promise<void> {
    await this.makeOutputDir();

    const userEntries = this.aggregator.getUserEntries();
    const csvWriter = createObjectCsvWriter({
      path: `${OUTPUT_PATH}/users.csv`,
      header: [
        { id: 'login', title: 'Username' },
        { id: 'name', title: 'Profile name' },
        { id: 'commits', title: 'Commits' },
        { id: 'additions', title: 'Lines added' },
        { id: 'deletions', title: 'Lines deleted' },
        { id: 'pulls', title: 'Pull requests created' },
        { id: 'pullsMerged', title: 'Pull requests merged' },
        { id: 'reviews', title: 'Code reviews' },
        { id: 'reviewThreads', title: 'Code review threads started' },
        { id: 'comments', title: 'Code review thread comments' },
        { id: 'uniqueRepoCommitCount', title: 'Repos with >0 commit' },
        { id: 'uniqueRepoReviewCount', title: 'Repos with >0 code review' },
      ],
    });

    await csvWriter.writeRecords(userEntries);
    console.log(`Wrote ${userEntries.length} user data row(s).`);
  }

  async exportUserByRepoData(): Promise<void> {
    await this.makeOutputDir();

    const userByRepoEntries = this.aggregator.getUserByRepoEntries();
    const csvWriter = createObjectCsvWriter({
      path: `${OUTPUT_PATH}/user-by-repo.csv`,
      header: [
        { id: 'repo', title: 'Repository name' },
        { id: 'login', title: 'Username' },
        { id: 'name', title: 'Profile name' },
        { id: 'commits', title: 'Commits' },
        { id: 'additions', title: 'Lines added' },
        { id: 'deletions', title: 'Lines deleted' },
        { id: 'pulls', title: 'Pull requests created' },
        { id: 'pullsMerged', title: 'Pull requests merged' },
        { id: 'reviews', title: 'Code reviews' },
        { id: 'reviewThreads', title: 'Code review threads started' },
        { id: 'comments', title: 'Code review thread comments' },
      ],
    });

    await csvWriter.writeRecords(userByRepoEntries);
    console.log(`Wrote ${userByRepoEntries.length} user/repo data row(s).`);
  }

  private async makeOutputDir(): Promise<void> {
    try {
      await fsPromises.mkdir(OUTPUT_PATH, { recursive: true });
    } catch (err) {
      // Directory already exists
      if (err.code !== 'EEXIST') {
        throw err;
      }
    }
  }
}
