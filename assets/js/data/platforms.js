export const platforms = [
  {
    slug: "clickworker",
    name: "Clickworker",
    category: "Microtasks",
    payouts: ["PayPal", "SEPA where available", "Other methods vary"],
    difficulty: "Beginner to medium",
    threshold: "Varies by payout method",
    bestFor:
      "Small data tasks, UHRS-style work where available, writing or categorization tasks",
    warning:
      "Country access, UHRS access, and payout options can change. Verify inside your account before spending heavy time.",
    alts: ["appen", "sproutgigs", "remotasks"],
    officialUrl: "https://www.clickworker.com/clickworker/",
    lastChecked: "May 2026",
    trustNote:
      "Existing uiori platform route. Re-check current eligibility, payout method, and account rules before spending serious time.",
  },
  {
    slug: "swagbucks",
    name: "Swagbucks",
    category: "Surveys & offers",
    payouts: ["Gift cards", "PayPal where available"],
    difficulty: "Beginner",
    threshold: "Often low, varies by reward and country",
    bestFor:
      "Users who want simple surveys, offers, and gift-card style rewards",
    warning:
      "Offer availability is profile-based. Do not complete paid offers without reading terms and cancellation rules.",
    alts: ["ysense", "freecash", "timebucks"],
    officialUrl: "https://www.swagbucks.com/",
    lastChecked: "May 2026",
    trustNote:
      "Existing uiori platform route. Re-check current eligibility, payout method, and account rules before spending serious time.",
  },
  {
    slug: "timebucks",
    name: "TimeBucks",
    category: "Surveys & tasks",
    payouts: ["Multiple methods vary by country"],
    difficulty: "Beginner",
    threshold: "Check current account dashboard",
    bestFor: "Users testing many small earning categories from one dashboard",
    warning:
      "Skip tasks that ask for fake reviews, fake engagement, or anything that violates another platform’s rules.",
    alts: ["freecash", "ysense", "sproutgigs"],
    officialUrl: "https://timebucks.com/",
    lastChecked: "May 2026",
    trustNote:
      "Existing uiori platform route. Re-check current eligibility, payout method, and account rules before spending serious time.",
  },
  {
    slug: "appen",
    name: "Appen",
    category: "AI training projects",
    payouts: ["Project-dependent"],
    difficulty: "Medium",
    threshold: "Project-dependent",
    bestFor: "Longer AI data, search evaluation, and language-related projects",
    warning:
      "Project approval is not guaranteed. Read project rules, location requirements, and payment timelines carefully.",
    alts: ["clickworker", "remotasks", "usertesting"],
    officialUrl: "https://appen.com/jobs/",
    lastChecked: "May 2026",
    trustNote:
      "Existing uiori platform route. Re-check current eligibility, payout method, and account rules before spending serious time.",
  },
  {
    slug: "remotasks",
    name: "Remotasks-style AI Tasks",
    category: "AI data tasks",
    payouts: ["Platform-dependent"],
    difficulty: "Medium to hard",
    threshold: "Varies",
    bestFor:
      "Users willing to train for data labeling and AI task quality checks",
    warning:
      "Branding, access, and country eligibility can change. Use official login pages only and avoid account brokers.",
    alts: ["appen", "clickworker", "sproutgigs"],
    officialUrl: "https://www.remotasks.com/",
    lastChecked: "May 2026",
    trustNote:
      "Existing uiori platform route. Re-check current eligibility, payout method, and account rules before spending serious time.",
  },
  {
    slug: "ysense",
    name: "ySense",
    category: "Surveys & offers",
    payouts: ["PayPal where available", "Gift cards", "Other methods vary"],
    difficulty: "Beginner",
    threshold: "Varies by reward option",
    bestFor:
      "Survey and offer users who want multiple cashout methods where supported",
    warning:
      "Survey disqualification is common. Track time spent so the route remains worth it.",
    alts: ["swagbucks", "freecash", "timebucks"],
    officialUrl: "https://www.ysense.com/",
    lastChecked: "May 2026",
    trustNote:
      "Existing uiori platform route. Re-check current eligibility, payout method, and account rules before spending serious time.",
  },
  {
    slug: "freecash",
    name: "Freecash",
    category: "Offerwalls",
    payouts: ["Crypto option", "Gift cards", "Other methods vary"],
    difficulty: "Beginner to medium",
    threshold: "Can be low, check current rewards",
    bestFor:
      "Users who understand offerwall rules and want low-threshold reward tests",
    warning:
      "Some offers require trials, deposits, or strict completion steps. Read each offer before starting.",
    alts: ["swagbucks", "ysense", "timebucks"],
    officialUrl: "https://freecash.com/",
    lastChecked: "May 2026",
    trustNote:
      "Existing uiori platform route. Re-check current eligibility, payout method, and account rules before spending serious time.",
  },
  {
    slug: "sproutgigs",
    name: "SproutGigs",
    category: "Micro jobs",
    payouts: ["Varies by account and country"],
    difficulty: "Beginner to medium",
    threshold: "Check current dashboard",
    bestFor:
      "Small freelance-style jobs and simple microtasks when tasks are legitimate",
    warning:
      "Avoid fake reviews, spam, fake social engagement, and any task that risks another account.",
    alts: ["clickworker", "timebucks", "freecash"],
    officialUrl: "https://sproutgigs.com/",
    lastChecked: "May 2026",
    trustNote:
      "Existing uiori platform route. Re-check current eligibility, payout method, and account rules before spending serious time.",
  },
  {
    slug: "usertesting",
    name: "UserTesting-style platforms",
    category: "Website testing",
    payouts: ["Platform-dependent"],
    difficulty: "Medium",
    threshold: "Per accepted test or schedule",
    bestFor:
      "Users with clear spoken feedback, stable internet, and good test discipline",
    warning:
      "Tests are competitive and not guaranteed. Quality matters more than speed.",
    alts: ["appen", "clickworker", "swagbucks"],
    officialUrl: "https://www.usertesting.com/get-paid-to-test",
    lastChecked: "May 2026",
    trustNote:
      "Existing uiori platform route. Re-check current eligibility, payout method, and account rules before spending serious time.",
  },
  {
    slug: "prolific",
    name: "Prolific",
    category: "Research studies",
    payouts: ["Platform-dependent"],
    difficulty: "Medium",
    threshold: "Check current account rules",
    bestFor:
      "Users in supported countries who qualify for academic or market research studies",
    warning:
      "Country support and waitlists can be strict. Do not buy accounts or use VPN tricks.",
    alts: ["ysense", "swagbucks", "usertesting"],
    officialUrl: "https://www.prolific.com/participants",
    lastChecked: "May 2026",
    trustNote:
      "Existing uiori platform route. Re-check current eligibility, payout method, and account rules before spending serious time.",
  },
  {
    slug: "toloka",
    name: "Toloka",
    category: "Microtasks",
    payouts: [
      "Payoneer or available methods vary",
      "Platform balance rules vary",
    ],
    difficulty: "Beginner to medium",
    threshold: "Check current wallet rules",
    bestFor:
      "Simple data tasks, local checks, search relevance, image or audio tasks where available",
    warning:
      "PayPal availability changed for some users in the past. Confirm your payout method first and do not work heavily before one small withdrawal test.",
    alts: ["clickworker", "microworkers", "oneforma"],
    officialUrl: "https://toloka.ai/tolokers",
    lastChecked: "May 2026",
    trustNote:
      "Known microtask marketplace, but payout methods and task supply vary strongly by country.",
  },
  {
    slug: "oneforma",
    name: "OneForma",
    category: "AI training projects",
    payouts: ["Payoneer", "PayPal with limits where available"],
    difficulty: "Medium",
    threshold: "Project-dependent monthly payments",
    bestFor:
      "AI data, language, annotation, search quality, and UHRS-style projects when approved",
    warning:
      "Project approval, country eligibility, and payment timing are not guaranteed. Read each project page and payment setup before production work.",
    alts: ["appen", "telus-digital", "toloka"],
    officialUrl: "https://www.oneforma.com/jobs/",
    lastChecked: "May 2026",
    trustNote:
      "Good project-based route; best treated as contractor work, not instant small cash.",
  },
  {
    slug: "telus-digital",
    name: "TELUS Digital AI Community",
    category: "AI training projects",
    payouts: ["Project-dependent", "Contractor payment method varies"],
    difficulty: "Medium to hard",
    threshold: "Role-dependent",
    bestFor:
      "Search evaluation, online data analyst, AI training, and language-specific remote roles",
    warning:
      "This is closer to application-based contractor work than a tiny task app. Expect assessments, compliance checks, and location-specific roles.",
    alts: ["appen", "oneforma", "remotasks"],
    officialUrl: "https://www.telusinternational.ai/",
    lastChecked: "May 2026",
    trustNote:
      "Legit company route, but not always open in every country or language.",
  },
  {
    slug: "utest",
    name: "uTest",
    category: "App & website testing",
    payouts: ["Project-dependent", "Payment method varies by tester account"],
    difficulty: "Medium",
    threshold: "Per accepted testing cycle",
    bestFor:
      "Bug testing, app testing, payment testing, device testing, and structured QA projects",
    warning:
      "Tests are competitive and must follow exact instructions. Do not submit weak bug reports just to chase quantity.",
    alts: ["test-io", "usertesting", "userlytics"],
    officialUrl: "https://www.utest.com/tester-signup",
    lastChecked: "May 2026",
    trustNote: "Strong testing route for users who can document bugs clearly.",
  },
  {
    slug: "test-io",
    name: "Test IO",
    category: "App & website testing",
    payouts: ["PayPal", "Bank account where available"],
    difficulty: "Medium",
    threshold: "Per accepted bug or test cycle",
    bestFor:
      "Crowdtesting, bug reporting, app tests, website tests, and payment flow testing",
    warning:
      "Rejected bugs may not pay. Register only through official pages; Test IO says registration should not require a fee.",
    alts: ["utest", "userlytics", "usertesting"],
    officialUrl: "https://test.io/company/become-a-tester",
    lastChecked: "May 2026",
    trustNote:
      "Useful if the user has patience for QA rules and rejection risk.",
  },
  {
    slug: "userlytics",
    name: "Userlytics",
    category: "Website testing",
    payouts: ["PayPal only"],
    difficulty: "Medium",
    threshold: "Per approved test",
    bestFor:
      "Remote UX tests, website feedback, prototypes, ads, videos, and app experience tests",
    warning:
      "PayPal is the key bottleneck. If your country or account cannot receive PayPal, this route may not work.",
    alts: ["usertesting", "test-io", "utest"],
    officialUrl:
      "https://www.userlytics.com/user-experience-research/paid-ux-testing/",
    lastChecked: "May 2026",
    trustNote:
      "Legit testing route, but PayPal-only payout makes country filtering important.",
  },
  {
    slug: "prizerebel",
    name: "PrizeRebel",
    category: "Surveys & offers",
    payouts: ["PayPal", "Gift cards", "Bitcoin option"],
    difficulty: "Beginner",
    threshold: "Low rewards available; exact minimum varies by reward",
    bestFor:
      "Survey and offer users who want reward variety and a small first cashout test",
    warning:
      "Non-US earning can be weaker. Avoid offers with deposits, unclear trials, or app installs you do not understand.",
    alts: ["ysense", "swagbucks", "freecash"],
    officialUrl: "https://www.prizerebel.com/",
    lastChecked: "May 2026",
    trustNote:
      "Established survey and rewards platform; still profile and country dependent.",
  },
  {
    slug: "toluna",
    name: "Toluna Influencers",
    category: "Surveys",
    payouts: [
      "Gift vouchers",
      "Cash where available",
      "Reward catalogue varies",
    ],
    difficulty: "Beginner",
    threshold: "Points-based rewards vary by country",
    bestFor:
      "Users who want a mainstream survey panel with country-specific reward catalogues",
    warning:
      "Survey supply and rewards vary by country. Do not assume every reward shown in one region exists in yours.",
    alts: ["ysense", "swagbucks", "prizerebel"],
    officialUrl: "https://www.toluna.com/",
    lastChecked: "May 2026",
    trustNote:
      "Large survey community; best used as one survey route, not a full income plan.",
  },
  {
    slug: "microworkers",
    name: "Microworkers",
    category: "Micro jobs",
    payouts: ["USD withdrawals", "Methods vary by country", "KYC required"],
    difficulty: "Beginner to medium",
    threshold: "Minimum withdrawal required",
    bestFor:
      "Small task experiments, data tasks, simple online jobs, and country-specific withdrawal tests",
    warning:
      "Skip fake engagement, fake reviews, spam, or anything that risks another account. KYC is required before withdrawal.",
    alts: ["sproutgigs", "clickworker", "toloka"],
    officialUrl: "https://www.microworkers.com/",
    lastChecked: "May 2026",
    trustNote:
      "Can be useful, but task quality varies; strong warnings are needed.",
  },
  {
    slug: "cointiply",
    name: "Cointiply",
    category: "Crypto rewards",
    payouts: ["Bitcoin", "Litecoin", "Dogecoin", "Dash"],
    difficulty: "Easy but low earning",
    threshold: "Crypto minimum varies by coin",
    bestFor:
      "Users who want to test tiny crypto rewards, offerwalls, surveys, and faucet-style routes",
    warning:
      "This is not serious income. Watch crypto fees, verification, volatility, local rules, and never deposit money to unlock earnings.",
    alts: ["freecash", "timebucks", "prizerebel"],
    officialUrl: "https://cointiply.com/",
    lastChecked: "May 2026",
    trustNote:
      "Known crypto reward route, but keep expectations very low and risk warnings visible.",
  },
];
