import KEYWORD_DICT from './tag-keywords.json' with { type: 'json' };

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function safeKeywordForLog(keyword) {
  try {
    return String(keyword);
  } catch {
    return '[unstringifiable-keyword]';
  }
}

function buildRegex(keyword) {
  try {
    const escaped = escapeRegex(keyword);
    return new RegExp(`\\b${escaped}\\b`, 'i');
  } catch (error) {
    console.warn(
      `[tags] Failed to build regex for keyword: ${safeKeywordForLog(keyword)} (${error.message})`
    );
    return null;
  }
}

function buildDeveloperCorpus(dev) {
  const topRepos = Array.isArray(dev?.top_repos) ? dev.top_repos : [];
  const digestRepos = Array.isArray(dev?.digest_repos) ? dev.digest_repos : [];
  const topLangs = Array.isArray(dev?.top_languages) ? dev.top_languages : [];

  const parts = [
    dev?.bio == null ? '' : String(dev.bio),
    ...topRepos.map((repo) => (repo?.name == null ? '' : String(repo.name))),
    ...topRepos.map((repo) => (repo?.description == null ? '' : String(repo.description))),
    ...topRepos.map((repo) => (repo?.language == null ? '' : String(repo.language))),
    ...digestRepos.map((repo) => (repo?.name == null ? '' : String(repo.name))),
    ...digestRepos.map((repo) => (repo?.description == null ? '' : String(repo.description))),
    ...digestRepos.map((repo) => (repo?.language == null ? '' : String(repo.language))),
    ...topLangs.map((language) => (language == null ? '' : String(language)))
  ];

  return parts.join(' ').toLowerCase();
}

function matchTagsForDeveloper(dev, keywordDict = KEYWORD_DICT) {
  const corpus = buildDeveloperCorpus(dev);
  const matchedTags = [];

  for (const [tag, keywords] of Object.entries(keywordDict)) {
    if (!Array.isArray(keywords) || keywords.length === 0) {
      continue;
    }

    const matched = keywords.some((keyword) => {
      const regex = buildRegex(keyword);
      if (!regex) {
        return false;
      }

      return regex.test(corpus);
    });

    if (matched) {
      matchedTags.push(tag);
    }
  }

  return matchedTags;
}

export {
  KEYWORD_DICT,
  escapeRegex,
  safeKeywordForLog,
  buildRegex,
  buildDeveloperCorpus,
  matchTagsForDeveloper
};
