/**
 * Sanity Client Configuration (Next.js / TypeScript compatible)
 * Implements Sanity Best Practices with cached read queries and typed fetch.
 */

import {createClient} from '@sanity/client'
import {apiVersion, dataset, projectId} from './env'

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true, // Fast, cached published-content reads
})

export default client
