import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'statMetric',
  title: 'Statistic & Metric',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Metric Label',
      type: 'string',
      description: 'e.g., Projects Completed, Happy Clients, Code Commits',
      placeholder: 'Projects Completed',
      validation: (Rule) => Rule.required().min(2).max(50),
    }),
    defineField({
      name: 'value',
      title: 'Display Value',
      type: 'string',
      description: 'Formatted display string shown to users (e.g., 20+, 99.9%, 10K+)',
      placeholder: '20+',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'numericCount',
      title: 'Target Number for Counter Animation',
      type: 'number',
      description: 'Raw numerical value used by the JavaScript counter engine (e.g., 20 for 20+)',
      placeholder: 20,
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'iconClass',
      title: 'Icon Class (Optional)',
      type: 'string',
      description: 'FontAwesome or Lucide icon class (e.g., fas fa-check-circle, fas fa-code)',
      placeholder: 'fas fa-rocket',
    }),
  ],
  preview: {
    select: {
      title: 'label',
      subtitle: 'value',
    },
    prepare({title, subtitle}) {
      return {
        title: title || 'Untitled Metric',
        subtitle: subtitle ? `Value: ${subtitle}` : 'No value set',
      }
    },
  },
})
