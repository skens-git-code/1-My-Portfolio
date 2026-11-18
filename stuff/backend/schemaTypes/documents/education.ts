import {defineType, defineField, defineArrayMember} from 'sanity'
import {BookIcon} from '@sanity/icons/Book'
import {CalendarIcon} from '@sanity/icons/Calendar'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'

export default defineType({
  name: 'education',
  title: 'Education & Certifications',
  type: 'document',
  icon: BookIcon,
  groups: [
    {name: 'degree', title: 'Degree & Institution', icon: BookIcon, default: true},
    {name: 'dates', title: 'Timeline & Grade', icon: CalendarIcon},
    {name: 'details', title: 'Details & Credentials', icon: DocumentTextIcon},
  ],
  fields: [
    // --- Degree Group ---
    defineField({
      name: 'degree',
      title: 'Degree or Certification Title',
      type: 'string',
      group: 'degree',
      placeholder: 'e.g. B.Tech in Computer Science & AI, AWS Solutions Architect',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'institution',
      title: 'University / Institution',
      type: 'string',
      group: 'degree',
      placeholder: 'e.g. Newton School of Technology',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'institutionLogo',
      title: 'Institution Logo / Crest',
      type: 'image',
      group: 'degree',
      options: {hotspot: true},
    }),
    defineField({
      name: 'fieldOfStudy',
      title: 'Major / Field of Study',
      type: 'string',
      group: 'degree',
      placeholder: 'Computer Science, Artificial Intelligence',
    }),

    // --- Dates Group ---
    defineField({
      name: 'startDate',
      title: 'Start Date',
      type: 'date',
      group: 'dates',
    }),
    defineField({
      name: 'endDate',
      title: 'Graduation / Expiration Date',
      type: 'date',
      group: 'dates',
    }),
    defineField({
      name: 'grade',
      title: 'Grade / Honors / CGPA',
      type: 'string',
      group: 'dates',
      placeholder: 'e.g. First Class with Distinction, 9.2 CGPA',
    }),
    defineField({
      name: 'order',
      title: 'Display Priority Order',
      type: 'number',
      group: 'dates',
      initialValue: 1,
    }),

    // --- Details Group ---
    defineField({
      name: 'description',
      title: 'Coursework & Academic Focus',
      type: 'text',
      rows: 3,
      group: 'details',
      placeholder: 'Specialized coursework, research thesis, leadership activities...',
    }),
    defineField({
      name: 'credentialUrl',
      title: 'Certificate Verification URL',
      type: 'url',
      group: 'details',
      placeholder: 'https://credentials.example.com/verify/...',
      validation: (Rule) =>
        Rule.uri({
          scheme: ['http', 'https'],
        }),
    }),
  ],

  preview: {
    select: {
      degree: 'degree',
      institution: 'institution',
      grade: 'grade',
      media: 'institutionLogo',
    },
    prepare({degree, institution, grade, media}) {
      return {
        title: degree || 'Untitled Degree',
        subtitle: `${institution || 'Institution'}${grade ? ` (${grade})` : ''}`,
        media: media || BookIcon,
      }
    },
  },
})
