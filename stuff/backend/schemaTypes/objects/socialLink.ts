import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'socialLink',
  title: 'Social Link',
  type: 'object',
  fields: [
    defineField({
      name: 'platform',
      title: 'Platform',
      type: 'string',
      description: 'Select the social network or communication service',
      options: {
        list: [
          {title: 'GitHub', value: 'github'},
          {title: 'LinkedIn', value: 'linkedin'},
          {title: 'Twitter / X', value: 'twitter'},
          {title: 'Instagram', value: 'instagram'},
          {title: 'YouTube', value: 'youtube'},
          {title: 'Discord', value: 'discord'},
          {title: 'Email', value: 'email'},
          {title: 'Personal Website', value: 'website'},
          {title: 'Custom', value: 'custom'},
        ],
      },
      validation: (Rule) => Rule.required(),
      initialValue: 'github',
    }),
    defineField({
      name: 'title',
      title: 'Custom Title',
      type: 'string',
      description: 'Required only if Platform is set to Custom',
      hidden: ({parent}) => parent?.platform !== 'custom',
    }),
    defineField({
      name: 'url',
      title: 'Destination URL or mailto:',
      type: 'string',
      description: 'Full web URL (https://...) or mailto: link for email',
      placeholder: 'https://github.com/skens-git-code',
      validation: (Rule) =>
        Rule.required().custom((url) => {
          if (!url) return true
          if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('http://') || url.startsWith('https://')) {
            return true
          }
          return 'URL must begin with https://, http://, mailto:, or tel:'
        }),
    }),
    defineField({
      name: 'username',
      title: 'Username / Handle',
      type: 'string',
      description: 'Display username or handle (e.g., @sarthakmathapati)',
      placeholder: '@username',
    }),
    defineField({
      name: 'iconClass',
      title: 'Custom Icon Class',
      type: 'string',
      description: 'FontAwesome icon class (e.g. fab fa-github, fab fa-linkedin)',
      placeholder: 'fab fa-github',
    }),
  ],
  preview: {
    select: {
      platform: 'platform',
      url: 'url',
      username: 'username',
    },
    prepare({platform, url, username}) {
      const platformNames: Record<string, string> = {
        github: 'GitHub',
        linkedin: 'LinkedIn',
        twitter: 'Twitter / X',
        instagram: 'Instagram',
        youtube: 'YouTube',
        discord: 'Discord',
        email: 'Email',
        website: 'Personal Website',
        custom: 'Custom Link',
      }
      return {
        title: platformNames[platform] || platform || 'Social Link',
        subtitle: username || url || 'No link configured',
      }
    },
  },
})
