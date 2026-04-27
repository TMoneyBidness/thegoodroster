/**
 * Centralized site configuration.
 * All [BRACKETED_PLACEHOLDER] values are pulled from environment
 * variables so they can be swapped without touching component code.
 */

export const siteConfig = {
  // --- Site Identity ---
  companyName: import.meta.env.PUBLIC_COMPANY_NAME || 'TheGoodRoster',
  siteUrl: import.meta.env.PUBLIC_SITE_URL || 'https://thegoodroster.com',
  siteName: import.meta.env.PUBLIC_SITE_NAME || 'TheGoodRoster',

  // --- Editorial ---
  editorialAuthor: {
    name: import.meta.env.PUBLIC_EDITORIAL_AUTHOR_NAME || 'TheGoodRoster Editorial Team',
    credential: import.meta.env.PUBLIC_EDITORIAL_AUTHOR_CREDENTIAL || '',
  },

  // --- Contact ---
  contactEmail: import.meta.env.PUBLIC_CONTACT_EMAIL || 'contact@thegoodroster.com',
  contactPhone: import.meta.env.PUBLIC_CONTACT_PHONE || '',

  // --- Analytics ---
  ga4MeasurementId: import.meta.env.PUBLIC_GA4_MEASUREMENT_ID || '',

  // --- Anti-spam ---
  turnstileSiteKey: import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || '',

  // --- Compliance ---
  disclaimerBar: `TheGoodRoster · San Diego. Not a lender. Your inquiry goes only to the person you choose.`,
  toolDisclaimer: 'This is not a loan approval or commitment to lend. Results are estimates only.',
  partnerTerminology: 'Community Partners',
  partnerTerminologyPlural: 'Licensed Mortgage Professionals',

  notALenderDisclaimer: `${import.meta.env.PUBLIC_SITE_NAME || 'TheGoodRoster'} is a directory and marketing service. We are not a mortgage lender, mortgage broker, or loan originator. We do not negotiate loan terms, take loan applications, quote rates, or pre-qualify consumers.`,

  partnerDisclaimer: 'We do not endorse or recommend any listed professional. Listing does not constitute an endorsement. You are not required to use any listed professional.',

  partnerPageDisclaimer: `When you submit an inquiry through this site, your contact information goes only to the one Community Partner you select — never to a network, never to multiple lenders, and never to marketing partners. We do not steer, rank, or rotate inquiries based on which Community Partner pays more. Each Community Partner pays a flat marketing fee per inquiry, regardless of whether a loan closes. This fee is for advertising and directory placement and is not contingent on any settlement service.`,

  compensationDisclosure: 'We may receive compensation when you connect with a listed professional.',

  // Per-professional TCPA consent template — {NAME} and {NMLS} are replaced dynamically
  tcpaPerProfessionalConsent: `By clicking "Agree and Connect" below, I am providing my electronic (E-SIGN) signature and prior express written consent for {NAME} (NMLS #{NMLS}) (and parties calling on its behalf) to contact me at the telephone number and email address I have provided regarding mortgage products and services, including through the use of an automatic telephone dialing system, an artificial or prerecorded voice, AI-generated voice, and SMS/MMS text messages, even if my number is on a state, federal, or corporate Do-Not-Call list. My consent is not required as a condition of any purchase. Message and data rates may apply. Message frequency varies. I may revoke consent at any time by replying STOP to a text or by calling the professional directly.`,

  // Generic TCPA consent for the quiz (names all three partners inline)
  tcpaQuizConsent: `By clicking "Submit" below, I provide my electronic (E-SIGN) signature and prior express written consent for the Community Partners listed at {SITE_URL}/community-partners/ to contact me at the phone number and email I provided regarding mortgage products and services, including through the use of an automatic telephone dialing system, an artificial or prerecorded voice, AI-generated voice, and SMS/MMS text messages, even if my number is on a state, federal, or corporate Do-Not-Call list. My consent is not required as a condition of any purchase. I may revoke consent at any time by replying STOP.`,

  formLegalText: 'By submitting, you agree to our Privacy Policy.',

  // --- CCPA ---
  ccpaOptOutUrl: '/privacy/#do-not-sell',
  ccpaFooterLabel: 'Your Privacy Choices / Do Not Sell or Share My Personal Information',

  // --- Navigation ---
  nav: [
    { label: 'Home', href: '/' },
    { label: 'First-Time Buyers', href: '/first-time-homebuyer-san-diego/' },
    { label: 'Loan Programs', href: '/loan-programs/' },
    { label: 'Down Payment Help', href: '/down-payment-assistance-san-diego/' },
    { label: 'Tools', href: '/tools/' },
    { label: 'Guides', href: '/guides/' },
    { label: 'Find a Pro', href: '/community-partners/' },
  ],

  // --- Footer Nav ---
  footerNav: {
    about: [
      { label: 'About Us', href: '/about/' },
      { label: 'Workshops', href: '/workshops/' },
      { label: 'Community Partners', href: '/community-partners/' },
      { label: 'Contact', href: '/contact/' },
    ],
    resources: [
      { label: 'All Guides', href: '/guides/' },
      { label: 'Loan Program Index', href: '/loan-programs/' },
      { label: 'DPA Program Index', href: '/down-payment-assistance-san-diego/' },
    ],
    tools: [
      { label: 'Mortgage Calculator', href: '/tools/mortgage-calculator/' },
      { label: 'DPA Finder', href: '/tools/dpa-finder/' },
      { label: 'Closing Cost Estimator', href: '/tools/closing-cost-estimator/' },
      { label: 'Affordability Calculator', href: '/tools/affordability-calculator/' },
      { label: 'Document Checklist', href: '/tools/document-checklist/' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy/' },
      { label: 'Disclaimers', href: '/disclaimers/' },
      { label: 'Your Privacy Choices', href: '/privacy/#do-not-sell' },
    ],
  },

  // --- San Diego Defaults (used in calculators) ---
  sdDefaults: {
    propertyTaxRate: 0.0125,
    homeInsuranceAnnual: 1500,
    defaultMelloRoos: 0,
    fhaLoanLimit: 1077550,
    conformingLoanLimit: 1104000,
    medianHomePrice: 1000000,
  },
} as const;

export type SiteConfig = typeof siteConfig;
