import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'experience',
  title: 'Work Experience',
  type: 'document',
  fieldsets: [
    {
      name: 'roleInfo',
      title: '💼 Role & Company',
      options: {collapsible: false, collapsed: false},
    },
    {
      name: 'dates',
      title: '📅 Duration & Timeline',
      options: {collapsible: true, collapsed: false},
    },
    {
      name: 'responsibilities',
      title: '📋 Responsibilities & Impact',
      options: {collapsible: true, collapsed: false},
    },
  ],
  fields: [
    defineField({
      name: 'role',
      title: 'Role / Job Title',
      type: 'string',
      fieldset: 'roleInfo',
      placeholder: 'e.g. AI Software Engineer, Full Stack Developer',
      validation: (Rule) => Rule.required().min(2),
    }),
    defineField({
      name: 'company',
      title: 'Company / Organization',
      type: 'string',
      fieldset: 'roleInfo',
      placeholder: 'e.g. Newton School, Tech Corp',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'companyUrl',
      title: 'Company Website',
      type: 'url',
      fieldset: 'roleInfo',
      placeholder: 'https://example.com',
    }),
    defineField({
      name: 'companyLogo',
      title: 'Company Logo',
      type: 'image',
      fieldset: 'roleInfo',
      options: {hotspot: true},
    }),
    defineField({
      name: 'employmentType',
      title: 'Employment Type',
      type: 'string',
      fieldset: 'roleInfo',
      options: {
        list: [
          {title: 'Full-time', value: 'full-time'},
          {title: 'Part-time', value: 'part-time'},
          {title: 'Internship', value: 'internship'},
          {title: 'Contract / Freelance', value: 'contract'},
        ],
      },
      initialValue: 'full-time',
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      fieldset: 'roleInfo',
      placeholder: 'Delhi, India / Remote',
      initialValue: 'Remote',
    }),

    // --- Dates & Timeline ---
    defineField({
      name: 'startDate',
      title: 'Start Date',
      type: 'date',
      fieldset: 'dates',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'isCurrent',
      title: 'Currently Working Here',
      type: 'boolean',
      fieldset: 'dates',
      initialValue: false,
    }),
    defineField({
      name: 'endDate',
      title: 'End Date',
      type: 'date',
      fieldset: 'dates',
      hidden: ({parent}) => parent?.isCurrent === true,
      validation: (Rule) =>
        Rule.custom((endDate, context) => {
          const parent = context.parent as {isCurrent?: boolean; startDate?: string} | undefined
          if (parent?.isCurrent) return true
          if (!endDate && !parent?.isCurrent) return 'End Date is required unless currently working here.'
          if (parent?.startDate && endDate && endDate < parent.startDate) {
            return 'End Date cannot precede Start Date.'
          }
          return true
        }),
    }),
    defineField({
      name: 'order',
      title: 'Display Priority Order',
      type: 'number',
      fieldset: 'dates',
      description: 'Lower number appears first (e.g., 1 for most recent)',
      initialValue: 1,
    }),

    // --- Responsibilities & Achievements ---
    defineField({
      name: 'summary',
      title: 'Brief Overview',
      type: 'text',
      rows: 3,
      fieldset: 'responsibilities',
      placeholder: 'Summarize your core mission and contributions at this company...',
    }),
    defineField({
      name: 'achievements',
      title: 'Key Achievements & Highlights',
      type: 'array',
      fieldset: 'responsibilities',
      description: 'Bullet points displayed on your experience card',
      of: [{type: 'string'}],
    }),
    defineField({
      name: 'technologies',
      title: 'Technologies Used',
      type: 'array',
      fieldset: 'responsibilities',
      of: [{type: 'string'}],
      options: {layout: 'tags'},
    }),
  ],

  preview: {
    select: {
      role: 'role',
      company: 'company',
      startDate: 'startDate',
      endDate: 'endDate',
      isCurrent: 'isCurrent',
      media: 'companyLogo',
    },
    prepare({role, company, startDate, endDate, isCurrent, media}) {
      const endStr = isCurrent ? 'Present' : endDate || 'N/A'
      return {
        title: `${role || 'Untitled Role'} at ${company || 'Unknown Company'}`,
        subtitle: `${startDate ? startDate.substring(0, 7) : ''} — ${endStr}`,
        media,
      }
    },
  },

  orderings: [
    {
      title: 'Display Order (Ascending)',
      name: 'orderAsc',
      by: [{field: 'order', direction: 'asc'}],
    },
    {
      title: 'Start Date (Newest First)',
      name: 'startDateDesc',
      by: [{field: 'startDate', direction: 'desc'}],
    },
  ],
})
