import {defineType, defineField, defineArrayMember} from 'sanity'
import {UserIcon} from '@sanity/icons/User'
import {SparklesIcon} from '@sanity/icons/Sparkles'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {EnvelopeIcon} from '@sanity/icons/Envelope'
import {LinkIcon} from '@sanity/icons/Link'
import {DocumentPdfIcon} from '@sanity/icons/DocumentPdf'

export default defineType({
  name: 'profile',
  title: 'Personal Profile',
  type: 'document',
  icon: UserIcon,
  groups: [
    {name: 'identity', title: 'Identity & Status', icon: UserIcon, default: true},
    {name: 'hero', title: 'Hero & Headlines', icon: SparklesIcon},
    {name: 'narrative', title: 'Bio & Story', icon: DocumentTextIcon},
    {name: 'contact', title: 'Contact Details', icon: EnvelopeIcon},
    {name: 'socials', title: 'Social Channels', icon: LinkIcon},
    {name: 'documents', title: 'Resume / CV', icon: DocumentPdfIcon},
  ],
  fields: [
    // --- Identity Group ---
    defineField({
      name: 'fullName',
      title: 'Full Name',
      type: 'string',
      group: 'identity',
      placeholder: 'Sarthak Mathapati',
      validation: (Rule) => Rule.required().min(2),
      initialValue: 'Sarthak Mathapati',
    }),
    defineField({
      name: 'brandName',
      title: 'Brand / Domain Handle',
      type: 'string',
      group: 'identity',
      description: 'Used for logo text, terminal prompts, and footer credits',
      placeholder: 'skens.space',
      initialValue: 'skens.space',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Live Work Availability',
      type: 'string',
      group: 'identity',
      description: 'Indicator badge shown on the hero section and mobile header',
      options: {
        list: [
          {title: '🟢 Open to Opportunities / Available for Hire', value: 'available'},
          {title: '🟡 High Demand / Selective Contracts Only', value: 'busy'},
          {title: '🔴 Currently Booked / Unavailable', value: 'unavailable'},
        ],
        layout: 'radio',
      },
      initialValue: 'available',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'statusCustomText',
      title: 'Custom Status Message (Optional)',
      type: 'string',
      group: 'identity',
      description: 'Override the default status text with a custom announcement',
      placeholder: 'Open for Full-Time AI & High-Impact Web Engineering',
    }),
    defineField({
      name: 'avatar',
      title: 'Profile Picture / Headshot',
      type: 'image',
      group: 'identity',
      description: 'Personal portrait shown in the About section and metadata',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative Text',
          type: 'string',
          description: 'Accessibility description for screen readers',
          initialValue: 'Sarthak Mathapati - Profile Picture',
        }),
      ],
    }),

    // --- Hero Group ---
    defineField({
      name: 'headline',
      title: 'Primary Professional Title',
      type: 'string',
      group: 'hero',
      description: 'The main hero title headline (e.g. AI Software Engineer & Full-Stack Architect)',
      placeholder: 'AI Software Engineer & Full-Stack Architect',
      initialValue: 'AI Software Engineer & Full-Stack Architect',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'typingPhrases',
      title: 'Hero Animated Typing Phrases',
      type: 'array',
      group: 'hero',
      description: 'Rotating phrases that cycle through the hero text typewriter animation',
      of: [defineArrayMember({type: 'string'})],
      initialValue: [
        'Disciplina - Execução - Foco',
        'Building With Innovation 🚀',
        'Turning Ideas Into Reality',
        'Code. Create. Innovate.',
      ],
      validation: (Rule) => Rule.min(1).warning('Add at least 2 phrases for the typing animation.'),
    }),
    defineField({
      name: 'shortBio',
      title: 'Short Introduction (Hero Section)',
      type: 'text',
      group: 'hero',
      rows: 3,
      description: 'Crisp elevator pitch displayed right under your headline in the hero',
      placeholder: 'Turning ideas into sleek, responsive, and meaningful digital experiences...',
      initialValue: 'Turning ideas into sleek, responsive, and meaningful digital experiences through AI and full-stack engineering.',
      validation: (Rule) => Rule.required().min(20).max(300),
    }),

    // --- Narrative Group ---
    defineField({
      name: 'aboutBio',
      title: 'Full Narrative (About Section)',
      type: 'blockContent',
      group: 'narrative',
      description: 'Comprehensive story about your background, journey, engineering philosophy, and passions',
    }),

    // --- Contact Group ---
    defineField({
      name: 'email',
      title: 'Email Address',
      type: 'string',
      group: 'contact',
      description: 'Primary inquiry and contact form destination',
      placeholder: 'sarthakmathapati4@gmail.com',
      validation: (Rule) => Rule.required().email(),
      initialValue: 'sarthakmathapati4@gmail.com',
    }),
    defineField({
      name: 'phone',
      title: 'Phone Number',
      type: 'string',
      group: 'contact',
      placeholder: '+91 93567 07688',
      initialValue: '+91 93567 07688',
    }),
    defineField({
      name: 'location',
      title: 'Location & Base',
      type: 'string',
      group: 'contact',
      placeholder: 'Delhi, India / Remote',
      initialValue: 'Newton School of Technology, Delhi · Remote Available',
    }),

    // --- Socials Group ---
    defineField({
      name: 'socialLinks',
      title: 'Social & Developer Profiles',
      type: 'array',
      group: 'socials',
      description: 'Manage links to GitHub, LinkedIn, Twitter/X, Discord, etc.',
      of: [defineArrayMember({type: 'socialLink'})],
    }),

    // --- Documents Group ---
    defineField({
      name: 'resumeFile',
      title: 'Downloadable Resume (PDF)',
      type: 'file',
      group: 'documents',
      description: 'Upload your latest CV/Resume PDF for instant download on the site',
      options: {accept: '.pdf,.docx'},
    }),
    defineField({
      name: 'resumeUrl',
      title: 'External Resume Link (Google Drive / Notion / LinkedIn)',
      type: 'url',
      group: 'documents',
      description: 'Alternative web link if you host your resume externally',
      validation: (Rule) =>
        Rule.uri({
          scheme: ['http', 'https'],
        }),
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
        title: title || 'Sarthak Mathapati',
        subtitle: subtitle || 'AI Software Engineer & Full-Stack Architect',
        media: media || UserIcon,
      }
    },
  },
})
