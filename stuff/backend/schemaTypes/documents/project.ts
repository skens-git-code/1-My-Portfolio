import {defineType, defineField, defineArrayMember} from 'sanity'
import {CaseIcon} from '@sanity/icons/Case'
import {TagIcon} from '@sanity/icons/Tag'
import {ImageIcon} from '@sanity/icons/Image'
import {LinkIcon} from '@sanity/icons/Link'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {SearchIcon} from '@sanity/icons/Search'

export default defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  icon: CaseIcon,
  groups: [
    {name: 'details', title: 'Core Details', icon: CaseIcon, default: true},
    {name: 'classification', title: 'Category & Tags', icon: TagIcon},
    {name: 'media', title: 'Media & Gallery', icon: ImageIcon},
    {name: 'links', title: 'Demo & Code', icon: LinkIcon},
    {name: 'caseStudy', title: 'Case Study', icon: DocumentTextIcon},
    {name: 'seo', title: 'SEO & Sharing', icon: SearchIcon},
  ],
  fields: [
    // --- Core Details Group ---
    defineField({
      name: 'title',
      title: 'Project Title',
      type: 'string',
      group: 'details',
      description: 'Headline project title displayed on cards and modals',
      placeholder: 'e.g. Advanced Financial Planning & Budgeting Architecture',
      validation: (Rule) => Rule.required().min(3).max(120),
    }),
    defineField({
      name: 'slug',
      title: 'URL Slug',
      type: 'slug',
      group: 'details',
      description: 'Click "Generate" to create a web-safe URL slug automatically',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline / One-Liner',
      type: 'string',
      group: 'details',
      description: 'Quick summary sentence for modal subtitles and previews',
      placeholder: 'e.g. Intelligent cash flow management and budget tracking workspace',
    }),
    defineField({
      name: 'description',
      title: 'Short Summary',
      type: 'text',
      group: 'details',
      rows: 3,
      description: 'Overview copy displayed directly on the project card in the grid',
      placeholder: 'Master your cash flow with a modern platform that combines smart online budgeting...',
      validation: (Rule) => Rule.required().min(10).max(450),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Release / Completion Date',
      type: 'date',
      group: 'details',
      initialValue: () => new Date().toISOString().split('T')[0],
    }),

    // --- Classification Group ---
    defineField({
      name: 'category',
      title: 'Filter Category',
      type: 'string',
      group: 'classification',
      description: 'Category used by the interactive filter pills on the site',
      options: {
        list: [
          {title: 'Full Stack Web App', value: 'fullstack'},
          {title: 'Frontend Web App', value: 'web'},
          {title: 'Artificial Intelligence & ML', value: 'ai'},
          {title: 'Mobile Application', value: 'mobile'},
          {title: 'Cloud & Infrastructure', value: 'cloud'},
          {title: 'Developer Tools & Open Source', value: 'tools'},
        ],
        layout: 'dropdown',
      },
      initialValue: 'fullstack',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'badge',
      title: 'Card Badge Pill',
      type: 'string',
      group: 'classification',
      description: 'Badge pill overlaid on the thumbnail (e.g., Full Stack, AI Powered, Production)',
      placeholder: 'Full Stack',
      initialValue: 'Full Stack',
    }),
    defineField({
      name: 'featured',
      title: '⭐ Highlight / Featured Project',
      type: 'boolean',
      group: 'classification',
      description: 'Pins this project to the hero highlights and top of the showcase',
      initialValue: false,
    }),
    defineField({
      name: 'order',
      title: 'Display Priority Order',
      type: 'number',
      group: 'classification',
      description: 'Lower numbers appear first (e.g., 1 is first)',
      initialValue: 10,
    }),
    defineField({
      name: 'technologies',
      title: 'Tech Stack (Tags)',
      type: 'array',
      group: 'classification',
      description: 'Enter technology names and press Enter (e.g. React, Node.js, MongoDB)',
      of: [defineArrayMember({type: 'string'})],
      options: {
        layout: 'tags',
      },
    }),

    // --- Media Group ---
    defineField({
      name: 'image',
      title: 'Cover Thumbnail',
      type: 'image',
      group: 'media',
      description: 'High-res thumbnail for the project card and case study hero',
      options: {
        hotspot: true,
      },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt Text (Accessibility)',
          type: 'string',
          initialValue: 'Project preview screenshot',
        }),
      ],
    }),
    defineField({
      name: 'gallery',
      title: 'Screenshots & UI Gallery',
      type: 'array',
      group: 'media',
      description: 'Additional screenshots displayed inside the project detail modal',
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [
            defineField({
              name: 'caption',
              title: 'Caption',
              type: 'string',
            }),
            defineField({
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
            }),
          ],
        }),
      ],
    }),

    // --- Links Group ---
    defineField({
      name: 'liveUrl',
      title: 'Live Demo URL',
      type: 'url',
      group: 'links',
      description: 'Public production deployment URL',
      placeholder: 'https://project.vercel.app',
      validation: (Rule) =>
        Rule.uri({
          scheme: ['http', 'https'],
        }),
    }),
    defineField({
      name: 'githubUrl',
      title: 'GitHub Repository URL',
      type: 'url',
      group: 'links',
      description: 'Source code repository link',
      placeholder: 'https://github.com/skens-git-code/project',
      validation: (Rule) =>
        Rule.uri({
          scheme: ['http', 'https'],
        }),
    }),
    defineField({
      name: 'docsUrl',
      title: 'Documentation / Architecture URL',
      type: 'url',
      group: 'links',
      description: 'Link to technical docs or research paper (optional)',
      placeholder: 'https://docs.project.com',
    }),

    // --- Case Study Group ---
    defineField({
      name: 'caseStudy',
      title: 'Structured Case Study',
      type: 'object',
      group: 'caseStudy',
      description: 'Detailed problem-solving narrative for client presentations',
      fields: [
        defineField({
          name: 'challenge',
          title: 'The Challenge & Problem Statement',
          type: 'text',
          rows: 3,
          placeholder: 'What obstacles or latency bottlenecks were solved?',
        }),
        defineField({
          name: 'solution',
          title: 'Architecture & Solution',
          type: 'text',
          rows: 3,
          placeholder: 'How was the system engineered and implemented?',
        }),
        defineField({
          name: 'results',
          title: 'Measurable Outcomes',
          type: 'text',
          rows: 3,
          placeholder: 'e.g. 40% faster latency, 99.9% uptime, 10k users.',
        }),
        defineField({
          name: 'body',
          title: 'Long-Form Article (Rich Text)',
          type: 'blockContent',
          description: 'Full rich text write-up with headings, code blocks, and diagrams',
        }),
      ],
    }),
    defineField({
      name: 'metrics',
      title: 'Key Impact Badges',
      type: 'array',
      group: 'caseStudy',
      description: 'Metrics highlighted on modal headers (e.g. "+40% Speed", "10k+ Users")',
      of: [defineArrayMember({type: 'keyResult'})],
    }),

    // --- SEO Group ---
    defineField({
      name: 'seo',
      title: 'Project SEO Metadata',
      type: 'seo',
      group: 'seo',
    }),
  ],

  preview: {
    select: {
      title: 'title',
      category: 'category',
      badge: 'badge',
      featured: 'featured',
      media: 'image',
    },
    prepare({title, category, badge, featured, media}) {
      const categoryLabels: Record<string, string> = {
        fullstack: 'Full Stack',
        web: 'Frontend',
        ai: 'AI & ML',
        mobile: 'Mobile',
        cloud: 'Cloud',
        tools: 'Dev Tool',
      }
      const categoryName = (category && categoryLabels[category]) || category || 'General'
      const star = featured ? ' ⭐' : ''
      return {
        title: `${title || 'Untitled Project'}${star}`,
        subtitle: `${categoryName}${badge ? ` · [${badge}]` : ''}`,
        media: media || CaseIcon,
      }
    },
  },

  orderings: [
    {
      title: 'Display Priority (Low to High)',
      name: 'orderAsc',
      by: [{field: 'order', direction: 'asc'}],
    },
    {
      title: 'Featured First',
      name: 'featuredFirst',
      by: [
        {field: 'featured', direction: 'desc'},
        {field: 'order', direction: 'asc'},
      ],
    },
    {
      title: 'Release Date (Newest)',
      name: 'publishedAtDesc',
      by: [{field: 'publishedAt', direction: 'desc'}],
    },
  ],
})
