import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'siteSettings',
  title: 'Site Settings & Global SEO',
  type: 'document',
  fieldsets: [
    {
      name: 'general',
      title: '🌐 Global Metadata',
      options: {collapsible: false, collapsed: false},
    },
    {
      name: 'metrics',
      title: '📊 Impact & Statistic Counters',
      options: {collapsible: true, collapsed: false},
    },
    {
      name: 'seo',
      title: '🔍 Default SEO & Social Sharing',
      options: {collapsible: true, collapsed: false},
    },
    {
      name: 'footer',
      title: '📑 Footer & Copyright',
      options: {collapsible: true, collapsed: true},
    },
  ],
  fields: [
    defineField({
      name: 'siteTitle',
      title: 'Site Title',
      type: 'string',
      fieldset: 'general',
      placeholder: "Sarthak's Mathapati | ASI Software Engineer",
      initialValue: "Sarthak's Mathapati | ASI Software Engineer",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'siteUrl',
      title: 'Primary Domain / Site URL',
      type: 'url',
      fieldset: 'general',
      placeholder: 'https://portfolioskens.vercel.app',
      initialValue: 'https://portfolioskens.vercel.app',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'brandName',
      title: 'Brand / Logo Text',
      type: 'string',
      fieldset: 'general',
      placeholder: 'skens.space',
      initialValue: 'skens.space',
    }),

    // --- Statistics & Impact Counters ---
    defineField({
      name: 'impactMetrics',
      title: 'Impact Statistics',
      type: 'array',
      fieldset: 'metrics',
      description: 'Animated counters shown in the Impact & Statistics section',
      of: [{type: 'statMetric'}],
      initialValue: [
        {label: 'Projects Completed', value: '20+', numericCount: 20, iconClass: 'fas fa-rocket'},
        {label: 'Happy Clients', value: '50+', numericCount: 50, iconClass: 'fas fa-smile'},
        {label: 'Technologies', value: '150+', numericCount: 150, iconClass: 'fas fa-laptop-code'},
        {label: 'Code Commits', value: '1000+', numericCount: 1000, iconClass: 'fas fa-code-branch'},
      ],
    }),

    // --- SEO ---
    defineField({
      name: 'defaultSeo',
      title: 'Default SEO Configuration',
      type: 'seo',
      fieldset: 'seo',
    }),

    // --- Footer ---
    defineField({
      name: 'footerTagline',
      title: 'Footer Closing Tagline',
      type: 'string',
      fieldset: 'footer',
      placeholder: "Thanks for visiting — let's build something meaningful.",
      initialValue: "Thanks for visiting — let's build something meaningful.",
    }),
    defineField({
      name: 'copyrightNotice',
      title: 'Copyright Notice',
      type: 'string',
      fieldset: 'footer',
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
        title: title || 'Site Settings',
        subtitle: subtitle || 'Global Website Configuration',
      }
    },
  },
})
