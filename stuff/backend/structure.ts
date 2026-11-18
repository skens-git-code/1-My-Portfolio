import type {StructureResolver} from 'sanity/structure'
import {UserIcon} from '@sanity/icons/User'
import {CogIcon} from '@sanity/icons/Cog'
import {CaseIcon} from '@sanity/icons/Case'
import {TimelineIcon} from '@sanity/icons/Timeline'
import {BookIcon} from '@sanity/icons/Book'
import {BoltIcon} from '@sanity/icons/Bolt'
import {CommentIcon} from '@sanity/icons/Comment'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content Dashboard')
    .items([
      // Singleton 1: Personal Profile
      S.listItem()
        .title('Personal Profile & Bio')
        .id('profile')
        .icon(UserIcon)
        .child(
          S.document()
            .schemaType('profile')
            .documentId('profile')
            .title('Personal Profile & Bio')
        ),

      // Singleton 2: Site Settings
      S.listItem()
        .title('Site Settings & Global SEO')
        .id('siteSettings')
        .icon(CogIcon)
        .child(
          S.document()
            .schemaType('siteSettings')
            .documentId('siteSettings')
            .title('Site Settings & Global SEO')
        ),

      S.divider(),

      // Document Collections with dedicated icons
      S.documentTypeListItem('project').title('Projects Showcase').icon(CaseIcon),
      S.documentTypeListItem('experience').title('Work Experience').icon(TimelineIcon),
      S.documentTypeListItem('education').title('Education & Credentials').icon(BookIcon),
      S.documentTypeListItem('skill').title('Skills & Tech Stack').icon(BoltIcon),
      S.documentTypeListItem('testimonial').title('Testimonials & Reviews').icon(CommentIcon),
    ])
