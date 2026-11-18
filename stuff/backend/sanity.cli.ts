import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'im67x7za',
    dataset: 'production',
  },
  deployment: {
    appId: 'rm7hhuirr60k6ohihysch090',
    autoUpdates: true,
  },
})
