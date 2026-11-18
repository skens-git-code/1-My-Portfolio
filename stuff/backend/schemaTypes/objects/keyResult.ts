import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'keyResult',
  title: 'Key Outcome & Impact Metric',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Outcome Title',
      type: 'string',
      description: 'e.g., Performance Boost, Conversion Rate, Latency Reduction',
      placeholder: 'Page Load Speed',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'metric',
      title: 'Metric / Quantitative Impact',
      type: 'string',
      description: 'e.g., +40%, -65ms, 10,000+ Users',
      placeholder: '+40% Faster',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Context / Explanation',
      type: 'text',
      rows: 2,
      description: 'Brief context explaining how this outcome was achieved',
      placeholder: 'Optimized server-side caching and minimized client JavaScript bundle.',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'metric',
    },
    prepare({title, subtitle}) {
      return {
        title: title || 'Key Result',
        subtitle: subtitle ? `Impact: ${subtitle}` : undefined,
      }
    },
  },
})
