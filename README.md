# gh-org-stats
A script to aggregate GitHub stats within an organization.

## Installation

1. Clone this repo.
2. Run `npm install`.

## Usage

To run the script, run `npm run gen` with the following options.

| Option             | Description                                                   |
| ------------------ | ------------------------------------------------------------- |
| `ORG`              | (required) The organization you want to aggregate states for. |
| `PAT`              | (required) Github personal access token.                      |
| `START_DATE`       | (optional) ISO Date to capture data after.                    |
| `END_DATE`         | (optional) ISO Date to capture data before.                   |

Example: `ORG=MyOrg PAT=My_PAT START_DATE=2022-01-01T00:00:00Z END_DATE=2023-01-01T00:00:00Z npm run gen`

To create an appropriate personal access token, follow the steps outlined 
[here](https://docs.github.com/en/graphql/guides/forming-calls-with-graphql#authenticating-with-graphql).
