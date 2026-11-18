import {defineType, defineArrayMember} from 'sanity'

export default defineType({
  name: 'blockContent',
  title: 'Rich Text Content',
  type: 'array',
  of: [
    defineArrayMember({
      title: 'Block',
      type: 'block',
      styles: [
        {title: 'Normal', value: 'normal'},
        {title: 'Heading 2', value: 'h2'},
        {title: 'Heading 3', value: 'h3'},
        {title: 'Heading 4', value: 'h4'},
        {title: 'Quote', value: 'blockquote'},
      ],
      lists: [
        {title: 'Bullet List', value: 'bullet'},
        {title: 'Numbered List', value: 'number'},
      ],
      marks: {
        decorators: [
          {title: 'Strong (Bold)', value: 'strong'},
          {title: 'Emphasis (Italic)', value: 'em'},
          {title: 'Code', value: 'code'},
          {title: 'Underline', value: 'underline'},
          {title: 'Strike', value: 'strike-through'},
        ],
        annotations: [
          {
            title: 'URL Link',
            name: 'link',
            type: 'object',
            fields: [
              {
                title: 'URL',
                name: 'href',
                type: 'url',
                validation: (Rule) =>
                  Rule.uri({
                    scheme: ['http', 'https', 'mailto', 'tel'],
                  }),
              },
              {
                title: 'Open in new tab',
                name: 'blank',
                type: 'boolean',
                initialValue: true,
              },
            ],
          },
        ],
      },
    }),
    defineArrayMember({
      type: 'image',
      options: {hotspot: true},
      fields: [
        {
          name: 'caption',
          type: 'string',
          title: 'Caption',
        },
        {
          name: 'alt',
          type: 'string',
          title: 'Alt Text (Accessibility)',
          validation: (Rule) => Rule.required(),
        },
      ],
    }),
  ],
})
