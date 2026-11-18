import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fieldsets: [
    {
      name: 'general',
      title: '📌 Core Details',
      options: {collapsible: false, collapsed: false},
    },
    {
      name: 'classification',
      title: '🏷️ Category & Highlighting',
      options: {collapsible: true, collapsed: false},
    },
    {
      name: 'media',
      title: '🖼️ Visual Assets & Media',
      options: {collapsible: true, collapsed: false},
    },
    {
      name: 'links',
      title: '🔗 Project Links & URLs',
      options: {collapsible: true, collapsed: false},
    },
    {
      name: 'caseStudy',
      title: '📖 Case Study (Challenge, Solution & Impact)',
      options: {collapsible: true, collapsed: true},
    },
    {
      name: 'seo',
      title: '🌐 SEO & Social Metadata',
      options: {collapsible: true, collapsed: true},
    },
  ],
  fields: [
    // --- Core Details ---
    defineField({
      name: 'title',
      title: 'Project Title',
      type: 'string',
      fieldset: 'general',
      description: 'The primary headline name of the project',
      placeholder: 'e.g. Advanced Financial Planning & Budgeting Architecture',
      validation: (Rule) => Rule.required().min(2).max(120),
    }),
    defineField({
      name: 'slug',
      title: 'URL Slug',
      type: 'slug',
      fieldset: 'general',
      description: 'Click "Generate" to automatically create the URL slug from the title',
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
      fieldset: 'general',
      description: 'A crisp, professional summary sentence used in card headers or preview pills',
      placeholder: 'e.g. Intelligent cash flow management and budget tracking workspace',
    }),
    defineField({
      name: 'description',
      title: 'Short Description',
      type: 'text',
      fieldset: 'general',
      rows: 3,
      description: 'Overview text displayed directly on project cards in the portfolio grid',
      placeholder: 'Master your cash flow with a modern platform that combines smart online budgeting...',
      validation: (Rule) => Rule.required().min(10).max(400),
    }),

    // --- Classification & Hierarchy ---
    defineField({
      name: 'category',
      title: 'Primary Category',
      type: 'string',
      fieldset: 'classification',
      description: 'Used for interactive filtering pills on the portfolio frontend',
      options: {
        list: [
          {title: 'Full Stack Web App', value: 'fullstack'},
          {title: 'Frontend Web App', value: 'web'},
          {title: 'Artificial Intelligence & ML', value: 'ai'},
          {title: 'Mobile Application', value: 'mobile'},
          {title: 'Cloud & Infrastructure', value: 'cloud'},
          {title: 'Open Source & Dev Tools', value: 'tools'},
        ],
        layout: 'dropdown',
      },
      initialValue: 'fullstack',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'badge',
      title: 'Card Badge Label',
      type: 'string',
      fieldset: 'classification',
      description: 'Badge pill displayed over the thumbnail (e.g., Full Stack, AI Engine, Production)',
      placeholder: 'Full Stack',
      initialValue: 'Full Stack',
    }),
    defineField({
      name: 'featured',
      title: '🌟 Featured Project',
      type: 'boolean',
      fieldset: 'classification',
      description: 'Toggle on to highlight this project at the top of the showcase and in hero highlights',
      initialValue: false,
    }),
    defineField({
      name: 'order',
      title: 'Display Order Priority',
      type: 'number',
      fieldset: 'classification',
      description: 'Lower numbers appear first (e.g. 1 is highest priority)',
      initialValue: 10,
    }),
    defineField({
      name: 'technologies',
      title: 'Technologies & Tech Stack',
      type: 'array',
      fieldset: 'classification',
      description: 'Technologies used in this project (e.g., React, Node.js, MongoDB, Three.js)',
      of: [{type: 'string'}],
      options: {
        layout: 'tags',
      },
    }),

    // --- Media & Visual Assets ---
    defineField({
      name: 'image',
      title: 'Cover / Hero Thumbnail',
      type: 'image',
      fieldset: 'media',
      description: 'Main presentation image for project cards and case study hero',
      options: {
        hotspot: true,
      },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative Text (Accessibility)',
          type: 'string',
          description: 'Describe the image for screen readers and SEO',
          initialValue: 'Project preview screenshot',
        }),
      ],
    }),
    defineField({
      name: 'gallery',
      title: 'Screenshot Gallery',
      type: 'array',
      fieldset: 'media',
      description: 'Additional high-resolution screenshots and UI mockups',
      of: [
        {
          type: 'image',
          options: {hotspot: true},
          fields: [
            {
              name: 'caption',
              title: 'Caption',
              type: 'string',
            },
            {
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
            },
          ],
        },
      ],
    }),

    // --- Links & Repositories ---
    defineField({
      name: 'liveUrl',
      title: 'Live Demo URL',
      type: 'url',
      fieldset: 'links',
      description: 'Public production deployment URL (e.g. https://project.vercel.app)',
      placeholder: 'https://myproject.vercel.app',
      validation: (Rule) =>
        Rule.uri({
          scheme: ['http', 'https'],
        }),
    }),
    defineField({
      name: 'githubUrl',
      title: 'GitHub Repository URL',
      type: 'url',
      fieldset: 'links',
      description: 'Public source code repository link',
      placeholder: 'https://github.com/skens-git-code/myproject',
      validation: (Rule) =>
        Rule.uri({
          scheme: ['http', 'https'],
        }),
    }),
    defineField({
      name: 'docsUrl',
      title: 'Documentation URL',
      type: 'url',
      fieldset: 'links',
      description: 'API reference or project documentation link (optional)',
      placeholder: 'https://docs.myproject.com',
    }),

    // --- Case Study & Impact Analysis ---
    defineField({
      name: 'caseStudy',
      title: 'Detailed Case Study',
      type: 'object',
      fieldset: 'caseStudy',
      description: 'Structured narrative detailing the problem, solution architecture, and tangible results',
      fields: [
        defineField({
          name: 'challenge',
          title: 'The Challenge / Problem Statement',
          type: 'text',
          rows: 3,
          description: 'What obstacle, performance bottleneck, or user friction did this project solve?',
          placeholder: 'Financial systems often struggle with real-time reconciliations and unified transaction categorization...',
        }),
        defineField({
          name: 'solution',
          title: 'Architecture & Solution',
          type: 'text',
          rows: 3,
          description: 'How was the solution engineered and implemented?',
          placeholder: 'Engineered a modern microservices architecture utilizing Node.js, reactive MongoDB queries, and Stripe webhooks...',
        }),
        defineField({
          name: 'results',
          title: 'Measurable Outcomes & Results',
          type: 'text',
          rows: 3,
          description: 'Performance gains, adoption metrics, or business impact',
          placeholder: 'Delivered 40% faster latency, reduced sync overhead, and supported thousands of concurrent transactions.',
        }),
        defineField({
          name: 'body',
          title: 'Long-Form Case Study Article',
          type: 'blockContent',
          description: 'Full rich text write-up with formatted headers, quotes, and diagrams',
        }),
      ],
    }),
    defineField({
      name: 'metrics',
      title: 'Key Result Badges',
      type: 'array',
      fieldset: 'caseStudy',
      description: 'Punchy metrics shown on modals (e.g. "+40% Speed", "10k+ Users")',
      of: [{type: 'keyResult'}],
    }),

    // --- SEO & Metadata ---
    defineField({
      name: 'seo',
      title: 'SEO Settings',
      type: 'seo',
      fieldset: 'seo',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Publication Date',
      type: 'date',
      fieldset: 'general',
      initialValue: () => new Date().toISOString().split('T')[0],
    }),
  ],

  // --- Studio Preview Configuration ---
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
        web: 'Frontend Web',
        ai: 'AI & ML',
        mobile: 'Mobile',
        cloud: 'Cloud / DevOps',
        tools: 'Dev Tool',
      }
      const categoryName = (category && categoryLabels[category]) || category || 'General'
      const star = featured ? ' ⭐' : ''
      return {
        title: `${title || 'Untitled Project'}${star}`,
        subtitle: `${categoryName}${badge ? ` · [${badge}]` : ''}`,
        media,
      }
    },
  },

  // --- Default Studio Ordering ---
  orderings: [
    {
      title: 'Order Priority (Low to High)',
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
      title: 'Publication Date (Newest)',
      name: 'publishedAtDesc',
      by: [{field: 'publishedAt', direction: 'desc'}],
    },
  ],
})
