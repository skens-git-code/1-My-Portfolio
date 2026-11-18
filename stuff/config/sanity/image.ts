/**
 * Sanity Image URL Builder
 * Generates optimized image URLs from Sanity image assets with hotspot/crop support.
 */

import imageUrlBuilder from '@sanity/image-url'
import {dataset, projectId} from './env'

const builder = imageUrlBuilder({
  projectId,
  dataset,
})

export function urlFor(source: any) {
  return builder.image(source)
}
