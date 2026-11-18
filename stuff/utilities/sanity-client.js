/**
 * Lightweight Zero-Dependency Sanity Client
 * Connects directly to Sanity Content Lake via standard REST API / CDN.
 */

const SANITY_CONFIG = {
  projectId: 'im67x7za',
  dataset: 'production',
  apiVersion: '2026-03-01',
  useCdn: true,
};

/**
 * Fetch documents using a GROQ query
 * @param {string} query - GROQ query string
 * @param {Record<string, any>} [params] - Query parameters
 * @returns {Promise<any>}
 */
async function sanityFetch(query, params = {}) {
  const cdnHost = SANITY_CONFIG.useCdn ? 'apicdn.sanity.io' : 'api.sanity.io';
  const url = new URL(`https://${SANITY_CONFIG.projectId}.${cdnHost}/v${SANITY_CONFIG.apiVersion}/data/query/${SANITY_CONFIG.dataset}`);
  url.searchParams.set('query', query);

  Object.entries(params).forEach(([key, val]) => {
    url.searchParams.set(`$${key}`, JSON.stringify(val));
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Sanity query failed: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return data.result;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SANITY_CONFIG, sanityFetch };
} else if (typeof window !== 'undefined') {
  window.SanityClient = { config: SANITY_CONFIG, fetch: sanityFetch };
}
