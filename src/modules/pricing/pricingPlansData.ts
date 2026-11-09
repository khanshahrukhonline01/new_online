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
    name: 'Academy Verified Partner',
    hindiName: 'वेरिफाइड अकादमी पार्टनर',
    audience: 'academy',
    monthlyPrice: MEMBERSHIP_PLAN_PRICES.academy_starter.monthly,
    annualPrice: MEMBERSHIP_PLAN_PRICES.academy_starter.annual,
    originalMonthlyPrice: 1499,
    originalAnnualPrice: 8999,
    annualSavingsLabel: 'Save 44% · ₹416/mo',
    blurb: 'Establish credible online verification and attract local parent student enquiries.',
    highlightFeature: 'Direct WhatsApp Parent Admissions Routing',
    features: [
      'Golden Verified Academy Badge across City & Sport searches',
      'Direct WhatsApp admissions routing to Academy Director',
      'Student lead management CRM with caller phone numbers',
      'Publish coaching batches, morning/evening slots & fee cards',
      'Search engine optimized academy profile with photo gallery',
      'Free admission enquiry SMS broadcasts to nearby athletes',
    ],
    ctaText: 'Get Verified Academy',
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
    blurb: 'Maximum admissions growth, trial hosting, and top ranking in your city.',
    highlightFeature: '#1 Featured Rank in City & Automated Trial Registrations',
    features: [
      'Everything in Academy Verified Partner',
      'Priority #1 Featured Sticky Rank in City searches (e.g. Delhi, Bengaluru)',
      'Host Selection Trials & Camps with integrated online player registration',
      'Digital Player Bib & Entry Pass generator with QR scanning',
      'Automated parent fee collection via UPI (0% platform charge)',
      'Dedicated listing manager & quarterly performance audit',
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
    id: 'venue_basic',
    name: 'Turf Free Listing',
    hindiName: 'टर्फ फ्री लिस्टिंग',
    audience: 'venue',
    monthlyPrice: 0,
    annualPrice: 0,
    isFree: true,
    blurb: 'Get your maidan, court, or turf visible to thousands of local sports teams.',
    highlightFeature: 'Free Directory Listing & Phone Inquiries',
    features: [
      'Verified presence in KhelGrid City Sports Complex directory',
      'Display court photos, surface specs, and hourly rate card',
      'Direct caller phone connect to turf manager',
      'Google Maps directions pin integration',
    ],
    ctaText: 'List Turf for Free',
  },
  {
    id: 'venue_pro',
    name: 'Turf & Complex Pro Partner',
    hindiName: 'टर्फ प्रो पार्टनर (0% कमीशन)',
    audience: 'venue',
    monthlyPrice: MEMBERSHIP_PLAN_PRICES.venue_pro.monthly,
    annualPrice: MEMBERSHIP_PLAN_PRICES.venue_pro.annual,
    originalMonthlyPrice: 2499,
    originalAnnualPrice: 14999,
    annualSavingsLabel: 'Save 40% · ₹750/mo',
    popular: true,
    badge: '0% Booking Commission',
    blurb: 'Fill empty day-time and late-night slots, accept UPI payments, and manage slots effortlessly.',
    highlightFeature: '0% Commission Booking & WhatsApp Fee Splitter',
    features: [
      '0% Commission on hourly slot bookings (Keep 100% of revenue)',
      'Featured #1 placement in "Book Turf Near Me" local searches',
      'Automated player slot booking confirmation via WhatsApp',
      'KhelGrid Box Cricket Match Fee Splitter integration with UPI',
      'Peak-hour dynamic pricing & floodlight surcharge manager',
      'QR Standee for your turf reception desk for instant repeat bookings',
    ],
    ctaText: 'Activate Turf Pro Partner',
  },
]

export const ORGANIZER_BOOST_PLANS: PricingPlan[] = [
  {
    id: 'boost_7d',
    name: '7-Day Event & Trial Boost',
    hindiName: '7-दिवसीय ट्रायल बूस्ट',
    audience: 'organizer',
    monthlyPrice: MEMBERSHIP_PLAN_PRICES.boost_7d.monthly,
    annualPrice: MEMBERSHIP_PLAN_PRICES.boost_7d.annual,
    badge: 'Trial Organizer Choice',
    popular: true,
    blurb: 'For tournament and selection trial organizers who need packed player attendance.',
    highlightFeature: 'Pinned Featured Spot & 10,000+ Regional Athlete Push',
    features: [
      'Pinned "Featured Trial" top card on `/opportunities` & `/calendar` for 7 days',
      'Golden glow radar highlight border & eye-catching promotion banner',
      'Direct WhatsApp broadcast to registered athletes in your district/state',
      'Digital Applicant Registration CRM with one-click CSV export',
      'Direct athlete phone & WhatsApp leads routing',
      'Zero per-player registration commission',
    ],
    ctaText: 'Boost a Trial for ₹1,500',
  },
  {
    id: 'boost_30d',
    name: '30-Day League & State Combine Mega Boost',
    hindiName: '30-दिवसीय मेगा लीग बूस्ट',
    audience: 'organizer',
    monthlyPrice: MEMBERSHIP_PLAN_PRICES.boost_30d.monthly,
    annualPrice: MEMBERSHIP_PLAN_PRICES.boost_30d.annual,
    originalMonthlyPrice: 6000,
    annualSavingsLabel: 'Save 25%',
    badge: 'Mega Tournament',
    blurb: 'Full-season tournament promotion across multi-city zones with social highlights.',
    highlightFeature: 'State-wide Athlete Broadcast & Live Match Spotlight',
    features: [
      '30-Day Pinned Featured listing on all major tournament hubs',
      'State-wide WhatsApp & notification push across 50,000+ players',
      'Live Match Center integration on `/live` with real-time score updates',
      'Social media reel spotlight across KhelGrid verified channels',
      'Dedicated helpline for player registration support',
    ],
    ctaText: 'Mega Boost for ₹4,499',
  },
]

export interface PricingFaqItem {
  question: string
  hindiQuestion: string
  answer: string
}

export const PRICING_FAQS: PricingFaqItem[] = [
  {
    question: 'How do payments work on KhelGrid? Can I pay via UPI directly?',
    hindiQuestion: 'खेलग्रिड पर भुगतान कैसे काम करता है? क्या सीधे यूपीआई से भुगतान कर सकते हैं?',
    answer: 'Yes! KhelGrid supports direct instant UPI checkout across Google Pay, PhonePe, Paytm, BHIM, and any bank UPI app. You can also pay securely using Credit/Debit Cards (Visa, RuPay, MasterCard) or NetBanking. Payments are processed with bank-grade 256-bit encryption and activate your membership immediately with an instant digital GST invoice.',
  },
  {
    question: 'What is the "Zero Fake Trials Guarantee"?',
    hindiQuestion: '"जीरो फेक ट्रायल गारंटी" क्या है?',
    answer: 'Every trial, academy, and scholarship listed on KhelGrid undergoes physical and digital verification against official federation records (BCCI, AIFF, SAI, BAI). If any listed trial charges illegal unofficial fees or misrepresents selectors, our Trust & Safety team immediately blacklists the organizer and assists athletes with complete refunds.',
  },
  {
    question: 'Can I cancel my membership or switch between monthly and annual plans?',
    hindiQuestion: 'क्या मैं अपनी मेंबरशिप कभी भी कैंसिल या प्लान बदल सकता हूँ?',
    answer: 'Yes, you can upgrade, downgrade, or cancel your membership at any time with one click from your Account Settings. For annual plans, you receive a full 7-day no-questions-asked refund guarantee if you are not 100% satisfied with our scout visibility and tools.',
  },
  {
    question: 'How does the Academy Partner membership pay for itself?',
    hindiQuestion: 'अकादमी मेंबरशिप से मेरी अकादमी को कैसे फायदा होगा?',
    answer: 'On average, sports academies in Indian metros charge ₹2,500 to ₹5,000 per month per student. Gaining just ONE new full-year student admission from KhelGrid (average annual fee ₹30,000–₹50,000) covers the cost of your KhelGrid Academy Pro membership 4× to 6× over.',
  },
  {
    question: 'Do sports turfs have to pay commissions on match bookings?',
    hindiQuestion: 'क्या टर्फ मालिकों को बुकिंग पर कमीशन देना होता है?',
    answer: 'No! Unlike food delivery or cab aggregator apps that take 20–30% cuts, KhelGrid Turf Pro has a strict 0% booking commission policy. You keep 100% of the court fee paid by players directly to your own UPI QR code.',
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
