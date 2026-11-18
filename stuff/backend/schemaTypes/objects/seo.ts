import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'seo',
  title: 'SEO & Social Share',
  type: 'object',
  fields: [
    defineField({
      name: 'metaTitle',
      title: 'Meta Title',
      type: 'string',
      description: 'Search engine title (recommended: 50-60 characters)',
      placeholder: 'Sarthak Mathapati | AI Software Engineer & Full-Stack Architect',
      validation: (Rule) => Rule.max(70).warning('Titles longer than 70 characters may be truncated by search engines.'),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'text',
      rows: 3,
      description: 'Search engine snippet (recommended: 140-160 characters)',
      placeholder: 'Explore the portfolio, projects, and technical case studies of Sarthak Mathapati.',
      validation: (Rule) => Rule.max(160).warning('Descriptions longer than 160 characters may be truncated.'),
    }),
    defineField({
      name: 'keywords',
      title: 'SEO Keywords',
      type: 'array',
      of: [{type: 'string'}],
      options: {layout: 'tags'},
      description: 'Target keywords for SEO indexing',
    }),
    defineField({
      name: 'ogImage',
      title: 'Social Share Image (Open Graph / Twitter)',
      type: 'image',
      description: 'Preview banner shown when sharing on Twitter, LinkedIn, Discord (recommended: 1200x630px)',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative Text',
          type: 'string',
          description: 'Accessibility description for screen readers and search engines',
        }),
      ],
    }),
  ],
})
