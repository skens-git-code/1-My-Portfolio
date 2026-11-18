import project from './documents/project'
import profile from './documents/profile'
import experience from './documents/experience'
import education from './documents/education'
import skill from './documents/skill'
import testimonial from './documents/testimonial'
import siteSettings from './documents/siteSettings'

import blockContent from './objects/blockContent'
import seo from './objects/seo'
import socialLink from './objects/socialLink'
import statMetric from './objects/statMetric'
import keyResult from './objects/keyResult'

export const schemaTypes = [
  // Document Schemas
  project,
  profile,
  experience,
  education,
  skill,
  testimonial,
  siteSettings,

  // Reusable Object Schemas
  blockContent,
  seo,
  socialLink,
  statMetric,
  keyResult,
]
