import type {StructureResolver} from 'sanity/structure'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Portfolio Content Dashboard')
    .items([
      // Singleton 1: Personal Profile
      S.listItem()
        .title('👤 Personal Profile & Bio')
        .id('profile')
        .child(
          S.document()
            .schemaType('profile')
            .documentId('profile')
            .title('Personal Profile & Bio')
        ),

      // Singleton 2: Site Settings
      S.listItem()
        .title('🌐 Site Settings & Global SEO')
        .id('siteSettings')
        .child(
          S.document()
            .schemaType('siteSettings')
            .documentId('siteSettings')
            .title('Site Settings & Global SEO')
        ),

      S.divider(),

      // Document Collections
      S.documentTypeListItem('project').title('🚀 Projects Showcase'),
      S.documentTypeListItem('experience').title('💼 Work Experience'),
      S.documentTypeListItem('education').title('🎓 Education & Credentials'),
      S.documentTypeListItem('skill').title('⚡ Skills & Tech Stack'),
      S.documentTypeListItem('testimonial').title('💬 Testimonials & Reviews'),
    ])
