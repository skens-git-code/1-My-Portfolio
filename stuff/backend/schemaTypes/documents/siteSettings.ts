import {defineType, defineField, defineArrayMember} from 'sanity'
import {CogIcon} from '@sanity/icons/Cog'
import {EarthGlobeIcon} from '@sanity/icons/EarthGlobe'
import {BarChartIcon} from '@sanity/icons/BarChart'
import {SearchIcon} from '@sanity/icons/Search'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'

export default defineType({
  name: 'siteSettings',
  title: 'Site Settings & Global SEO',
  type: 'document',
  icon: CogIcon,
  groups: [
    {name: 'general', title: 'General Info', icon: EarthGlobeIcon, default: true},
    {name: 'metrics', title: 'Impact Metrics', icon: BarChartIcon},
    {name: 'seo', title: 'SEO & Sharing', icon: SearchIcon},
    {name: 'footer', title: 'Footer & Legal', icon: DocumentTextIcon},
  ],
  fields: [
    // --- General Group ---
    defineField({
      name: 'siteTitle',
      title: 'Site Title',
      type: 'string',
      group: 'general',
      description: 'The global browser title and meta header for the portfolio',
      placeholder: "Sarthak's Mathapati | ASI Software Engineer",
      initialValue: "Sarthak's Mathapati | ASI Software Engineer",
      validation: (Rule) => Rule.required().min(3).max(80),
    }),
    defineField({
      name: 'siteUrl',
      title: 'Primary Domain / Canonical URL',
      type: 'url',
      group: 'general',
      description: 'Your production website address',
      placeholder: 'https://www.skens.space',
      initialValue: 'https://www.skens.space',
      validation: (Rule) =>
        Rule.required().uri({
          scheme: ['http', 'https'],
        }),
    }),
    defineField({
      name: 'brandName',
      title: 'Brand / Monogram Logo Text',
      type: 'string',
      group: 'general',
      description: 'Short brand name shown in the navigation bar and loader',
      placeholder: 'skens.space',
      initialValue: 'skens.space',
      validation: (Rule) => Rule.required(),
    }),

    // --- Metrics Group ---
    defineField({
      name: 'impactMetrics',
      title: 'Impact Statistics Counters',
      type: 'array',
      group: 'metrics',
      description: 'Dynamic animated statistics shown in the Impact section (e.g. 20+ Projects Completed)',
      of: [
        defineArrayMember({
          type: 'statMetric',
        }),
      ],
      initialValue: [
        {label: 'Projects Completed', value: '20+', numericCount: 20, iconClass: 'fas fa-rocket'},
        {label: 'Happy Clients', value: '50+', numericCount: 50, iconClass: 'fas fa-smile'},
        {label: 'Technologies', value: '150+', numericCount: 150, iconClass: 'fas fa-laptop-code'},
        {label: 'Code Commits', value: '1000+', numericCount: 1000, iconClass: 'fas fa-code-branch'},
      ],
      validation: (Rule) => Rule.min(1).max(8).warning('Showing 4 statistics offers the best visual balance on desktop and mobile.'),
    }),

    // --- SEO Group ---
    defineField({
      name: 'defaultSeo',
      title: 'Default Search & Social Media Sharing (OpenGraph)',
      type: 'seo',
      group: 'seo',
      description: 'Fallback search engine snippet and social card when pages do not have specific metadata',
    }),

    // --- Footer Group ---
    defineField({
      name: 'footerTagline',
      title: 'Footer Tagline',
      type: 'string',
      group: 'footer',
      description: 'Closing callout message shown above the copyright line',
      placeholder: "Thanks for visiting — let's build something meaningful.",
      initialValue: "Thanks for visiting — let's build something meaningful.",
    }),
    defineField({
      name: 'copyrightNotice',
      title: 'Copyright Notice',
      type: 'string',
      group: 'footer',
      placeholder: '© 2026 Sarthak Mathapati. All rights reserved.',
      initialValue: '© 2026 Sarthak Mathapati. All rights reserved.',
    }),
  ],

  preview: {
    select: {
      title: 'siteTitle',
      subtitle: 'siteUrl',
    },
    prepare({title, subtitle}) {
      return {
        title: title || 'Global Site Settings',
        subtitle: subtitle || 'https://www.skens.space',
        media: CogIcon,
      }
    },
  },
})
