// Lighthouse CI configuration for the frontend workspace.
//
// The npm scripts `lhci:collect` / `lhci:assert` reference this file, but it
// was missing from the repo, so the commands failed immediately. This config
// starts the production server (port 5000, matching the `start` script),
// audits the home page plus the marketplace, and enforces the non-negotiable
// accessibility budget while treating performance as a warning budget so
// flaky CI environments don't block merges.

const BASE_URL = 'http://localhost:5000';

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'Ready in',
      url: [`${BASE_URL}/en`, `${BASE_URL}/en/marketplace`],
      numberOfRuns: 1,
      settings: {
        chromeFlags: '--no-sandbox --headless',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.5 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};