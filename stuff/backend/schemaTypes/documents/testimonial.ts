import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'testimonial',
  title: 'Testimonial & Endorsement',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Full Name',
      type: 'string',
      placeholder: 'e.g. Sarah Jenkins',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Role / Designation',
      type: 'string',
      placeholder: 'e.g. Lead Software Architect, Founder & CEO',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'company',
      title: 'Company / Organization',
      type: 'string',
      placeholder: 'e.g. TechCorp, Stealth Startup',
    }),
    defineField({
      name: 'avatar',
      title: 'Avatar / Photo',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'quote',
      title: 'Testimonial / Review Quote',
      type: 'text',
      rows: 4,
      placeholder: 'Sarthak demonstrated exceptional problem solving and architectural rigor...',
      validation: (Rule) => Rule.required().min(10),
    }),
    defineField({
      name: 'rating',
      title: 'Star Rating',
      type: 'number',
      options: {
        list: [
          {title: '⭐⭐⭐⭐⭐ (5 Stars)', value: 5},
          {title: '⭐⭐⭐⭐ (4 Stars)', value: 4},
          {title: '⭐⭐⭐ (3 Stars)', value: 3},
        ],
      },
      initialValue: 5,
    }),
    defineField({
      name: 'project',
      title: 'Associated Project (Optional)',
      type: 'reference',
      to: [{type: 'project'}],
      description: 'Select the project this testimonial is related to',
    }),
    defineField({
      name: 'linkedinUrl',
      title: 'LinkedIn Profile URL',
      type: 'url',
      placeholder: 'https://linkedin.com/in/...',
    }),
    defineField({
      name: 'order',
      title: 'Display Order Priority',
      type: 'number',
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
        media,
      }
    },
  },
})
