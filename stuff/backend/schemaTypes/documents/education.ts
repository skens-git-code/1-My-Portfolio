import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'education',
  title: 'Education & Certifications',
  type: 'document',
  fields: [
    defineField({
      name: 'degree',
      title: 'Degree / Certificate Title',
      type: 'string',
      placeholder: 'e.g. B.Tech in Computer Science & AI, AWS Certified Architect',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'institution',
      title: 'Institution / Academy',
      type: 'string',
      placeholder: 'e.g. Newton School of Technology',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'institutionLogo',
      title: 'Institution Logo',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'fieldOfStudy',
      title: 'Field of Study / Major',
      type: 'string',
      placeholder: 'Computer Science, AI & Machine Learning',
    }),
    defineField({
      name: 'startDate',
      title: 'Start Date',
      type: 'date',
    }),
    defineField({
      name: 'endDate',
      title: 'End Date / Expected Graduation',
      type: 'date',
    }),
    defineField({
      name: 'grade',
      title: 'Grade / Honors / CGPA',
      type: 'string',
      placeholder: 'e.g. First Class with Distinction, 9.2 CGPA',
    }),
    defineField({
      name: 'description',
      title: 'Description & Focus Areas',
      type: 'text',
      rows: 3,
      placeholder: 'Coursework, key research topics, and specialized projects...',
    }),
    defineField({
      name: 'credentialUrl',
      title: 'Credential Verification URL',
      type: 'url',
      placeholder: 'https://credentials.example.com/verify/...',
    }),
    defineField({
      name: 'order',
      title: 'Display Priority Order',
      type: 'number',
      initialValue: 1,
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
        media,
      }
    },
  },
})
