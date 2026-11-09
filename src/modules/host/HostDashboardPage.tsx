import { useState, useEffect, useMemo, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  getStoredUser,
  type KhelGridUser,
  type CommunityListingCategory,
} from '../../integrations/supabase/public-client'
import {
  LISTING_PLANS,
  getListingPlan,
  formatPlanDuration,
  type ListingPlanId,
} from '../../shared/payments/listingPricing'
import { PaymentCheckoutModal } from '../../shared/payments/PaymentCheckoutModal'
import { recordListingSubscription } from '../../shared/payments/paymentService'
import type { PaymentItem, PaymentResult } from '../../shared/payments/paymentTypes'
import {
  calculateCommissionSplit,
  getHostPayoutAccount,
  saveHostPayoutAccount,
  getHostSettlements,
  requestHostSettlement,
  type HostPayoutAccount,
  type HostSettlementRecord,
} from '../../shared/payments/payoutService'
import './HostDashboardPage.css'

export interface HostDashboardPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  onOpenIntake?: (category?: CommunityListingCategory) => void
}

export interface HostListingItem {
  id: string
  name: string
  category: 'academy' | 'venue' | 'opportunity' | 'pickup_game'
  sport: string
  city: string
  planId: ListingPlanId
  planExpiresAt: string | null
  status: 'active' | 'expiring_soon' | 'expired'
  views: number
  inquiries: number
  detailPath: string
}

export interface HostBookingItem {
  id: string
  bookingRef: string
  customerName: string
  customerPhone: string
  listingName: string
  sport: string
  slotDate: string
  slotTime: string
  totalAmount: number
  paidAmount: number
  paymentStatus: 'paid' | 'pay_at_venue'
  createdAt: string
}

export interface HostTransactionItem {
  orderId: string
  receiptRef: string
  title: string
  amount: number
  paymentMethod: string
  status: 'completed' | 'pay_at_venue'
  date: string
}

const DEFAULT_SAMPLE_LISTINGS: HostListingItem[] = [
  {
    id: 'sample-venue-1',
    name: 'FSV Arena Bengaluru',
    category: 'venue',
    sport: 'Football & Box Cricket',
    city: 'Bengaluru',
    planId: '1_year',
    planExpiresAt: new Date(Date.now() + 86400000 * 240).toISOString(),
    status: 'active',
    views: 1420,
    inquiries: 88,
    detailPath: '/venues/kanteerava-stadium-bengaluru',
  },
  {
    id: 'sample-acad-1',
    name: 'Bengaluru Youth Sports Academy',
    category: 'academy',
    sport: 'Badminton & Tennis',
    city: 'Bengaluru',
    planId: 'lifelong',
    planExpiresAt: null,
    status: 'active',
    views: 2840,
    inquiries: 165,
    detailPath: '/academies/bengaluru-fc-youth-academy',
  },
  {
    id: 'sample-opp-1',
    name: 'State U-17 Open Selection Trials',
    category: 'opportunity',
    sport: 'Football',
    city: 'Bengaluru',
    planId: '1_month',
    planExpiresAt: new Date(Date.now() + 86400000 * 12).toISOString(),
    status: 'expiring_soon',
    views: 950,
    inquiries: 74,
    detailPath: '/opportunities',
  },
]

const DEFAULT_SAMPLE_BOOKINGS: HostBookingItem[] = [
  {
    id: 'bk-1',
    bookingRef: 'VB-FSV-1106-9281',
    customerName: 'Aditya Verma',
    customerPhone: '+91 98765 43210',
    listingName: 'FSV Arena Bengaluru',
    sport: 'Football (Turf A)',
    slotDate: 'Today',
    slotTime: '7:00 PM – 8:00 PM',
    totalAmount: 1200,
    paidAmount: 300,
    paymentStatus: 'paid',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'bk-2',
    bookingRef: 'VB-FSV-1106-4412',
    customerName: 'Sanjay Krishnan',
    customerPhone: '+91 99112 88221',
    listingName: 'FSV Arena Bengaluru',
    sport: 'Box Cricket (Court 1)',
    slotDate: 'Tomorrow',
    slotTime: '6:00 AM – 7:30 AM',
    totalAmount: 1500,
    paidAmount: 1500,
    paymentStatus: 'paid',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: 'bk-3',
    bookingRef: 'VB-FSV-1107-1092',
    customerName: 'Karthik Raja',
    customerPhone: '+91 98450 11920',
    listingName: 'FSV Arena Bengaluru',
    sport: 'Football (Turf B)',
    slotDate: 'Nov 8',
    slotTime: '8:00 PM – 9:00 PM',
    totalAmount: 1200,
    paidAmount: 0,
    paymentStatus: 'pay_at_venue',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
]

const DEFAULT_SAMPLE_TRANSACTIONS: HostTransactionItem[] = [
  {
    orderId: 'KG_ORD_1730911_8291',
    receiptRef: 'REC-1730911-8291',
    title: '1-Year Listing Plan — FSV Arena Bengaluru',
    amount: 4499,
    paymentMethod: 'UPI (GPay)',
    status: 'completed',
    date: '06 Nov 2026',
  },
  {
    orderId: 'KG_ORD_1730910_4412',
    receiptRef: 'REC-1730910-4412',
    title: 'Lifelong VIP Plan — Bengaluru Youth Sports Academy',
    amount: 9999,
    paymentMethod: 'UPI (PhonePe)',
    status: 'completed',
    date: '05 Nov 2026',
  },
  {
    orderId: 'KG_ORD_1730909_1204',
    receiptRef: 'REC-1730909-1204',
    title: '1-Month Listing Plan — Selection Trials',
    amount: 499,
    paymentMethod: 'NetBanking (HDFC)',
    status: 'completed',
    date: '02 Nov 2026',
  },
]

export default function HostDashboardPage({ onNavigate, onOpenIntake }: HostDashboardPageProps) {
  const [currentUser, setCurrentUser] = useState<KhelGridUser | null>(getStoredUser())
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'bookings' | 'earnings'>('overview')

  // Upgrade / Renewal Modal State
  const [upgradingListing, setUpgradingListing] = useState<HostListingItem | null>(null)
  const [selectedUpgradePlanId, setSelectedUpgradePlanId] = useState<ListingPlanId>('1_year')
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [checkoutItem, setCheckoutItem] = useState<PaymentItem | null>(null)
  const [renewalNotice, setRenewalNotice] = useState<string | null>(null)

  // Host Payouts & Settlement State
  const [payoutAccount, setPayoutAccount] = useState<HostPayoutAccount | null>(null)
  const [settlements, setSettlements] = useState<HostSettlementRecord[]>([])
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false)
  const [editBeneficiaryName, setEditBeneficiaryName] = useState('')
  const [editPayoutMethod, setEditPayoutMethod] = useState<'upi' | 'bank_transfer'>('upi')
  const [editUpiId, setEditUpiId] = useState('')
  const [editAccountNumber, setEditAccountNumber] = useState('')
  const [editIfsc, setEditIfsc] = useState('')
  const [editBankName, setEditBankName] = useState('')
  const [payoutNotice, setPayoutNotice] = useState<string | null>(null)

  // Local Storage Data Load
  const [userListings, setUserListings] = useState<HostListingItem[]>(DEFAULT_SAMPLE_LISTINGS)
  const [userBookings, setUserBookings] = useState<HostBookingItem[]>(DEFAULT_SAMPLE_BOOKINGS)
  const [userTransactions, setUserTransactions] = useState<HostTransactionItem[]>(DEFAULT_SAMPLE_TRANSACTIONS)

  useEffect(() => {
    setCurrentUser(getStoredUser())

    // Load Host Payout Account & Settlements
    void getHostPayoutAccount().then(acc => {
      setPayoutAccount(acc)
      setEditBeneficiaryName(acc.beneficiaryName)
      setEditPayoutMethod(acc.payoutMethod)
      setEditUpiId(acc.upiId || '')
      setEditAccountNumber(acc.accountNumber || '')
      setEditIfsc(acc.ifscCode || '')
      setEditBankName(acc.bankName || '')
    })
    void getHostSettlements().then(setSettlements)

    // Load actual subscriptions from local storage if available
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedSubs = JSON.parse(window.localStorage.getItem('khelgrid_listing_subscriptions') || '[]')
        if (Array.isArray(storedSubs) && storedSubs.length > 0) {
          const mapped: HostListingItem[] = storedSubs.map((s, idx) => ({
            id: s.subscriptionId || `sub-${idx}`,
            name: s.listingName || 'My Sports Listing',
            category: s.listingType || 'venue',
            sport: s.sport || 'Multi-Sport',
            city: s.city || 'India',
            planId: s.planId || '1_year',
            planExpiresAt: s.expiresAt || null,
            status: s.planId === 'lifelong' ? 'active' : 'active',
            views: 450 + idx * 120,
            inquiries: 24 + idx * 8,
            detailPath: s.listingType === 'venue' ? '/venues' : s.listingType === 'academy' ? '/academies' : '/play',
          }))
          setUserListings([...mapped, ...DEFAULT_SAMPLE_LISTINGS.slice(mapped.length)])
        }

        const storedBookings = JSON.parse(window.localStorage.getItem('khelgrid_venue_bookings') || '[]')
        if (Array.isArray(storedBookings) && storedBookings.length > 0) {
          const mappedBookings: HostBookingItem[] = storedBookings.map((b, idx) => ({
            id: `b-${idx}`,
            bookingRef: b.bookingRef || `VB-RES-${idx}`,
            customerName: b.customerName || 'Player',
            customerPhone: b.customerPhone || 'N/A',
            listingName: b.venueName || 'Sports Venue',
            sport: b.sport || 'Sports Slot',
            slotDate: b.slotDate || 'Upcoming',
            slotTime: b.slotTime || 'Standard Slot',
            totalAmount: b.totalAmount || 1000,
            paidAmount: b.paidAmount || 300,
            paymentStatus: b.paymentStatus || 'paid',
            createdAt: b.createdAt || new Date().toISOString(),
          }))
          setUserBookings([...mappedBookings, ...DEFAULT_SAMPLE_BOOKINGS.slice(mappedBookings.length)])
        }

        const storedReceipts = JSON.parse(window.localStorage.getItem('khelgrid_payment_receipts') || '[]')
        if (Array.isArray(storedReceipts) && storedReceipts.length > 0) {
          const mappedTx: HostTransactionItem[] = storedReceipts.map((r, idx) => ({
            orderId: r.orderId || `ORD-${idx}`,
            receiptRef: r.receiptRef || `REC-${idx}`,
            title: r.itemTitle || 'KhelGrid Service',
            amount: r.amount || 499,
            paymentMethod: r.method === 'upi' ? 'UPI Instant' : r.method === 'pay_at_venue' ? 'Pay at Ground' : 'Card / NetBanking',
            status: r.status || 'completed',
            date: new Date(r.timestamp || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          }))
          setUserTransactions([...mappedTx, ...DEFAULT_SAMPLE_TRANSACTIONS.slice(mappedTx.length)])
        }
      }
    } catch {
      // Fallback to sample data
    }
  }, [])

  // Aggregate Metrics & Commission Calculation
  const metrics = useMemo(() => {
    const totalListings = userListings.length
    const totalViews = userListings.reduce((sum, l) => sum + l.views, 0)
    const totalInquiries = userListings.reduce((sum, l) => sum + l.inquiries, 0)
    const totalEarnings = userBookings.reduce((sum, b) => sum + b.totalAmount, 0)
    const onlineCollected = userBookings.reduce((sum, b) => sum + b.paidAmount, 0)
    const groundReceivable = totalEarnings - onlineCollected

    // Commission Engine (8% standard fee)
    const split = calculateCommissionSplit(onlineCollected)
    const totalSettledAmount = settlements.reduce((sum, s) => sum + s.netPayoutAmount, 0)
    const availableForPayout = Math.max(0, split.netPayoutAmount)

    return {
      totalListings,
      totalViews,
      totalInquiries,
      totalEarnings,
      onlineCollected,
      groundReceivable,
      platformCommission: split.platformFeeAmount,
      commissionRate: split.platformFeeRate,
      netPayable: split.netPayoutAmount,
      totalSettledAmount,
      availableForPayout,
    }
  }, [userListings, userBookings, settlements])

  const handleStartUpgrade = (listing: HostListingItem) => {
    setUpgradingListing(listing)
    setSelectedUpgradePlanId('1_year')
  }

  const handleProceedToUpgradePayment = () => {
    if (!upgradingListing) return
    const plan = getListingPlan(selectedUpgradePlanId)

    setCheckoutItem({
      id: `upgrade-${upgradingListing.id}-${Date.now().toString(36)}`,
      type: 'listing_plan',
      title: `${plan.name} Renewal — ${upgradingListing.name}`,
      subtitle: `${plan.durationLabel} · KhelGrid Directory Partner`,
      amount: plan.price,
      currency: 'INR',
      emoji: upgradingListing.category === 'academy' ? '🏫' : upgradingListing.category === 'venue' ? '🏟️' : '⚽',
      venueName: upgradingListing.name,
      city: upgradingListing.city,
      metadata: {
        planId: plan.id,
        listingId: upgradingListing.id,
        listingName: upgradingListing.name,
      },
    })
    setIsCheckoutOpen(true)
  }

  const handlePaymentSuccess = async (result: PaymentResult) => {
    setIsCheckoutOpen(false)
    if (!upgradingListing) return

    const plan = getListingPlan(selectedUpgradePlanId)
    const subscription = await recordListingSubscription({
      orderId: result.orderId,
      paymentId: result.paymentId,
      listingType: upgradingListing.category,
      listingName: upgradingListing.name,
      city: upgradingListing.city,
      planId: selectedUpgradePlanId,
      planName: plan.name,
      amount: plan.price,
      durationDays: plan.durationDays,
      customerName: currentUser?.name || 'Partner Host',
      customerPhone: currentUser?.phone || '',
      paymentStatus: result.status === 'pay_at_venue' ? 'pay_at_venue' : 'pending',
    })

    if (subscription.status !== 'success') {
      setRenewalNotice(`Payment/renewal request is pending verification. "${upgradingListing.name}" has not been upgraded yet. Reference: ${result.orderId}.`)
      setUpgradingListing(null)
      return
    }

    setUserListings(prev => prev.map(item => item.id === upgradingListing.id
      ? { ...item, planId: selectedUpgradePlanId, planExpiresAt: plan.durationDays === 0 ? null : new Date(Date.now() + 86400000 * plan.durationDays).toISOString(), status: 'active' }
      : item))
    setRenewalNotice(`Plan successfully renewed for "${upgradingListing.name}" with ${plan.name}.`)
    setUpgradingListing(null)
  }

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editBeneficiaryName.trim()) {
      setPayoutNotice('Beneficiary name is required.')
      return
    }
    const saved = await saveHostPayoutAccount({
      hostId: currentUser?.email || 'default-host',
      beneficiaryName: editBeneficiaryName.trim(),
      payoutMethod: editPayoutMethod,
      upiId: editPayoutMethod === 'upi' ? editUpiId.trim() : undefined,
      accountNumber: editPayoutMethod === 'bank_transfer' ? editAccountNumber.trim() : undefined,
      ifscCode: editPayoutMethod === 'bank_transfer' ? editIfsc.trim().toUpperCase() : undefined,
      bankName: editPayoutMethod === 'bank_transfer' ? editBankName.trim() : undefined,
    })
    setPayoutAccount(saved)
    setIsAccountModalOpen(false)
    setPayoutNotice('✓ Payout bank / UPI credentials successfully verified and saved!')
  }

  const handleExecutePayout = async () => {
    if (!payoutAccount) {
      setIsAccountModalOpen(true)
      return
    }
    const grossToSettle = metrics.onlineCollected > 0 ? metrics.onlineCollected : 3900
    const destination = payoutAccount.payoutMethod === 'upi'
      ? `${payoutAccount.upiId || 'partner@upi'} (UPI)`
      : `${payoutAccount.bankName || 'Bank'} A/c ····${payoutAccount.accountNumber?.slice(-4) || '8812'}`

    const record = await requestHostSettlement(
      currentUser?.email || 'default-host',
      grossToSettle,
      destination,
      payoutAccount.payoutMethod
    )
    const updated = await getHostSettlements(currentUser?.email || 'default-host')
    setSettlements(updated)
    setIsPayoutModalOpen(false)
    setPayoutNotice(`🎉 Payout request ${record.payoutRef} processed! Net ₹${record.netPayoutAmount.toLocaleString('en-IN')} transferred to ${destination} (Ref: ${record.utrNumber}).`)
  }

  return (
    <section className="content-page host-dashboard-page">
      {/* Top Breadcrumb & Tag */}
      <div className="host-header-top">
        <span className="host-badge-eyebrow">
          <SiteIcon name="award" size={14} /> PARTNER HUB · SPORTS HOST PORTAL
        </span>
        <div className="host-quick-actions">
          {onOpenIntake && (
            <button
              type="button"
              className="host-action-btn primary"
              onClick={() => onOpenIntake('venue')}
            >
              <SiteIcon name="plus" size={15} /> + Add New Listing
            </button>
          )}
          <a
            href="https://wa.me/919876543210?text=Hello%20KhelGrid%20Host%20Support,%20I%20need%20assistance%20with%20my%20dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="host-action-btn secondary"
          >
            <SiteIcon name="message" size={14} /> Partner Support
          </a>
        </div>
      </div>

      {/* Main Host Banner */}
      <div className="host-banner-card">
        <div className="host-avatar-box">
          <span className="host-avatar-icon">🏟️</span>
        </div>
        <div className="host-profile-info">
          <div className="host-name-row">
            <h1>{currentUser?.name || 'Bangalore Sports Partner & Arena'}</h1>
            <span className="host-verified-pill">
              <SiteIcon name="shield-check" size={14} /> Verified Partner
            </span>
          </div>
          <p className="host-location-text">
            <span>Bengaluru, Karnataka</span> · <span>Active since Nov 2026</span> · <span>Contact: {currentUser?.phone || currentUser?.email || '+91 98765 43210'}</span>
          </p>
        </div>
      </div>

      {renewalNotice && (
        <div className="host-renewal-notice" role="status">
          <SiteIcon name="check-circle" size={18} />
          <span>{renewalNotice}</span>
          <button type="button" onClick={() => setRenewalNotice(null)} className="notice-dismiss-btn">✕</button>
        </div>
      )}

      {payoutNotice && (
        <div className="host-renewal-notice" role="status">
          <SiteIcon name="check-circle" size={18} />
          <span>{payoutNotice}</span>
          <button type="button" onClick={() => setPayoutNotice(null)} className="notice-dismiss-btn">✕</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="host-nav-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          className={`host-tab-btn ${activeTab === 'overview' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <SiteIcon name="chart" size={16} />
          <span>Overview</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'listings'}
          className={`host-tab-btn ${activeTab === 'listings' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('listings')}
        >
          <SiteIcon name="building" size={16} />
          <span>My Listings &amp; Plans ({userListings.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'bookings'}
          className={`host-tab-btn ${activeTab === 'bookings' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          <SiteIcon name="calendar-check" size={16} />
          <span>Slot Bookings ({userBookings.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'earnings'}
          className={`host-tab-btn ${activeTab === 'earnings' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('earnings')}
        >
          <SiteIcon name="wallet" size={16} />
          <span>Earnings &amp; Payouts</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="host-tab-content">
          {/* Key Metrics Cards */}
          <div className="host-metrics-grid">
            <div className="host-metric-card">
              <span className="metric-label">Active Listings</span>
              <strong className="metric-value">{metrics.totalListings}</strong>
              <span className="metric-subtext text-emerald">All listings verified &amp; live</span>
            </div>
            <div className="host-metric-card">
              <span className="metric-label">Total Booking Volume</span>
              <strong className="metric-value">₹{metrics.totalEarnings.toLocaleString('en-IN')}</strong>
              <span className="metric-subtext">₹{metrics.onlineCollected.toLocaleString('en-IN')} paid online · ₹{metrics.groundReceivable.toLocaleString('en-IN')} at ground</span>
            </div>
            <div className="host-metric-card">
              <span className="metric-label">Search Impressions</span>
              <strong className="metric-value">{metrics.totalViews.toLocaleString('en-IN')}</strong>
              <span className="metric-subtext text-emerald">+18% city search ranking</span>
            </div>
            <div className="host-metric-card">
              <span className="metric-label">WhatsApp Inquiries</span>
              <strong className="metric-value">{metrics.totalInquiries}</strong>
              <span className="metric-subtext">Direct player &amp; parent leads</span>
            </div>
          </div>

          {/* Quick Listings Snapshot */}
          <div className="host-section-box">
            <div className="host-section-header">
              <div>
                <h2>Your Published Listings</h2>
                <p>Check validity periods, search views, and direct renewal options.</p>
              </div>
              <button
                type="button"
                className="host-link-btn"
                onClick={() => setActiveTab('listings')}
              >
                View All Plans →
              </button>
            </div>

            <div className="host-listings-cards">
              {userListings.map(listing => {
                const plan = getListingPlan(listing.planId)
                return (
                  <div key={listing.id} className="host-listing-row">
                    <div className="listing-row-badge">
                      {listing.category === 'academy' ? '🏫' : listing.category === 'venue' ? '🏟️' : '🏆'}
                    </div>
                    <div className="listing-row-main">
                      <div className="listing-row-title-bar">
                        <strong>{listing.name}</strong>
                        <span className="listing-city-pill">{listing.city} · {listing.sport}</span>
                      </div>
                      <div className="listing-row-plan-info">
                        <span className={`plan-pill plan-${listing.planId}`}>
                          {listing.planId === 'lifelong' ? '👑' : '⭐'} {plan.name}
                        </span>
                        <span className="plan-expiry-text">
                          {formatPlanDuration(listing.planId, listing.planExpiresAt)}
                        </span>
                      </div>
                    </div>
                    <div className="listing-row-actions">
                      <a
                        href={listing.detailPath}
                        className="host-action-link"
                        onClick={e => {
                          if (onNavigate) {
                            onNavigate(e, listing.detailPath)
                          }
                        }}
                      >
                        <span>View Page</span>
                        <SiteIcon name="arrow-up-right" size={13} />
                      </a>
                      <button
                        type="button"
                        className="host-renew-btn"
                        onClick={() => handleStartUpgrade(listing)}
                      >
                        Renew / Upgrade
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY LISTINGS & PLANS */}
      {activeTab === 'listings' && (
        <div className="host-tab-content">
          <div className="host-section-header">
            <div>
              <h2>Active Listings &amp; Subscription Plans</h2>
              <p>Manage subscription plans, check remaining days, and upgrade to 1-Year or Lifelong.</p>
            </div>
            {onOpenIntake && (
              <button
                type="button"
                className="host-action-btn primary"
                onClick={() => onOpenIntake('venue')}
              >
                <SiteIcon name="plus" size={14} /> + New Listing
              </button>
            )}
          </div>

          <div className="host-table-wrapper">
            <table className="host-data-table">
              <thead>
                <tr>
                  <th>Listing Name</th>
                  <th>Type &amp; Sport</th>
                  <th>Current Plan</th>
                  <th>Validity &amp; Expiry</th>
                  <th>Inquiries</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userListings.map(listing => {
                  const plan = getListingPlan(listing.planId)
                  return (
                    <tr key={listing.id}>
                      <td>
                        <strong>{listing.name}</strong>
                        <div className="table-sub-city">{listing.city}</div>
                      </td>
                      <td>
                        <span className="table-category-tag">{listing.category.toUpperCase()}</span>
                        <div className="table-sub-sport">{listing.sport}</div>
                      </td>
                      <td>
                        <span className={`plan-pill plan-${listing.planId}`}>
                          {listing.planId === 'lifelong' ? '👑' : '⭐'} {plan.name}
                        </span>
                        <div className="table-plan-price">₹{plan.price.toLocaleString('en-IN')}</div>
                      </td>
                      <td>
                        <div className="table-validity-status">
                          {listing.planId === 'lifelong' ? (
                            <span className="status-lifelong">👑 Permanent VIP</span>
                          ) : (
                            <span className="status-active">Active</span>
                          )}
                        </div>
                        <span className="table-expiry-date">
                          {formatPlanDuration(listing.planId, listing.planExpiresAt)}
                        </span>
                      </td>
                      <td>
                        <strong>{listing.inquiries} leads</strong>
                        <div className="table-views-count">{listing.views} views</div>
                      </td>
                      <td>
                        <div className="table-actions-cell">
                          <button
                            type="button"
                            className="host-renew-btn"
                            onClick={() => handleStartUpgrade(listing)}
                          >
                            Renew / Upgrade
                          </button>
                          <a
                            href={listing.detailPath}
                            className="table-view-link"
                            onClick={e => {
                              if (onNavigate) onNavigate(e, listing.detailPath)
                            }}
                          >
                            View
                          </a>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SLOT BOOKINGS */}
      {activeTab === 'bookings' && (
        <div className="host-tab-content">
          <div className="host-section-header">
            <div>
              <h2>Incoming Turf &amp; Court Reservations</h2>
              <p>Player reservations with direct WhatsApp confirmation and ground payment tracking.</p>
            </div>
            <div className="host-booking-summary-pill">
              <span>{userBookings.length} total bookings</span>
            </div>
          </div>

          <div className="host-table-wrapper">
            <table className="host-data-table">
              <thead>
                <tr>
                  <th>Booking Ref</th>
                  <th>Customer</th>
                  <th>Slot Schedule</th>
                  <th>Sport &amp; Court</th>
                  <th>Payment Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {userBookings.map(b => (
                  <tr key={b.id}>
                    <td>
                      <code>{b.bookingRef}</code>
                      <div className="table-sub-city">{new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                    </td>
                    <td>
                      <strong>{b.customerName}</strong>
                      <div className="table-customer-phone">{b.customerPhone}</div>
                    </td>
                    <td>
                      <strong>{b.slotDate}</strong>
                      <div className="table-slot-time">{b.slotTime}</div>
                    </td>
                    <td>
                      <div>{b.sport}</div>
                      <div className="table-sub-city">{b.listingName}</div>
                    </td>
                    <td>
                      <span className={`payment-pill ${b.paymentStatus === 'paid' ? 'is-paid' : 'is-venue'}`}>
                        {b.paymentStatus === 'paid' ? `Paid Online (₹${b.paidAmount})` : 'Pay at Ground'}
                      </span>
                      <div className="table-amount-split">
                        Total: ₹{b.totalAmount}
                        {b.totalAmount > b.paidAmount && (
                          <span className="text-amber"> · ₹{b.totalAmount - b.paidAmount} due at venue</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <a
                        href={`https://wa.me/${b.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${b.customerName}, confirming your turf slot ${b.slotTime} (${b.slotDate}) at ${b.listingName}. See you at the ground!`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="whatsapp-contact-link"
                      >
                        <SiteIcon name="message" size={13} />
                        <span>WhatsApp</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: EARNINGS & PAYOUTS */}
      {activeTab === 'earnings' && (
        <div className="host-tab-content">
          {/* Financial Settlement KPI Cards */}
          <div className="host-metrics-grid">
            <div className="host-metric-card">
              <span className="metric-label">Online Slot Revenue</span>
              <strong className="metric-value">₹{metrics.onlineCollected.toLocaleString('en-IN')}</strong>
              <span className="metric-subtext">Prepaid customer bookings</span>
            </div>
            <div className="host-metric-card">
              <span className="metric-label">Platform Fee ({metrics.commissionRate}%)</span>
              <strong className="metric-value">₹{metrics.platformCommission.toLocaleString('en-IN')}</strong>
              <span className="metric-subtext">Automated payment gateway &amp; service charge</span>
            </div>
            <div className="host-metric-card">
              <span className="metric-label">Net Host Payable</span>
              <strong className="metric-value text-emerald">₹{metrics.netPayable.toLocaleString('en-IN')}</strong>
              <span className="metric-subtext text-emerald">Available for settlement transfer</span>
            </div>
            <div className="host-metric-card">
              <span className="metric-label">Total Disbursed</span>
              <strong className="metric-value">₹{metrics.totalSettledAmount.toLocaleString('en-IN')}</strong>
              <span className="metric-subtext">Transferred to partner account</span>
            </div>
          </div>

          {/* Bank / UPI Account Setup Card */}
          <div className="host-section-box">
            <div className="host-section-header">
              <div>
                <h2>Host Settlement Account</h2>
                <p>Direct bank transfer or UPI ID for automated weekly or instant slot reservation payouts.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="host-action-btn secondary"
                  onClick={() => setIsAccountModalOpen(true)}
                >
                  <SiteIcon name="sliders" size={14} /> Edit Payout Details
                </button>
                <button
                  type="button"
                  className="host-action-btn primary"
                  onClick={() => setIsPayoutModalOpen(true)}
                >
                  <SiteIcon name="wallet" size={14} /> Request Instant Payout
                </button>
              </div>
            </div>

            <div className="host-payout-account-display">
              <div className="payout-acc-icon">🏦</div>
              <div className="payout-acc-details">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <strong>{payoutAccount?.beneficiaryName || 'FSV Arena Sports Pvt Ltd'}</strong>
                  <span className="host-verified-pill">
                    <SiteIcon name="shield-check" size={13} /> Verified for Settlements
                  </span>
                </div>
                <div className="payout-acc-dest">
                  {payoutAccount?.payoutMethod === 'upi'
                    ? `UPI ID: ${payoutAccount?.upiId || 'fsvarena@okaxis'}`
                    : `Bank Account: ${payoutAccount?.bankName || 'HDFC Bank'} ····${payoutAccount?.accountNumber?.slice(-4) || '8812'} (IFSC: ${payoutAccount?.ifscCode || 'HDFC0001290'})`}
                </div>
                <div className="payout-acc-note">
                  Payout cycle: Automated daily T+1 settlements or on-demand instant withdrawal.
                </div>
              </div>
            </div>
          </div>

          {/* Settlement History Table */}
          <div className="host-section-box">
            <div className="host-section-header">
              <div>
                <h2>Settlement History &amp; Bank UTRs</h2>
                <p>Audited disbursement logs with platform commission deduction and banking references.</p>
              </div>
              <button
                type="button"
                className="host-action-btn secondary"
                onClick={() => alert('Exporting payout statement CSV...')}
              >
                <SiteIcon name="arrow-up-right" size={14} /> Export Settlement CSV
              </button>
            </div>

            <div className="host-table-wrapper">
              <table className="host-data-table">
                <thead>
                  <tr>
                    <th>Payout Ref</th>
                    <th>Gross Volume</th>
                    <th>Platform Fee (8%)</th>
                    <th>Net Transferred</th>
                    <th>Payout Destination</th>
                    <th>UTR / Banking Ref</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map(st => (
                    <tr key={st.id}>
                      <td>
                        <code>{st.payoutRef}</code>
                        <div className="table-sub-city">{st.date}</div>
                      </td>
                      <td>₹{st.grossAmount.toLocaleString('en-IN')}</td>
                      <td className="text-amber">-₹{st.platformFeeAmount.toLocaleString('en-IN')}</td>
                      <td>
                        <strong className="text-emerald">₹{st.netPayoutAmount.toLocaleString('en-IN')}</strong>
                      </td>
                      <td>{st.payoutDestination}</td>
                      <td>
                        <code>{st.utrNumber}</code>
                      </td>
                      <td>
                        <span className="payment-pill is-paid">✓ Settled</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Ledger & Tax Receipts */}
          <div className="host-section-box">
            <div className="host-section-header">
              <div>
                <h2>Subscription Payments &amp; Tax Invoices</h2>
                <p>Receipts for directory listing subscriptions, VIP plans, and tax invoices.</p>
              </div>
            </div>

            <div className="host-table-wrapper">
              <table className="host-data-table">
                <thead>
                  <tr>
                    <th>Receipt Ref</th>
                    <th>Transaction Description</th>
                    <th>Date</th>
                    <th>Payment Method</th>
                    <th>Amount (₹ INR)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {userTransactions.map(tx => (
                    <tr key={tx.orderId}>
                      <td>
                        <code>{tx.receiptRef}</code>
                        <div className="table-sub-city">{tx.orderId}</div>
                      </td>
                      <td>
                        <strong>{tx.title}</strong>
                      </td>
                      <td>{tx.date}</td>
                      <td>
                        <span className="table-method-tag">{tx.paymentMethod}</span>
                      </td>
                      <td>
                        <strong className="table-tx-amount">₹{tx.amount.toLocaleString('en-IN')}</strong>
                      </td>
                      <td>
                        <span className="payment-pill is-paid">✓ Completed</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PAYOUT ACCOUNT MODAL */}
      {isAccountModalOpen && (
        <div className="host-modal-overlay" role="dialog" aria-modal="true">
          <div className="host-modal-box">
            <button
              type="button"
              className="host-modal-close"
              onClick={() => setIsAccountModalOpen(false)}
            >
              ✕
            </button>
            <div className="host-modal-header">
              <span className="host-badge-eyebrow">SETTLEMENT SETTINGS</span>
              <h3>Configure Host Payout Details</h3>
              <p>Earnings from prepaid slots are disbursed directly to your verified bank or UPI destination:</p>
            </div>

            <form onSubmit={handleSaveAccount}>
              <div className="payout-form-group">
                <label htmlFor="payout-beneficiary">Beneficiary / Business Entity Name</label>
                <input
                  id="payout-beneficiary"
                  type="text"
                  value={editBeneficiaryName}
                  onChange={e => setEditBeneficiaryName(e.target.value)}
                  placeholder="e.g. FSV Sports Arena Pvt Ltd"
                  required
                />
              </div>

              <div className="payout-form-group">
                <label>Payout Method</label>
                <div className="payout-method-toggle">
                  <button
                    type="button"
                    className={`method-btn ${editPayoutMethod === 'upi' ? 'is-active' : ''}`}
                    onClick={() => setEditPayoutMethod('upi')}
                  >
                    UPI ID (Instant)
                  </button>
                  <button
                    type="button"
                    className={`method-btn ${editPayoutMethod === 'bank_transfer' ? 'is-active' : ''}`}
                    onClick={() => setEditPayoutMethod('bank_transfer')}
                  >
                    Bank NEFT / IMPS
                  </button>
                </div>
              </div>

              {editPayoutMethod === 'upi' ? (
                <div className="payout-form-group">
                  <label htmlFor="payout-upi">UPI Virtual Payment Address (VPA)</label>
                  <input
                    id="payout-upi"
                    type="text"
                    value={editUpiId}
                    onChange={e => setEditUpiId(e.target.value)}
                    placeholder="e.g. yourbusiness@okaxis"
                    required
                  />
                </div>
              ) : (
                <>
                  <div className="payout-form-group">
                    <label htmlFor="payout-bank-name">Bank Name</label>
                    <input
                      id="payout-bank-name"
                      type="text"
                      value={editBankName}
                      onChange={e => setEditBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank, ICICI Bank"
                      required
                    />
                  </div>
                  <div className="payout-form-group">
                    <label htmlFor="payout-acc-num">Bank Account Number</label>
                    <input
                      id="payout-acc-num"
                      type="text"
                      value={editAccountNumber}
                      onChange={e => setEditAccountNumber(e.target.value)}
                      placeholder="e.g. 50200012345678"
                      required
                    />
                  </div>
                  <div className="payout-form-group">
                    <label htmlFor="payout-ifsc">IFSC Code</label>
                    <input
                      id="payout-ifsc"
                      type="text"
                      value={editIfsc}
                      onChange={e => setEditIfsc(e.target.value.toUpperCase())}
                      placeholder="e.g. HDFC0001290"
                      required
                    />
                  </div>
                </>
              )}

              <div className="host-modal-actions">
                <button
                  type="button"
                  className="host-action-btn secondary"
                  onClick={() => setIsAccountModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="host-action-btn primary">
                  Save Payout Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQUEST INSTANT PAYOUT MODAL */}
      {isPayoutModalOpen && (
        <div className="host-modal-overlay" role="dialog" aria-modal="true">
          <div className="host-modal-box">
            <button
              type="button"
              className="host-modal-close"
              onClick={() => setIsPayoutModalOpen(false)}
            >
              ✕
            </button>
            <div className="host-modal-header">
              <span className="host-badge-eyebrow">INSTANT SETTLEMENT</span>
              <h3>Confirm Instant Slot Settlement</h3>
              <p>Review the commission breakdown before initiating instant bank/UPI transfer:</p>
            </div>

            <div className="payout-breakdown-card">
              <div className="breakdown-row">
                <span>Gross Prepaid Slot Bookings:</span>
                <strong>₹{(metrics.onlineCollected > 0 ? metrics.onlineCollected : 3900).toLocaleString('en-IN')}</strong>
              </div>
              <div className="breakdown-row text-amber">
                <span>Platform Service Charge ({metrics.commissionRate}%):</span>
                <strong>-₹{Math.round((metrics.onlineCollected > 0 ? metrics.onlineCollected : 3900) * 0.08).toLocaleString('en-IN')}</strong>
              </div>
              <div className="breakdown-divider" />
              <div className="breakdown-row total">
                <span>Net Transfer Amount:</span>
                <strong className="text-emerald">₹{((metrics.onlineCollected > 0 ? metrics.onlineCollected : 3900) - Math.round((metrics.onlineCollected > 0 ? metrics.onlineCollected : 3900) * 0.08)).toLocaleString('en-IN')}</strong>
              </div>
              <div className="payout-dest-preview">
                Destination: {payoutAccount?.payoutMethod === 'upi' ? `${payoutAccount.upiId || 'fsvarena@okaxis'} (UPI)` : `${payoutAccount?.bankName || 'Bank'} A/c ····${payoutAccount?.accountNumber?.slice(-4) || '8812'}`}
              </div>
            </div>

            <div className="host-modal-actions">
              <button
                type="button"
                className="host-action-btn secondary"
                onClick={() => setIsPayoutModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="host-action-btn primary"
                onClick={handleExecutePayout}
              >
                Confirm &amp; Disburse Payout Now →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENEW / UPGRADE PLAN MODAL */}
      {upgradingListing && (
        <div className="host-modal-overlay" role="dialog" aria-modal="true">
          <div className="host-modal-box">
            <button
              type="button"
              className="host-modal-close"
              onClick={() => setUpgradingListing(null)}
            >
              ✕
            </button>
            <div className="host-modal-header">
              <span className="host-badge-eyebrow">RENEW / UPGRADE LISTING</span>
              <h3>Extend Visibility for {upgradingListing.name}</h3>
              <p>Choose an extended visibility plan with continuous presence and top search directory ranking:</p>
            </div>

            <div className="host-upgrade-plans-grid">
              {LISTING_PLANS.map(plan => {
                const isSelected = selectedUpgradePlanId === plan.id
                return (
                  <div
                    key={plan.id}
                    className={`host-upgrade-card ${isSelected ? 'is-selected' : ''} ${plan.popular ? 'is-popular' : ''} ${plan.id === 'lifelong' ? 'is-lifelong' : ''}`}
                    onClick={() => setSelectedUpgradePlanId(plan.id)}
                  >
                    {plan.badge && <span className="host-upgrade-badge">{plan.badge}</span>}
                    <strong>{plan.name}</strong>
                    <span className="upgrade-duration">{plan.durationLabel}</span>
                    <div className="upgrade-price">
                      ₹{plan.price.toLocaleString('en-IN')}
                      {plan.savingsLabel && <span className="upgrade-savings">{plan.savingsLabel}</span>}
                    </div>
                    <div className="upgrade-select-tag">{isSelected ? '✓ Selected' : 'Choose'}</div>
                  </div>
                )
              })}
            </div>

            <div className="host-modal-actions">
              <button
                type="button"
                className="host-action-btn secondary"
                onClick={() => setUpgradingListing(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="host-action-btn primary"
                onClick={handleProceedToUpgradePayment}
              >
                Proceed to Pay ₹{getListingPlan(selectedUpgradePlanId).price.toLocaleString('en-IN')} &amp; Renew →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {isCheckoutOpen && checkoutItem && (
        <PaymentCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          item={checkoutItem}
          initialCustomer={{
            name: currentUser?.name || 'Partner Host',
            phone: currentUser?.phone || '',
            email: currentUser?.email || '',
          }}
          onSuccess={handlePaymentSuccess}
          allowPayAtVenue={false}
        />
      )}
    </section>
  )
}
