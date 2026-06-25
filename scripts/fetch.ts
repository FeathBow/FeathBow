import { writeFileSync } from 'node:fs';
import { graphql } from '@octokit/graphql';
import type { Hue, Lang, StatsData } from './types.ts';

const TOKEN = process.env.STATS_TOKEN || process.env.GITHUB_TOKEN;
const LOGIN = process.env.STATS_LOGIN || 'FeathBow';
if (!TOKEN) {
  console.error('Missing STATS_TOKEN / GITHUB_TOKEN');
  process.exit(1);
}
const gql = graphql.defaults({ headers: { authorization: `token ${TOKEN}` } });

const HUES: Hue[] = ['peach', 'sage', 'rose', 'gold', 'blue', 'plum', 'teal', 'caramel'];
const iso = (d: Date): string => d.toISOString();

type Day = { date: string; weekday: number; count: number };
type Contributions = {
  commits: number;
  reviews: number;
  days: Day[];
};
type AuthoredTotals = {
  prs: number;
  issues: number;
};
type Streaks = {
  currentStreak: number;
  longestStreak: number;
};
type WeekView = Pick<StatsData, 'week' | 'weekStart' | 'weekEnd'>;
type ContribResp = {
  user: {
    contributionsCollection: {
      totalCommitContributions: number;
      totalPullRequestReviewContributions: number;
      contributionCalendar: {
        weeks: { contributionDays: { date: string; weekday: number; contributionCount: number }[] }[];
      };
    };
  };
};
type OwnedReposResp = {
  user: {
    repositories: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: ({ languages: { edges: { size: number; node: { name: string } }[] } | null } | null)[];
    };
  };
};

async function fetchStartYear(login: string): Promise<number> {
  const { user: u0 } = await gql<{ user: { createdAt: string } | null }>(
    `query($login:String!){ user(login:$login){ createdAt } }`,
    { login },
  );
  if (!u0) {
    throw new Error(`No such user: ${login}`);
  }
  return new Date(u0.createdAt).getUTCFullYear();
}

async function fetchContributions(login: string, startYear: number, now: Date): Promise<Contributions> {
  let commits = 0,
    reviews = 0;
  const dayMap = new Map<string, { weekday: number; count: number }>();
  const endYear = now.getUTCFullYear();

  for (let y = startYear; y <= endYear; y++) {
    const from = iso(new Date(Date.UTC(y, 0, 1)));
    const to = y === endYear ? iso(now) : iso(new Date(Date.UTC(y, 11, 31, 23, 59, 59)));
    const { user } = await gql<ContribResp>(
      `
      query($login:String!,$from:DateTime!,$to:DateTime!){
        user(login:$login){ contributionsCollection(from:$from,to:$to){
          totalCommitContributions totalPullRequestReviewContributions
          contributionCalendar { weeks { contributionDays { date weekday contributionCount } } }
        } }
      }`,
      { login, from, to },
    );
    const c = user.contributionsCollection;
    commits += c.totalCommitContributions;
    reviews += c.totalPullRequestReviewContributions;
    for (const w of c.contributionCalendar.weeks)
      for (const d of w.contributionDays) dayMap.set(d.date, { weekday: d.weekday, count: d.contributionCount });
  }
  const days: Day[] = [...dayMap.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  return { commits, reviews, days };
}

async function fetchAuthoredTotals(login: string): Promise<AuthoredTotals> {
  const { user } = await gql<{ user: { issues: { totalCount: number }; pullRequests: { totalCount: number } } }>(
    `
    query($login:String!){ user(login:$login){
      issues(first:1){ totalCount }
      pullRequests(first:1){ totalCount }
    } }`,
    { login },
  );
  return { prs: user.pullRequests.totalCount, issues: user.issues.totalCount };
}

async function fetchContributedTo(login: string): Promise<number> {
  const { user: uc } = await gql<{ user: { repositoriesContributedTo: { totalCount: number } } }>(
    `
    query($login:String!){ user(login:$login){
      repositoriesContributedTo(first:1, includeUserRepositories:false,
        contributionTypes:[COMMIT,PULL_REQUEST,ISSUE,PULL_REQUEST_REVIEW]){ totalCount } } }`,
    { login },
  );
  return uc.repositoriesContributedTo.totalCount;
}

async function fetchLanguages(login: string): Promise<Lang[]> {
  const bytes: Record<string, number> = {};
  let cursor: string | null = null,
    more = true;

  while (more) {
    const { user } = (await gql(
      `
      query($login:String!,$cursor:String){ user(login:$login){
        repositories(first:100, ownerAffiliations:OWNER, isFork:false, after:$cursor){
          pageInfo{ hasNextPage endCursor }
          nodes{ languages(first:100, orderBy:{field:SIZE,direction:DESC}){ edges{ size node{ name } } } }
        } } }`,
      { login, cursor },
    )) as OwnedReposResp;
    const repos = user.repositories;
    for (const r of repos.nodes) {
      if (!r) continue;
      for (const e of r.languages?.edges ?? []) {
        bytes[e.node.name] = (bytes[e.node.name] || 0) + e.size;
      }
    }
    more = repos.pageInfo.hasNextPage;
    cursor = repos.pageInfo.endCursor;
  }

  const top = Object.entries(bytes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const totalBytes = Object.values(bytes).reduce((s, b) => s + b, 0) || 1;
  return top.map(([name, b], i) => ({ name, pct: Math.round((b / totalBytes) * 1000) / 10, hue: HUES[i] }));
}

function calculateStreaks(days: Day[]): Streaks {
  let longestStreak = 0,
    run = 0;

  for (const d of days) {
    if (d.count > 0) {
      run++;
      longestStreak = Math.max(longestStreak, run);
    } else run = 0;
  }
  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) currentStreak++;
    else if (i === days.length - 1) continue;
    else break;
  }
  return { currentStreak, longestStreak };
}

function buildWeekView(days: Day[]): WeekView {
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const last7 = days.slice(-7);
  const week = last7.map((d) => ({ day: WD[d.weekday], count: d.count }));
  const md = (s: string): string => {
    const t = new Date(`${s}T00:00:00Z`);
    return `${MON[t.getUTCMonth()]} ${t.getUTCDate()}`;
  };
  const weekStart = last7.length ? md(last7[0].date) : '';
  const weekEnd = last7.length ? md(last7[last7.length - 1].date) : '';
  return { week, weekStart, weekEnd };
}

async function main(): Promise<void> {
  const now = new Date();
  const startYear = await fetchStartYear(LOGIN);
  const contributions = await fetchContributions(LOGIN, startYear, now);
  const authoredTotals = await fetchAuthoredTotals(LOGIN);
  const contributedTo = await fetchContributedTo(LOGIN);
  const langs = await fetchLanguages(LOGIN);
  const { currentStreak, longestStreak } = calculateStreaks(contributions.days);
  const contribYear = contributions.days.slice(-365).reduce((s, d) => s + d.count, 0);
  const weekView = buildWeekView(contributions.days);
  const out: StatsData = {
    name: LOGIN,
    commits: contributions.commits,
    prs: authoredTotals.prs,
    issues: authoredTotals.issues,
    reviews: contributions.reviews,
    contributedTo,
    currentStreak,
    longestStreak,
    contribYear,
    ...weekView,
    langs,
    updatedAt: iso(now),
  };
  writeFileSync('assets/stats-data.json', JSON.stringify(out, null, 2));
  console.log(
    'wrote assets/stats-data.json',
    JSON.stringify({
      commits: contributions.commits,
      prs: authoredTotals.prs,
      issues: authoredTotals.issues,
      reviews: contributions.reviews,
      contributedTo,
      currentStreak,
      longestStreak,
      contribYear,
      langs: langs.map((l) => `${l.name} ${l.pct}%`),
    }),
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
