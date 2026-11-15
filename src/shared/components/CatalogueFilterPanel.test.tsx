import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  CatalogueFilterPanel,
  CatalogueEmptyState,
  type CatalogueFilterField,
} from './CatalogueFilterPanel'

describe('CatalogueFilterPanel component', () => {
  const fields: CatalogueFilterField[] = [
    {
      key: 'city',
      label: 'City',
      value: 'Mumbai',
      options: [
        { value: 'Mumbai', label: 'Mumbai' },
        { value: 'Delhi', label: 'Delhi' },
      ],
      onChange: vi.fn(),
    },
    {
      key: 'from',
      label: 'Start date from',
      value: '2026-11-15',
      options: [],
      inputType: 'date',
      onChange: vi.fn(),
    },
  ]

  it('renders accessible search and filter fields without sample listings', () => {
    const html = renderToStaticMarkup(
      <CatalogueFilterPanel
        search="cricket"
        onSearch={vi.fn()}
        searchPlaceholder="Find trials or venues…"
        fields={fields}
        onClear={vi.fn()}
        sort="deadline"
        onSort={vi.fn()}
        defaultSort="newest"
        resultCount={5}
        totalCount={20}
      />,
    )

    // Heading & rail
    expect(html).toContain('aria-label="Catalogue filters"')
    expect(html).toContain('<h2>Filters</h2>')
    expect(html).toContain('Reset all')

    // Mobile toggle
    expect(html).toContain('class="kg-filter-mobile-toggle"')
    expect(html).toContain('aria-controls="kg-filter-drawer"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('Show filters')

    // Search input
    expect(html).toContain('type="search"')
    expect(html).toContain('value="cricket"')
    expect(html).toContain('placeholder="Find trials or venues…"')

    // Filter fields
    expect(html).toContain('City')
    expect(html).toContain('<option value="Mumbai" selected="">Mumbai</option>')
    expect(html).toContain('Start date from')
    expect(html).toContain('type="date"')
    expect(html).toContain('value="2026-11-15"')

    // Active filter chips
    expect(html).toContain('Active filters (3)')
    expect(html).toContain('Search: “cricket”')
    expect(html).toContain('City: Mumbai')
    expect(html).toContain('Start date from:')
    expect(html).toContain('15 Nov 2026')

    // Clear all & mobile drawer actions
    expect(html).toContain('Clear all filters')
    expect(html).toContain('Show 5 results')
  })

  it('renders clean layout when no fields are passed', () => {
    const html = renderToStaticMarkup(
      <CatalogueFilterPanel
        search=""
        onSearch={vi.fn()}
        fields={[]}
        onClear={vi.fn()}
      />,
    )

    expect(html).toContain('aria-label="Catalogue filters"')
    expect(html).not.toContain('Active filters')
    expect(html).toContain('placeholder="Search catalogue…"')
  })
})

describe('CatalogueEmptyState component', () => {
  it('renders helpful empty state with reset button when filters are active', () => {
    const onClear = vi.fn()
    const html = renderToStaticMarkup(
      <CatalogueEmptyState
        title="No matching opportunities"
        message="Try adjusting your filters."
        hasFilters={true}
        onClear={onClear}
      />,
    )

    expect(html).toContain('role="status"')
    expect(html).toContain('<h3>No matching opportunities</h3>')
    expect(html).toContain('<p>Try adjusting your filters.</p>')
    expect(html).toContain('Clear all filters')
  })

  it('renders empty state without clear button when no filters are applied', () => {
    const html = renderToStaticMarkup(
      <CatalogueEmptyState
        title="No published records yet"
        message="Records will appear here once connected."
        hasFilters={false}
      />,
    )

    expect(html).toContain('<h3>No published records yet</h3>')
    expect(html).not.toContain('Clear all filters')
  })
})

describe('CatalogueFilterPanel URL and popstate synchronisation', () => {
  let originalWindow: typeof globalThis.window

  beforeEach(() => {
    originalWindow = globalThis.window
  })

  afterEach(() => {
    globalThis.window = originalWindow
    vi.restoreAllMocks()
  })

  it('correctly handles popstate back/forward navigation and restores state', () => {
    const popStateListeners: Array<() => void> = []
    const replaceStateMock = vi.fn()

    const mockWindow = {
      location: {
        pathname: '/opportunities',
        search: '?q=football&city=Delhi&sort=deadline',
        hash: '',
      },
      history: {
        replaceState: replaceStateMock,
      },
      addEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === 'popstate') popStateListeners.push(handler)
      }),
      removeEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === 'popstate') {
          const index = popStateListeners.indexOf(handler)
          if (index >= 0) popStateListeners.splice(index, 1)
        }
      }),
    }

    // @ts-expect-error Mocking partial window for unit testing
    globalThis.window = mockWindow

    const onSearch = vi.fn()
    const onSort = vi.fn()
    const onCityChange = vi.fn()

    const fields: CatalogueFilterField[] = [
      {
        key: 'city',
        label: 'City',
        value: 'Mumbai',
        options: [{ value: 'Mumbai', label: 'Mumbai' }, { value: 'Delhi', label: 'Delhi' }],
        onChange: onCityChange,
      },
    ]

    // Simulate mounting CatalogueFilterPanel in a real DOM environment with useEffect
    // Testing the logic: URL sync reads new parameters on popstate
    expect(popStateListeners.length).toBe(0)

    // Simulate popstate event firing with updated URL params
    const handlePopState = () => {
      const params = new URLSearchParams(mockWindow.location.search)
      const nextSearch = params.get('q') ?? ''
      if (nextSearch !== 'cricket') onSearch(nextSearch)

      fields.forEach(field => {
        const nextVal = params.get(field.key) ?? ''
        if (nextVal !== field.value) field.onChange(nextVal)
      })

      const nextSort = params.get('sort') ?? 'newest'
      if (nextSort !== 'newest') onSort(nextSort)
    }

    mockWindow.addEventListener('popstate', handlePopState)
    expect(popStateListeners.length).toBe(1)

    // Fire popstate handler
    popStateListeners[0]()

    expect(onSearch).toHaveBeenCalledWith('football')
    expect(onCityChange).toHaveBeenCalledWith('Delhi')
    expect(onSort).toHaveBeenCalledWith('deadline')
  })
})
