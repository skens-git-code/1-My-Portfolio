import {defineType, defineField} from 'sanity'
import {CommentIcon} from '@sanity/icons/Comment'
import {UserIcon} from '@sanity/icons/User'
import {CaseIcon} from '@sanity/icons/Case'

export default defineType({
  name: 'testimonial',
  title: 'Testimonial & Endorsement',
  type: 'document',
  icon: CommentIcon,
  groups: [
    {name: 'review', title: 'Quote & Rating', icon: CommentIcon, default: true},
    {name: 'author', title: 'Author Details', icon: UserIcon},
    {name: 'context', title: 'Project Context', icon: CaseIcon},
  ],
  fields: [
    // --- Review Group ---
    defineField({
      name: 'quote',
      title: 'Testimonial Quote / Endorsement',
      type: 'text',
      rows: 4,
      group: 'review',
      placeholder: 'Sarthak demonstrated exceptional problem solving, high-performance architecture...',
      validation: (Rule) => Rule.required().min(10).max(600),
    }),
    defineField({
      name: 'rating',
      title: 'Star Rating',
      type: 'number',
      group: 'review',
      options: {
        list: [
          {title: '⭐⭐⭐⭐⭐ (5 Stars)', value: 5},
          {title: '⭐⭐⭐⭐ (4 Stars)', value: 4},
          {title: '⭐⭐⭐ (3 Stars)', value: 3},
        ],
        layout: 'radio',
      },
      initialValue: 5,
    }),

    // --- Author Group ---
    defineField({
      name: 'name',
      title: 'Client / Colleague Full Name',
      type: 'string',
      group: 'author',
      placeholder: 'e.g. Alex Morgan',
      validation: (Rule) => Rule.required().min(2),
    }),
    defineField({
      name: 'role',
      title: 'Designation / Title',
      type: 'string',
      group: 'author',
      placeholder: 'e.g. VP of Engineering, Lead Architect, Founder',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'company',
      title: 'Company / Organization',
      type: 'string',
      group: 'author',
      placeholder: 'e.g. Tech Innovations Inc.',
    }),
    defineField({
      name: 'avatar',
      title: 'Photo / Headshot',
      type: 'image',
      group: 'author',
      options: {hotspot: true},
    }),
    defineField({
      name: 'linkedinUrl',
      title: 'LinkedIn Profile URL',
      type: 'url',
      group: 'author',
      placeholder: 'https://linkedin.com/in/...',
      validation: (Rule) =>
        Rule.uri({
          scheme: ['http', 'https'],
        }),
    }),

    // --- Context Group ---
    defineField({
      name: 'project',
      title: 'Associated Project Reference',
      type: 'reference',
      to: [{type: 'project'}],
      group: 'context',
      description: 'Optionally link this recommendation directly to a portfolio project',
    }),
    defineField({
      name: 'order',
      title: 'Display Priority Order',
      type: 'number',
      group: 'context',
      initialValue: 1,
    }),
  ],

  preview: {
    select: {
      name: 'name',
      role: 'role',
      company: 'company',
      rating: 'rating',
      media: 'avatar',
    },
    prepare({name, role, company, rating, media}) {
      const stars = '★'.repeat(rating || 5)
      return {
        title: `${name || 'Anonymous'} (${stars})`,
        subtitle: `${role || ''}${company ? ` at ${company}` : ''}`,
        media: media || CommentIcon,
      }
    },
  },
})
