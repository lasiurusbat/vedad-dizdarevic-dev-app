/** A case study that the Work with me grid has a column for. */
type HireSlug = 'sorted' | 'rainalert' | 'this-site';
interface HireProject {
  slug: HireSlug;
  name: string;
}
interface HireOption {
  title: string;
  tag?: string;
  text: string;
}
interface HireService {
  title: string;
  text: string;
  /** Section anchor per project, in this language. No entry: the project does not show it. */
  proof: Partial<Record<HireSlug, string>>;
}

export const en = {
  siteTitle: 'Vedad Dizdarevic',
  role: 'Cloud & DevOps Engineer',
  availability: 'Open to full-time roles and freelance work.',
  heroPositioning:
    'Building scalable, production-ready cloud platforms through Infrastructure as Code, platform architecture, containerization, and Kubernetes orchestration.',
  ctaCv: 'Download CV',
  comingSoon: 'Coming soon.',

  themeToDark: 'Switch to dark theme',
  themeToLight: 'Switch to light theme',
  skipToContent: 'Skip to content',
  mainNav: 'Main',
  menu: 'Menu',
  language: 'Language',
  navWork: 'Work',
  navSkills: 'Skills',
  navAbout: 'About',
  navHire: 'Work with me',
  navContact: 'Contact',
  navCv: 'CV',
  github: 'GitHub',
  linkedin: 'LinkedIn',

  workTitle: 'Selected work',
  skillsTitle: 'Skills',
  aboutTitle: 'About',
  aboutP1:
    'I spent more than a decade in 3D/CGI before moving into cloud and DevOps engineering. There I worked with render pipelines and large files every day, and infrastructure turned out to be the part I enjoyed most. In July 2024 I completed the DevOps Engineer diploma at DataScientest.',
  aboutP2:
    'My largest project so far is {sorted}, a commercial SaaS product whose AWS platform I built and run on my own, from the first Terraform module to production in six weeks. This site is a project too: Terraform for AWS and Cloudflare, CI/CD through OIDC, security headers tested on every deploy.',
  aboutP3:
    "I'm working towards the AWS Certified Solutions Architect – Associate and am open to full-time roles and freelance work. Away from the terminal: games, books, a bike and too much coffee.",
  aboutLanguagesLabel: 'Languages',
  aboutLanguages: 'Bosnian/Serbian/Croatian (native), English and German (fluent)',
  hireTitle: 'Work with me',
  hireStatus: 'Available now',
  hirePlace:
    'Based in the Frankfurt area. Hybrid with up to 3 days on site, or remote across the EU. I hold an EU work permit.',
  hireCta: 'Email me',
  hireOptions: [
    {
      title: 'Full-time',
      tag: 'Preferred',
      text: 'A full-time role in cloud and DevOps engineering.',
    },
    {
      title: 'Freelance',
      text: 'Fixed-scope projects, ongoing part-time work or full-time contracts.',
    },
  ] as HireOption[],
  hireServicesTitle: 'What I can do for your team',
  hireLegend: 'Each dot links to the part of a case study that shows it.',
  hireServiceColumn: 'Service',
  hireWhatColumn: 'What it covers',
  hireShownIn: 'shown in',
  hireNotShown: 'Not in this project',
  hireProjects: [
    { slug: 'sorted', name: 'Sorted' },
    { slug: 'rainalert', name: 'Rain Alert' },
    { slug: 'this-site', name: 'This site' },
  ] as HireProject[],
  hireServices: [
    {
      title: 'AWS architecture',
      text: 'New platforms and reviews of existing ones.',
      proof: { sorted: 'architecture', 'this-site': 'a-private-bucket-behind-a-worker' },
    },
    {
      title: 'Infrastructure as code',
      text: 'Terraform, including hand-built setups brought under it.',
      proof: {
        sorted: 'one-module-every-environment',
        'this-site': 'two-repositories-two-pipelines',
      },
    },
    {
      title: 'CI/CD pipelines',
      text: 'Keyless deploys through OIDC, from a git push to a checked release.',
      proof: {
        sorted: 'keyless-delivery',
        rainalert: 'a-release-is-a-git-tag',
        'this-site': 'no-stored-keys-in-ci',
      },
    },
    {
      title: 'Containers on ECS and Fargate',
      text: 'Fargate services, with Spot where a restart is acceptable.',
      proof: { sorted: 'cost-per-environment' },
    },
    {
      title: 'Monitoring and alerting',
      text: 'Grafana and CloudWatch dashboards, alerts and runbooks.',
      proof: {
        sorted: 'monitoring',
        rainalert: 'free-tiers-that-fail-well',
        'this-site': 'costs-and-alarms-on-a-shared-account',
      },
    },
    {
      title: 'Security hardening',
      text: 'Least-privilege access, private networks and security headers.',
      proof: {
        sorted: 'a-perimeter-by-construction',
        rainalert: 'fail-closed',
        'this-site': 'security-headers-in-one-place',
      },
    },
    {
      title: 'AWS cost reduction',
      text: "Sorted's dev costs an estimated 64% less, from the AWS bill.",
      proof: { sorted: 'cost-per-environment' },
    },
    {
      title: 'Kubernetes on AWS EKS',
      text: 'Orchestrating containerised workloads on Amazon EKS.',
      proof: {},
    },
  ] as HireService[],
  contactTitle: 'Contact',

  certsTitle: 'Certifications',
  certInProgress: 'In progress',
  certVerify: 'Verify',

  readCaseStudy: 'Read the case study',
  backToWork: 'Back to selected work',
  viewFullSize: 'View full size',
  galleryPrev: 'Previous screenshot',
  galleryNext: 'Next screenshot',
  galleryOpen: '(view full size)',
  galleryClose: 'Close',
  galleryActualSize: 'Actual size',
  diagramSimplified: 'Simplified diagram.',
  diagramPaths: 'Trace a path',
  diagramPathAll: 'Everything',
  diagramTextAlternative: 'Text description of the diagram',
  diagramNeedsJs:
    'The diagram needs JavaScript. Open the text description above for the same information.',

  caseProblem: 'The problem',
  tradeOff: 'Trade-off',
  tradeGained: 'Gained',
  tradePrice: 'Price',
  limitGap: 'Gap',
  limitNext: 'Next step',
  caseOutcome: 'Outcome',
  caseCtaText: 'Need a platform like this for your product?',
  caseCtaButton: 'Get in touch',
  caseCtaMore: 'See more work',
  caseNext: 'Next case study',
  casePrivateRepo: 'Private repository',
  caseStatus: 'Status',
  caseLive: 'Live',
  caseRepo: 'Source code',
  opensNewTab: '(opens in a new tab)',
  costTotal: 'Total',
  problemArea: 'Area',
  problemSymptom: 'What broke',
  problemFix: 'Fix',

  footerRights: 'All rights reserved.',
  footerHowBuilt: 'How this site is built',
  footerNav: 'Footer',

  notFoundTitle: 'Page not found',
  notFoundText: 'The page you are looking for does not exist.',
  backHome: 'Back to the home page',
};

// Widens each string literal to string; the few structured values (Work with me) keep their shape.
export type Messages = {
  [K in keyof typeof en]: (typeof en)[K] extends string ? string : (typeof en)[K];
};
