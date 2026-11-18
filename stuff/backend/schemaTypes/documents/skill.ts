import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'skill',
  title: 'Skill & Technology',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Skill / Technology Name',
      type: 'string',
      placeholder: 'e.g. React, Node.js, Three.js, Python, Docker',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Skill Category',
      type: 'string',
      description: 'Used for category filtering on the portfolio skills matrix',
      options: {
        list: [
          {title: 'Frontend & UI Frameworks', value: 'frontend'},
          {title: 'Backend & APIs', value: 'backend'},
          {title: 'Artificial Intelligence & Machine Learning', value: 'ai'},
          {title: 'Databases & Cloud Infrastructure', value: 'cloud-db'},
          {title: 'Developer Tools & Architecture', value: 'tools'},
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
      description: 'Icon class for the card/chip (e.g., fab fa-react, fab fa-node-js, fab fa-python)',
      placeholder: 'fab fa-react',
    }),
    defineField({
      name: 'iconImage',
      title: 'Custom SVG / Icon Image (Optional)',
      type: 'image',
      description: 'Upload custom vector icon if FontAwesome does not have it',
    }),
    defineField({
      name: 'proficiency',
      title: 'Proficiency Level (%)',
      type: 'number',
      description: '0 to 100 percentage indicator',
      validation: (Rule) => Rule.min(0).max(100),
      initialValue: 85,
    }),
    defineField({
      name: 'featured',
      title: '⭐ Featured / Core Skill',
      type: 'boolean',
      description: 'Showcase on main highlighted skill rings or hero banner',
      initialValue: true,
    }),
    defineField({
      name: 'order',
      title: 'Display Order Priority',
      type: 'number',
      description: 'Lower numbers appear first',
      initialValue: 10,
    }),
  ],

  preview: {
    select: {
      name: 'name',
      category: 'category',
      proficiency: 'proficiency',
      media: 'iconImage',
    },
    prepare({name, category, proficiency, media}) {
      const categoryMap: Record<string, string> = {
        frontend: 'Frontend',
        backend: 'Backend',
        ai: 'AI & ML',
        'cloud-db': 'Cloud & DB',
        tools: 'Tools & DevOps',
      }
      return {
        title: name || 'Untitled Skill',
        subtitle: `${categoryMap[category] || category || 'General'} · ${proficiency ? `${proficiency}%` : 'N/A'}`,
        media,
      }
    },
  },
})
