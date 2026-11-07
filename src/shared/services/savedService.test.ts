import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  getSavedItems,
  getSavedIds,
  isItemSaved,
  saveItem,
  removeSavedItem,
  toggleSaveItem,
  clearAllSavedItems,
  subscribeSavedItems,
  createOpportunitySavedItem,
  createVenueSavedItem,
  createAcademySavedItem,
  createCoachSavedItem,
  createPickupGameSavedItem,
} from './savedService'
import type { Opportunity, Venue, Academy } from '../domain'
import type { SavedItem } from '../../modules/saved/savedData'

describe('savedService & universal dynamic bookmarking', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear()
    }
  })

  it('retrieves default baseline items when storage is empty', () => {
    const items = getSavedItems()
    expect(items.length).toBeGreaterThanOrEqual(5)
    expect(isItemSaved(items[0].id)).toBe(true)
  })

  it('saves an item and persists to localStorage', () => {
    const testItem: SavedItem = {
      id: 'custom-trial-99',
      title: 'State Championship U-19 Trials',
      category: 'trial',
      categoryLabel: 'Selection Trial',
      sport: 'Basketball',
      city: 'Chandigarh',
      href: '/opportunities',
      savedAt: new Date().toISOString(),
    }

    expect(isItemSaved('custom-trial-99')).toBe(false)
    saveItem(testItem)
    expect(isItemSaved('custom-trial-99')).toBe(true)

    const updated = getSavedItems()
    expect(updated[0].id).toBe('custom-trial-99')
  })

  it('toggles save state (saves when absent, removes when present)', () => {
    const testItem: SavedItem = {
      id: 'toggle-item-1',
      title: 'Dynamic Turf Slot',
      category: 'venue',
      categoryLabel: 'Sports Venue',
      sport: 'Football',
      city: 'Kolkata',
      href: '/venues/salt-lake',
      savedAt: new Date().toISOString(),
    }

    const firstToggle = toggleSaveItem(testItem)
    expect(firstToggle).toBe(true)
    expect(isItemSaved('toggle-item-1')).toBe(true)

    const secondToggle = toggleSaveItem(testItem)
    expect(secondToggle).toBe(false)
    expect(isItemSaved('toggle-item-1')).toBe(false)
  })

  it('removes a saved item by id', () => {
    const items = getSavedItems()
    const targetId = items[0].id

    removeSavedItem(targetId)
    expect(isItemSaved(targetId)).toBe(false)
  })

  it('clears all saved items', () => {
    clearAllSavedItems()
    expect(getSavedItems().length).toBe(0)
    expect(getSavedIds().size).toBe(0)
  })

  it('notifies subscribers when saved items change', () => {
    const subscriber = vi.fn()
    const unsubscribe = subscribeSavedItems(subscriber)

    expect(subscriber).toHaveBeenCalled()

    const newItem: SavedItem = {
      id: 'sub-notify-item',
      title: 'Notify Test Item',
      category: 'trial',
      categoryLabel: 'Trial',
      sport: 'Tennis',
      city: 'Delhi',
      href: '/opportunities',
      savedAt: new Date().toISOString(),
    }

    saveItem(newItem)
    expect(subscriber).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'sub-notify-item' })]))

    unsubscribe()
  })

  describe('Factory helpers', () => {
    it('creates well-formed SavedItem from Opportunity', () => {
      const opp = {
        id: 'opp-delhi-athletics',
        slug: 'delhi-athletics-2026',
        title: 'Delhi State Athletics Championship 2026',
        sport: { id: 'ath', name: 'Athletics', slug: 'athletics' },
        city: 'Delhi',
        opportunity_type: 'trial',
        verification_status: 'verified',
        application_deadline: '2026-12-15T18:00:00Z',
        registration_fee: 250,
        organizer_name: 'Delhi Athletics Association',
      } as unknown as Opportunity

      const item = createOpportunitySavedItem(opp)
      expect(item.id).toBe('opp-delhi-athletics')
      expect(item.category).toBe('trial')
      expect(item.feeOrPrice).toBe('₹250')
      expect(item.badgeText).toBe('Verified Trial')
      expect(item.organizerOrAuthor).toBe('Delhi Athletics Association')
    })

    it('creates well-formed SavedItem from Venue', () => {
      const venue = {
        id: 'ven-turf-pune',
        slug: 'pune-football-arena',
        name: 'Pune Kickoff Football Arena',
        city: 'Pune',
        sport: 'Football',
        address: 'Kalyani Nagar, Pune',
        pricing: '₹1,000/hr',
        verification_status: 'verified',
        description: 'Premier football arena',
        timezone: 'Asia/Kolkata',
      } as unknown as Venue

      const item = createVenueSavedItem(venue)
      expect(item.id).toBe('ven-turf-pune')
      expect(item.category).toBe('venue')
      expect(item.href).toBe('/venues/pune-football-arena')
      expect(item.city).toBe('Pune')
    })

    it('creates well-formed SavedItem from Academy', () => {
      const academy = {
        id: 'acad-hyderabad-badminton',
        slug: 'hyderabad-shuttlers',
        name: 'Hyderabad Shuttlers Elite Academy',
        city: 'Hyderabad',
        sport: 'Badminton',
        verification_status: 'verified',
        admission_open: true,
        description: 'Elite training academy',
        state: 'Telangana',
        website_url: null,
        public_contact_url: null,
      } as unknown as Academy

      const item = createAcademySavedItem(academy)
      expect(item.id).toBe('acad-hyderabad-badminton')
      expect(item.category).toBe('academy')
      expect(item.dateOrDeadline).toBe('Admissions Open')
    })

    it('creates well-formed SavedItem from Coach', () => {
      const coach = {
        id: 'coach-patel-tennis',
        name: 'Coach Rajan Patel',
        sport: 'Tennis',
        city: 'Ahmedabad',
        certification: 'AITA Level 2 Coach',
        monthly_fee: '₹4,000 / month',
        rating: 4.9,
      }

      const item = createCoachSavedItem(coach)
      expect(item.id).toBe('coach-patel-tennis')
      expect(item.category).toBe('coach')
      expect(item.title).toBe('Coach Rajan Patel')
      expect(item.feeOrPrice).toBe('₹4,000 / month')
    })

    it('creates well-formed SavedItem from PickupGame', () => {
      const game = {
        id: 'game-chennai-cricket',
        sport: 'Cricket',
        venue_name: 'Marina Turf Ground',
        city: 'Chennai',
        spots_open: 4,
        price_per_player: '₹150/player',
        time_label: 'Sunday · 6:30 AM',
        host_name: 'Suresh K.',
      }

      const item = createPickupGameSavedItem(game)
      expect(item.id).toBe('game-chennai-cricket')
      expect(item.category).toBe('pickup')
      expect(item.badgeText).toBe('4 spots open')
      expect(item.organizerOrAuthor).toBe('Host: Suresh K.')
    })
  })
})
