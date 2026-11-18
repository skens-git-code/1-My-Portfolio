import {defineType, defineField} from 'sanity'
import {BoltIcon} from '@sanity/icons/Bolt'
import {StarIcon} from '@sanity/icons/Star'

export default defineType({
  name: 'skill',
  title: 'Skill & Technology',
  type: 'document',
  icon: BoltIcon,
  groups: [
    {name: 'info', title: 'Technology Info', icon: BoltIcon, default: true},
    {name: 'level', title: 'Proficiency & Ranking', icon: StarIcon},
  ],
  fields: [
    // --- Info Group ---
    defineField({
      name: 'name',
      title: 'Skill / Framework Name',
      type: 'string',
      group: 'info',
      placeholder: 'e.g. React, Node.js, Python, Three.js, Docker',
      validation: (Rule) => Rule.required().min(1).max(50),
    }),
    defineField({
      name: 'category',
      title: 'Technology Category',
      type: 'string',
      group: 'info',
      description: 'Used for category sorting and filter pills on the skills matrix',
      options: {
        list: [
          {title: 'Frontend & UI Frameworks', value: 'frontend'},
          {title: 'Backend, APIs & Microservices', value: 'backend'},
          {title: 'Artificial Intelligence & Machine Learning', value: 'ai'},
          {title: 'Databases & Cloud Architecture', value: 'cloud-db'},
          {title: 'Developer Tools & DevOps', value: 'tools'},
        ],
        layout: 'dropdown',
      },
      validation: (Rule) => Rule.required(),
      initialValue: 'frontend',
    }),
    defineField({
      name: 'iconClass',
      title: 'FontAwesome Icon Class',
      type: 'string',
      group: 'info',
      description: 'Icon class for the tech chip (e.g. fab fa-react, fab fa-node-js, fab fa-python, fas fa-database)',
      placeholder: 'fab fa-react',
    }),
    defineField({
      name: 'iconImage',
      title: 'Custom Vector / SVG Icon (Optional)',
      type: 'image',
      group: 'info',
      description: 'Upload a custom SVG icon if FontAwesome does not include it',
    }),

    // --- Level Group ---
    defineField({
      name: 'proficiency',
      title: 'Proficiency Level (%)',
      type: 'number',
      group: 'level',
      description: 'Proficiency percentage (0–100%) for progress ring indicators',
      validation: (Rule) => Rule.min(0).max(100),
      initialValue: 85,
    }),
    defineField({
      name: 'featured',
      title: '⭐ Highlight on Hero & Quick Skills',
      type: 'boolean',
      group: 'level',
      description: 'Feature this skill on primary hero skill badges',
      initialValue: true,
    }),
    defineField({
      name: 'order',
      title: 'Display Order Priority',
      type: 'number',
      group: 'level',
      description: 'Lower numbers appear first',
      initialValue: 10,
    }),
  ],

  preview: {
    select: {
      name: 'name',
      category: 'category',
      proficiency: 'proficiency',
      featured: 'featured',
      media: 'iconImage',
    },
    prepare({name, category, proficiency, featured, media}) {
      const categoryMap: Record<string, string> = {
        frontend: 'Frontend',
        backend: 'Backend',
        ai: 'AI & ML',
        'cloud-db': 'Cloud / DB',
        tools: 'DevOps & Tools',
      }
      const star = featured ? ' ⭐' : ''
      return {
        title: `${name || 'Untitled Skill'}${star}`,
        subtitle: `${categoryMap[category] || category || 'General'} · ${proficiency ? `${proficiency}%` : 'N/A'}`,
        media: media || BoltIcon,
      }
    },
  },

  orderings: [
    {
      title: 'Display Priority (Ascending)',
      name: 'orderAsc',
      by: [{field: 'order', direction: 'asc'}],
    },
    {
      title: 'Proficiency (Highest First)',
      name: 'proficiencyDesc',
      by: [{field: 'proficiency', direction: 'desc'}],
    },
  ],
})
