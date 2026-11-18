import {defineType, defineField, defineArrayMember} from 'sanity'
import {TimelineIcon} from '@sanity/icons/Timeline'
import {CalendarIcon} from '@sanity/icons/Calendar'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'

export default defineType({
  name: 'experience',
  title: 'Work Experience',
  type: 'document',
  icon: TimelineIcon,
  groups: [
    {name: 'role', title: 'Role & Company', icon: TimelineIcon, default: true},
    {name: 'dates', title: 'Timeline & Status', icon: CalendarIcon},
    {name: 'responsibilities', title: 'Responsibilities', icon: DocumentTextIcon},
  ],
  fields: [
    // --- Role Group ---
    defineField({
      name: 'role',
      title: 'Job Title / Position',
      type: 'string',
      group: 'role',
      placeholder: 'e.g. AI Software Engineer, Full Stack Architect',
      validation: (Rule) => Rule.required().min(2),
    }),
    defineField({
      name: 'company',
      title: 'Company / Organization',
      type: 'string',
      group: 'role',
      placeholder: 'e.g. Newton School of Technology',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'companyUrl',
      title: 'Company Website URL',
      type: 'url',
      group: 'role',
      placeholder: 'https://example.com',
      validation: (Rule) =>
        Rule.uri({
          scheme: ['http', 'https'],
        }),
    }),
    defineField({
      name: 'companyLogo',
      title: 'Company Logo',
      type: 'image',
      group: 'role',
      options: {hotspot: true},
    }),
    defineField({
      name: 'employmentType',
      title: 'Employment Type',
      type: 'string',
      group: 'role',
      options: {
        list: [
          {title: 'Full-time', value: 'full-time'},
          {title: 'Part-time', value: 'part-time'},
          {title: 'Contract / Freelance', value: 'contract'},
          {title: 'Internship', value: 'internship'},
        ],
        layout: 'dropdown',
      },
      initialValue: 'full-time',
    }),
    defineField({
      name: 'location',
      title: 'Work Location',
      type: 'string',
      group: 'role',
      placeholder: 'Delhi, India / Remote',
      initialValue: 'Remote',
    }),

    // --- Dates Group ---
    defineField({
      name: 'startDate',
      title: 'Start Date',
      type: 'date',
      group: 'dates',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'isCurrent',
      title: 'Currently Working Here',
      type: 'boolean',
      group: 'dates',
      description: 'Toggle on if this is your active role (end date will be hidden and labeled "Present")',
      initialValue: false,
    }),
    defineField({
      name: 'endDate',
      title: 'End Date',
      type: 'date',
      group: 'dates',
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
      title: 'Display Order Priority',
      type: 'number',
      group: 'dates',
      description: 'Lower number appears first (e.g., 1 for most recent)',
      initialValue: 1,
    }),

    // --- Responsibilities Group ---
    defineField({
      name: 'summary',
      title: 'Role Summary',
      type: 'text',
      rows: 3,
      group: 'responsibilities',
      placeholder: 'Core mission, team scope, and primary engineering objectives...',
    }),
    defineField({
      name: 'achievements',
      title: 'Key Highlights & Achievements',
      type: 'array',
      group: 'responsibilities',
      description: 'Bullet points displayed on your experience card',
      of: [defineArrayMember({type: 'string'})],
    }),
    defineField({
      name: 'technologies',
      title: 'Technologies Used (Tags)',
      type: 'array',
      group: 'responsibilities',
      of: [defineArrayMember({type: 'string'})],
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
        media: media || TimelineIcon,
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
