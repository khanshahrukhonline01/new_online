import { MEMBERSHIP_PLAN_PRICES } from '../../shared/payments/listingPricing'

/**
 * KhelGrid Pricing & Memberships Registry
 * Multi-audience monetization engine tailored for Indian athletes, academies, turfs & organizers.
 */

export type AudienceSegment = 'athlete' | 'academy' | 'venue' | 'organizer'
export type BillingCycle = 'monthly' | 'annual'

export interface PricingPlan {
  id: string
  name: string
  hindiName: string
  audience: AudienceSegment
  monthlyPrice: number // in INR (0 for free)
  annualPrice: number // in INR per year
  originalMonthlyPrice?: number
  originalAnnualPrice?: number
  annualSavingsLabel?: string
  popular?: boolean
  badge?: string
  blurb: string
  highlightFeature: string
  features: string[]
  ctaText: string
  isFree?: boolean
}

export const ATHLETE_PLANS: PricingPlan[] = [
  {
    id: 'athlete_free',
    name: 'Grassroots Explorer',
    hindiName: 'ग्रासरूट्स फ्री पास',
    audience: 'athlete',
    monthlyPrice: 0,
    annualPrice: 0,
    blurb: 'Essential tools for any khiladi starting their competitive journey across India.',
    highlightFeature: 'Free Athlete Passport & Match Search',
    isFree: true,
    features: [
      'Access to 54+ verified sports directories & cities',
      'Basic Sports CV with match & academy history',
      'Community pickup games & maidan lobby join',
      'View public selection trials & open tournaments',
      'Access to Grassroots Talent Scanner fitness tests',
      'Free Sports Tools & aerobic capacity calculators',
    ],
    ctaText: 'Current Free Plan',
  },
  {
    id: 'athlete_pro',
    name: 'KhelGrid Pro Athlete',
    hindiName: 'प्रो एथलीट पास',
    audience: 'athlete',
    monthlyPrice: MEMBERSHIP_PLAN_PRICES.athlete_pro.monthly,
    annualPrice: MEMBERSHIP_PLAN_PRICES.athlete_pro.annual,
    originalMonthlyPrice: 499,
    originalAnnualPrice: 2999,
    annualSavingsLabel: 'Save 50% · ₹125/mo',
    popular: true,
    badge: 'Most Popular for Khiladis',
    blurb: 'For serious competitive athletes aiming for State, AIU, SAI NCOE, and Ranji/ISL selections.',
    highlightFeature: 'Verified Scout ID Badge & Direct WhatsApp Alerts',
    features: [
      'Golden Verified Scout Badge on your digital Sports CV',
      'Instant WhatsApp & SMS Trial Alerts 48h before public release',
      'Scout & Selector View Radar: See who inspected your CV',
      'HD Match Reel & Drill Video Hosting (Uncompressed)',
      'Direct application to all partner academies with Zero convenience fees',
      'Priority showcase in National Scout & Coach directory',
      'BCCI & SAI Cut-off Age Verification certificate',
    ],
    ctaText: 'Upgrade to Pro Athlete',
  },
  {
    id: 'athlete_elite',
    name: 'Elite ScoutPass + AI Coach',
    hindiName: 'एलीट स्काउटपास व एआई कोच',
    audience: 'athlete',
    monthlyPrice: MEMBERSHIP_PLAN_PRICES.athlete_elite.monthly,
    annualPrice: MEMBERSHIP_PLAN_PRICES.athlete_elite.annual,
    originalMonthlyPrice: 899,
    originalAnnualPrice: 5999,
    annualSavingsLabel: 'Save 50% · ₹250/mo',
    badge: 'Pathway to Selections',
    blurb: 'Complete combine readiness toolkit with personalized AI drills and NIS coach review.',
    highlightFeature: 'Personalized Combine Preparation & NIS Review',
    features: [
      'Everything included in KhelGrid Pro Athlete',
      'One-on-One Sports CV Portfolio Review by NIS certified coach',
      'Customized 12-Week Trial Periodization & ACWR training plan',
      'Priority invitation to KhelGrid All-India Showcase Combines',
      'Direct messaging conduit to accredited scouts & selectors',
      'Official Talent Scanner Benchmark Percentile certificate',
    ],
    ctaText: 'Claim Elite ScoutPass',
  },
]

export const ACADEMY_PLANS: PricingPlan[] = [
  {
    id: 'academy_starter',
    name: 'Academy Operations Starter',
    hindiName: 'अकादमी संचालन योजना',
    audience: 'academy',
    monthlyPrice: MEMBERSHIP_PLAN_PRICES.academy_starter.monthly,
    annualPrice: MEMBERSHIP_PLAN_PRICES.academy_starter.annual,
    originalMonthlyPrice: 1499,
    originalAnnualPrice: 8999,
    annualSavingsLabel: 'Save 44% · ₹416/mo',
    blurb: 'Optional tools for managing admissions enquiries, batches and academy operations. Directory submission and evidence review are free and separate.',
    highlightFeature: 'Admissions enquiry workflow',
    features: [
      'Directory submission and evidence review remain free without a membership',
      'Direct WhatsApp admissions routing to Academy Director',
      'Student lead management CRM with caller phone numbers',
      'Publish coaching batches, morning/evening slots & fee cards',
      'Search engine optimized academy profile with photo gallery',
      'Free admission enquiry SMS broadcasts to nearby athletes',
    ],
    ctaText: 'Explore Academy Tools',
  },
  {
    id: 'academy_pro',
    name: 'Academy Pro & Admissions Hub',
    hindiName: 'अकादमी प्रो एडमिशन हब',
    audience: 'academy',
    monthlyPrice: MEMBERSHIP_PLAN_PRICES.academy_pro.monthly,
    annualPrice: MEMBERSHIP_PLAN_PRICES.academy_pro.annual,
    originalMonthlyPrice: 3499,
    originalAnnualPrice: 21999,
    annualSavingsLabel: 'Save 41% · ₹1,083/mo',
    popular: true,
    badge: 'Best for Academies',
    blurb: 'Optional admissions and programme-management tools for growing academies. Membership does not buy verification or search ranking.',
    highlightFeature: 'Admissions workflow and batch operations',
    features: [
      'Everything in Academy Verified Partner',
      'Advanced admissions enquiry routing and batch administration',
      'Host Selection Trials & Camps with integrated online player registration',
      'Digital Player Bib & Entry Pass generator with QR scanning',
      'Automated parent fee collection via UPI (0% platform charge)',
      'Operational reporting for academy programmes',
      'Feature in KhelGrid Weekly Grassroots Newsletter (50k+ readers)',
    ],
    ctaText: 'Claim Academy Pro Hub',
  },
  {
    id: 'academy_enterprise',
    name: 'Residential / Multi-Center Franchise',
    hindiName: 'मल्टी-सेंटर व फ्रेंचाइजी पार्टनर',
    audience: 'academy',
    monthlyPrice: MEMBERSHIP_PLAN_PRICES.academy_enterprise.monthly,
    annualPrice: MEMBERSHIP_PLAN_PRICES.academy_enterprise.annual,
    originalMonthlyPrice: 6999,
    originalAnnualPrice: 41999,
    annualSavingsLabel: 'Save 40% · ₹2,083/mo',
    badge: 'Enterprise / Franchise',
    blurb: 'For large sports complexes, multi-branch academies, and residential sports schools.',
    highlightFeature: 'Multi-Branch Roster & Federation Tournament Manager',
    features: [
      'Manage up to 5 branch locations under one unified dashboard',
      'Federation tournament entry management & player NOC tracker',
      'Bulk Sports CV generation for all academy students',
      'Dedicated account director with priority phone & WhatsApp support',
      'Custom branded subdomain & promotional social media spotlight',
      'Custom GST invoicing with corporate billing support',
    ],
    ctaText: 'Contact Enterprise Team',
  },
]

export const VENUE_PLANS: PricingPlan[] = [
  {
    id: 'venue_free_listing',
    name: 'Free Venue Listing',
    hindiName: 'मुफ़्त खेल स्थल सूची',
    audience: 'venue',
    monthlyPrice: 0,
    annualPrice: 0,
    isFree: true,
    blurb: 'Submit your genuine sports venue for evidence review and public directory consideration.',
    highlightFeature: 'Free submission · Independent evidence review',
    features: [
      'No listing subscription or checkout',
      'Venue identity and public address review',
      'Sports, facilities and public source details',
      'Publication only after moderation approval',
      'Corrections can be requested without a paid plan',
    ],
    ctaText: 'Submit a venue listing',
  },
]

export const ORGANIZER_BOOST_PLANS: PricingPlan[] = [
  {
    id: 'trial_free_listing',
    name: 'Free Trial & Opportunity Listing',
    hindiName: 'मुफ़्त खेल ट्रायल सूची',
    audience: 'organizer',
    monthlyPrice: 0,
    annualPrice: 0,
    isFree: true,
    blurb: 'Share genuine sports trials and grassroots opportunities. KhelGrid reviews the organiser source and key details before publication.',
    highlightFeature: 'Free trial submission · Evidence-led review',
    features: [
      'No listing payment, boost fee or subscription',
      'Organiser and official source review',
      'Trial dates, deadline and eligibility checks',
      'Venue and athlete entry fee shown only when disclosed',
      'Publication after moderation and evidence approval',
    ],
    ctaText: 'Submit a trial listing',
  },
]

export interface PricingFaqItem {
  question: string
  hindiQuestion: string
  answer: string
}

export const PRICING_FAQS: PricingFaqItem[] = [
  {
    question: 'Do I pay to submit or verify a venue, coach or trial listing?',
    hindiQuestion: 'खेलग्रिड पर भुगतान कैसे काम करता है? क्या सीधे यूपीआई से भुगतान कर सकते हैं?',
    answer: 'No. Venue, coach and sports-trial directory submissions and evidence review are free. Any venue hire, coaching or athlete entry fee is set by the independent provider or organiser and is separate from KhelGrid listing.',
  },
  {
    question: 'How are sports-trial listings reviewed?',
    hindiQuestion: '"जीरो फेक ट्रायल गारंटी" क्या है?',
    answer: 'KhelGrid reviews available organiser, source, date, venue and eligibility evidence before publication. A review is not a guarantee of future availability or selection. Athletes should confirm final instructions and any entry fee with the organiser.',
  },
  {
    question: 'Can I cancel my membership or switch between monthly and annual plans?',
    hindiQuestion: 'क्या मैं अपनी मेंबरशिप कभी भी कैंसिल या प्लान बदल सकता हूँ?',
    answer: 'Yes, you can upgrade, downgrade, or cancel your membership at any time with one click from your Account Settings. For annual plans, you receive a full 7-day no-questions-asked refund guarantee if you are not 100% satisfied with our scout visibility and tools.',
  },
  {
    question: 'Are academy directory listings free?',
    hindiQuestion: 'अकादमी मेंबरशिप से मेरी अकादमी को कैसे फायदा होगा?',
    answer: 'Yes. An academy can submit a directory listing and supporting evidence without buying a membership. Optional academy operations services are separate and do not purchase approval, verification or search ranking.',
  },
  {
    question: 'Do venues pay KhelGrid to appear in the directory?',
    hindiQuestion: 'क्या टर्फ मालिकों को बुकिंग पर कमीशन देना होता है?',
    answer: 'No. Venue directory submission and evidence review are free. A venue may set its own hire rates and booking terms; those provider charges are separate from a KhelGrid listing.',
  },
]

export interface TestimonialItem {
  quote: string
  author: string
  role: string
  location: string
  sport: string
}

export const PRICING_TESTIMONIALS: TestimonialItem[] = [
  {
    quote: 'The instant WhatsApp trial alerts alone got me into the Under-19 State selection combine. I received the notice 2 days before the slots filled up on public forums!',
    author: 'Amanpreet Singh',
    role: 'Pacer & Pro Athlete Member',
    location: 'Ludhiana, Punjab',
    sport: 'Cricket',
  },
  {
    quote: 'We listed our badminton academy on KhelGrid Pro. Within 6 weeks, we enrolled 14 new students from our Sector. The direct WhatsApp inquiry link makes conversion instant.',
    author: 'Coach Rajeshwar Nair',
    role: 'NIS Certified Head Coach',
    location: 'Bengaluru, Karnataka',
    sport: 'Badminton',
  },
  {
    quote: 'The 0% commission turf model is revolutionary for ground owners. We collect all our box cricket bookings directly via our own UPI QR with zero deductions.',
    author: 'Faheem Akhtar',
    role: 'Owner, Arena 5 Sports Complex',
    location: 'Hyderabad, Telangana',
    sport: 'Box Cricket & Futsal',
  },
]
