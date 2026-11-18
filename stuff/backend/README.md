# 🚀 Sanity CMS Content Studio — Portfolio Backend

This directory houses the headless CMS Studio for the portfolio, powered by **Sanity v3**. It allows non-technical content editors and developers to update, create, and manage projects, biographies, experience, skills, testimonials, and SEO metadata directly from a visual web interface without touching code.

---

## 📋 Available Schemas & Content Models

### Singletons (One Document Per Site)
| Content Type | Purpose | Key Fields |
| :--- | :--- | :--- |
| **👤 Personal Profile & Bio** | Profile info, hero section & contact | Full Name, Headline, Rotating Typing Phrases, Status Badge, Avatars, Bio, Contact, Social Links, Resume PDF |
| **🌐 Site Settings & SEO** | Global website configuration | Site Title, Domain URL, Impact Statistics Counters, Default Open Graph / Twitter SEO, Footer Copyright |

### Document Collections
| Content Type | Purpose | Key Fields |
| :--- | :--- | :--- |
| **🚀 Projects Showcase** | Portfolio projects & case studies | Title, Slug, Tagline, Category, Badge, Featured Toggle, Cover Image, Gallery, Tech Stack, URLs, Case Study (Challenge, Solution, Results, Body), Key Metrics |
| **💼 Work Experience** | Career history & timeline | Role, Company, Logo, Employment Type, Location, Dates, Current toggle, Responsibilities, Technologies |
| **🎓 Education & Credentials** | Degrees & certifications | Degree, Institution, Logo, Dates, Grade/Honors, Credential URL, Descriptions |
| **⚡ Skills & Tech Stack** | Technologies matrix | Skill Name, Category (Frontend, Backend, AI, Cloud/DB, Tools), Icon Class, Proficiency Slider (0-100%), Featured toggle |
| **💬 Testimonials & Reviews** | Client & colleague reviews | Author, Role, Company, Avatar, Quote, Star Rating (1-5), Associated Project reference |

### Reusable Schema Objects
- `blockContent`: Rich Portable Text editor with headings, bold, italic, code spans, URLs, blockquotes, and inline captioned images.
- `seo`: OpenGraph images, meta title (50-60 chars limit guidance), meta description, keywords.
- `socialLink`: Platform selector (GitHub, LinkedIn, Twitter, Discord, etc.), URL validation, handles, and icon classes.
- `statMetric`: Numerical counters with formatted display labels and icon classes.
- `keyResult`: Quantifiable outcome metrics for project case studies.

---

## ⚡ Quick Start & Development

```bash
# Navigate to the backend directory
cd stuff/backend

# Start the local Sanity Studio development server
npm run dev
# The Studio will open at http://localhost:3333

# Build the production bundle
npm run build

# Deploy Studio changes to your Sanity-hosted domain
npm run deploy
```

---

## 🔍 Common GROQ Queries

### 1. Fetch All Featured Projects
```groq
*[_type == "project"] | order(order asc, publishedAt desc) {
  _id,
  title,
  "slug": slug.current,
  tagline,
  description,
  category,
  badge,
  featured,
  "imageUrl": image.asset->url,
  technologies,
  liveUrl,
  githubUrl,
  caseStudy {
    challenge,
    solution,
    results
  },
  metrics[] {
    title,
    metric,
    description
  }
}
```

### 2. Fetch Personal Profile & Hero Data
```groq
*[_type == "profile"][0] {
  fullName,
  brandName,
  status,
  statusCustomText,
  headline,
  typingPhrases,
  shortBio,
  "avatarUrl": avatar.asset->url,
  email,
  phone,
  location,
  socialLinks[] {
    platform,
    url,
    username,
    iconClass
  },
  "resumePdfUrl": resumeFile.asset->url,
  resumeUrl
}
```

### 3. Fetch Skills Grouped by Category
```groq
*[_type == "skill"] | order(order asc) {
  _id,
  name,
  category,
  iconClass,
  "iconImageUrl": iconImage.asset->url,
  proficiency,
  featured
}
```

### 4. Fetch Work Experience Timeline
```groq
*[_type == "experience"] | order(order asc, startDate desc) {
  _id,
  role,
  company,
  companyUrl,
  "logoUrl": companyLogo.asset->url,
  location,
  employmentType,
  startDate,
  isCurrent,
  endDate,
  summary,
  achievements,
  technologies
}
```

---

## 💡 Best Practices for Content Editors

1. **Slugs**: When adding a new project, enter the **Project Title** and click **Generate** next to the slug field to automatically generate a clean, web-safe URL.
2. **Images**: Use the built-in **Hotspot & Crop** tool when uploading images to ensure subjects are never awkwardly cropped across desktop and mobile screens.
3. **Tags**: Enter technology names in the **Technologies** field and press `Enter` to create tags.
4. **Drafts & Publishing**: Changes in Sanity Studio save automatically as drafts. Click the **Publish** button at the bottom right corner when you are ready to make changes live.
