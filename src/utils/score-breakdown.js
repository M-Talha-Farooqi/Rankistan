import { computeActivityBreakdown30d } from './activity-score.js';

export const ACTIVITY_TYPE_ROWS = [
  { typeKey: 'push', eventType: 'PushEvent', label: 'PushEvent' },
  { typeKey: 'pr', eventType: 'PullRequestEvent', label: 'PullRequestEvent' },
  { typeKey: 'issue', eventType: 'IssuesEvent', label: 'IssuesEvent' },
  { typeKey: 'release', eventType: 'ReleaseEvent', label: 'ReleaseEvent' }
];

function daysSince(date) {
  if (!date) {
    return Number.POSITIVE_INFINITY;
  }
  const ts = new Date(date).getTime();
  if (Number.isNaN(ts)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
}

export function computeDeveloperScoreBreakdown({
  config,
  events,
  totalStars,
  followers,
  publicRepos,
  createdAt
}) {
  if (!config || typeof config !== 'object') {
    throw new Error('score-breakdown: config is required');
  }

  const starWeight = config.STAR_WEIGHT ?? 2;
  const maxStars = config.MAX_STARS_FOR_SCORING ?? 250;
  const maxFollowers = config.MAX_FOLLOWERS_FOR_SCORING ?? 500;
  const sixMonthsDays = config.SIX_MONTHS_DAYS ?? 180;
  const followerWeight = config.WEIGHTS?.followers ?? 1;
  const publicRepoWeight = config.WEIGHTS?.publicRepos ?? 0.5;

  const rawStars = Math.max(0, Math.floor(Number(totalStars) || 0));
  const cappedStars = Math.min(rawStars, maxStars);
  const starsPoints = cappedStars * starWeight;

  const rawFollowers = Math.max(0, Math.floor(Number(followers) || 0));
  const cappedFollowers = Math.min(rawFollowers, maxFollowers);
  const followersPoints = cappedFollowers * followerWeight;

  const repoCount = Math.max(0, Math.floor(Number(publicRepos) || 0));
  const publicReposPoints = repoCount * publicRepoWeight;

  const activity = computeActivityBreakdown30d(events, { config });

  const baseScore =
    starsPoints + activity.total + followersPoints + publicReposPoints;

  const accountAgeDays = daysSince(createdAt);
  const agePenaltyApplied = accountAgeDays < sixMonthsDays;
  const ageMultiplier = agePenaltyApplied ? 0.5 : 1;
  const finalScore = Math.round(baseScore * ageMultiplier);
  const penaltyPointsLost = agePenaltyApplied
    ? Math.round(baseScore - finalScore)
    : 0;

  return {
    stars: {
      raw: rawStars,
      capped: cappedStars,
      weight: starWeight,
      points: starsPoints,
      capApplied: rawStars > cappedStars
    },
    followers: {
      raw: rawFollowers,
      capped: cappedFollowers,
      points: followersPoints,
      capApplied: rawFollowers > cappedFollowers
    },
    publicRepos: {
      count: repoCount,
      weight: publicRepoWeight,
      points: publicReposPoints
    },
    activity: {
      total: activity.total,
      byType: activity.byType
    },
    baseScore,
    agePenalty: {
      applied: agePenaltyApplied,
      multiplier: ageMultiplier,
      accountAgeDays: Number.isFinite(accountAgeDays) ? accountAgeDays : null,
      pointsLost: penaltyPointsLost,
      label: agePenaltyApplied ? '0.5× new account penalty' : null
    },
    finalScore
  };
}
