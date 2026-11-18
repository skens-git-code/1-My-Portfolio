import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'profile',
  title: 'Personal Profile',
  type: 'document',
  fieldsets: [
    {
      name: 'identity',
      title: '👤 Identity & Branding',
      options: {collapsible: false, collapsed: false},
    },
    {
      name: 'hero',
      title: '🚀 Hero Headline & Typing Phrases',
      options: {collapsible: true, collapsed: false},
    },
    {
      name: 'narrative',
      title: '📝 Bio & Philosophy',
      options: {collapsible: true, collapsed: false},
    },
    {
      name: 'contact',
      title: '📬 Contact & Availability',
      options: {collapsible: true, collapsed: false},
    },
    {
      name: 'socials',
      title: '🌐 Social Profiles',
      options: {collapsible: true, collapsed: false},
    },
    {
      name: 'documents',
      title: '📄 Resume & Documents',
      options: {collapsible: true, collapsed: true},
    },
  ],
  fields: [
    defineField({
      name: 'fullName',
      title: 'Full Name',
      type: 'string',
      fieldset: 'identity',
      placeholder: 'Sarthak Mathapati',
      validation: (Rule) => Rule.required(),
      initialValue: 'Sarthak Mathapati',
    }),
    defineField({
      name: 'brandName',
      title: 'Brand / Domain Handle',
      type: 'string',
      fieldset: 'identity',
      placeholder: 'skens.space',
      initialValue: 'skens.space',
    }),
    defineField({
      name: 'status',
      title: 'Availability Status',
      type: 'string',
      fieldset: 'identity',
      description: 'Pill badge shown on the hero section',
      options: {
        list: [
          {title: '🟢 Open to Opportunities / Available for Hire', value: 'available'},
          {title: '🟡 In Contract / High Demand', value: 'busy'},
          {title: '🔴 Closed for New Work', value: 'unavailable'},
        ],
      },
      initialValue: 'available',
    }),
    defineField({
      name: 'statusCustomText',
      title: 'Custom Status Message',
      type: 'string',
      fieldset: 'identity',
      description: 'Custom text to display on the live availability indicator',
      placeholder: 'Open for Full-Time & High-Impact Contracts',
    }),
    defineField({
      name: 'avatar',
      title: 'Profile Picture / Avatar',
      type: 'image',
      fieldset: 'identity',
      options: {hotspot: true},
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
          initialValue: 'Sarthak Mathapati - Profile Picture',
        },
      ],
    }),

    // --- Hero Headline & Roles ---
    defineField({
      name: 'headline',
      title: 'Primary Professional Headline',
      type: 'string',
      fieldset: 'hero',
      placeholder: 'AI Software Engineer & Full-Stack Architect',
      initialValue: 'AI Software Engineer & Full-Stack Architect',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'typingPhrases',
      title: 'Rotating Typing Phrases',
      type: 'array',
      fieldset: 'hero',
      description: 'Phrases that dynamically cycle in the hero typing animation',
      of: [{type: 'string'}],
      initialValue: [
        'Disciplina - Execução - Foco',
        'Building With Innovation 🚀',
        'Turning Ideas Into Reality',
        'Code. Create. Innovate.',
      ],
    }),

    // --- Narrative Bio ---
    defineField({
      name: 'shortBio',
      title: 'Short Introduction (Hero Section)',
      type: 'text',
      fieldset: 'narrative',
      rows: 3,
      placeholder: 'Turning ideas into sleek, responsive, and meaningful digital experiences...',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'aboutBio',
      title: 'Detailed Biography (About Section)',
      type: 'blockContent',
      fieldset: 'narrative',
      description: 'Rich story about your journey, engineering philosophy, and values',
    }),

    // --- Contact Details ---
    defineField({
      name: 'email',
      title: 'Email Address',
      type: 'string',
      fieldset: 'contact',
      placeholder: 'sarthakmathapati4@gmail.com',
      validation: (Rule) => Rule.required().email(),
      initialValue: 'sarthakmathapati4@gmail.com',
    }),
    defineField({
      name: 'phone',
      title: 'Phone Number',
      type: 'string',
      fieldset: 'contact',
      placeholder: '+91 93567 07688',
      initialValue: '+91 93567 07688',
    }),
    defineField({
      name: 'location',
      title: 'Location / Base',
      type: 'string',
      fieldset: 'contact',
      placeholder: 'Newton School of Technology, Delhi, India',
      initialValue: 'Delhi, India',
    }),

    // --- Social Links ---
    defineField({
      name: 'socialLinks',
      title: 'Social Network Profiles',
      type: 'array',
      fieldset: 'socials',
      of: [{type: 'socialLink'}],
    }),

    // --- Resume & CV ---
    defineField({
      name: 'resumeFile',
      title: 'Resume Document (PDF)',
      type: 'file',
      fieldset: 'documents',
      options: {accept: '.pdf,.docx'},
    }),
    defineField({
      name: 'resumeUrl',
      title: 'External Resume URL (Google Drive / Notion)',
      type: 'url',
      fieldset: 'documents',
    }),
  ],

  preview: {
    select: {
      title: 'fullName',
      subtitle: 'headline',
      media: 'avatar',
    },
    prepare({title, subtitle, media}) {
      return {
        title: title || 'Profile',
        subtitle: subtitle || 'Personal Portfolio Information',
        media,
      }
    },
  },
})
