/**
 * Sanity Environment Configuration
 * Safe for both browser and server environments
 */

export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2026-03-01'
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'im67x7za'

export const studioUrl = '/studio'
