/**
 * Single place to build public survey URLs for emails and API responses.
 * Guards against placeholder FRONTEND_URL (e.g. http://frontend_url) and
 * accidental doubled URLs in the link string.
 */

const DEFAULT_SURVEY_BASE = 'https://northwind-survey-frontend.onrender.com';

function getSurveyBaseUrl() {
  const raw = (process.env.FRONTEND_URL || '').trim().replace(/\/$/, '');
  if (!raw) return DEFAULT_SURVEY_BASE;
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const { hostname } = new URL(withScheme);
    const h = (hostname || '').toLowerCase();
    if (!h || h === 'frontend_url') return DEFAULT_SURVEY_BASE;
    return raw.replace(/\/$/, '');
  } catch {
    return DEFAULT_SURVEY_BASE;
  }
}

/** First 64-char hex token found in a string (survey path or raw token). */
function extractSurveyToken(input) {
  if (input == null) return null;
  const m = String(input).match(/([a-f0-9]{64})/i);
  return m ? m[1].toLowerCase() : null;
}

/** If the whole string is two identical halves (common copy/paste bug), keep one half. */
function dedupeDoubledUrl(s) {
  const u = String(s).trim();
  const half = Math.floor(u.length / 2);
  if (half >= 40 && u.slice(0, half) === u.slice(half)) return u.slice(0, half);
  return u;
}

/**
 * Build a canonical survey URL from a DB token or from a previously built URL.
 */
function buildSurveyLink(tokenOrUrl) {
  const cleaned = dedupeDoubledUrl(tokenOrUrl);
  const token = extractSurveyToken(cleaned);
  if (!token) {
    throw new Error('Invalid survey token: could not find 64-char hex token');
  }
  const base = getSurveyBaseUrl();
  return `${base}/survey/${token}`;
}

/**
 * Normalize any survey link string for use in HTML emails (dedupe + fix bad host + single canonical URL).
 */
function normalizeSurveyLink(input) {
  if (!input || typeof input !== 'string') return input;
  try {
    return buildSurveyLink(input);
  } catch {
    return dedupeDoubledUrl(input).trim();
  }
}

module.exports = {
  getSurveyBaseUrl,
  extractSurveyToken,
  buildSurveyLink,
  normalizeSurveyLink,
  dedupeDoubledUrl,
  DEFAULT_SURVEY_BASE
};
