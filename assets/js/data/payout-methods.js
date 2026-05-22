export const payouts = [
  {
    "slug": "paypal",
    "name": "PayPal",
    "strength": "Strong when receiving is supported",
    "summary": "Useful for survey, testing, and offer platforms, but receiving ability and withdrawal options vary sharply by country.",
    "warnings": [
      "Confirm your account can receive money before choosing PayPal-only platforms.",
      "Do not use VPN or fake country information to bypass restrictions."
    ],
    "platforms": [
      "swagbucks",
      "ysense",
      "prizerebel",
      "userlytics",
      "test-io",
      "clickworker"
    ]
  },
  {
    "slug": "crypto",
    "name": "Crypto",
    "strength": "Flexible but higher risk",
    "summary": "Crypto can be useful for low-payout sites and offerwalls, but fees, volatility, account rules, and local regulations matter.",
    "warnings": [
      "Check local rules before using crypto routes.",
      "Avoid investment, doubling, staking, or deposit-required “earning” schemes."
    ],
    "platforms": [
      "cointiply",
      "freecash",
      "timebucks",
      "prizerebel"
    ]
  },
  {
    "slug": "payoneer",
    "name": "Payoneer",
    "strength": "Useful for work platforms",
    "summary": "Payoneer is often more relevant for freelance, contractor, and project-based platforms than tiny survey apps.",
    "warnings": [
      "Check fees and minimum withdrawal routes.",
      "Do not create accounts through unofficial agents."
    ],
    "platforms": [
      "oneforma",
      "appen",
      "toloka",
      "clickworker",
      "ysense"
    ]
  },
  {
    "slug": "gift-cards",
    "name": "Gift Cards",
    "strength": "Good for small rewards",
    "summary": "Gift cards can be easier than cash in some countries, but resale value and regional restrictions matter.",
    "warnings": [
      "Only choose cards you can redeem personally.",
      "Avoid risky resale groups and discounted card scams."
    ],
    "platforms": [
      "swagbucks",
      "ysense",
      "toluna",
      "prizerebel",
      "freecash"
    ]
  },
  {
    "slug": "bank-transfer",
    "name": "Bank Transfer",
    "strength": "Best when supported directly",
    "summary": "Bank transfer is clean when available, but many small earning platforms do not support it in every country.",
    "warnings": [
      "Confirm minimum withdrawal, fees, and currency conversion before working.",
      "Check whether the platform uses a payment partner."
    ],
    "platforms": [
      "test-io",
      "appen",
      "clickworker",
      "oneforma"
    ]
  }
];
