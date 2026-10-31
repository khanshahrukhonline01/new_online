/**
 * Comprehensive SEO & Structured Data Utility for KhelGrid.
 * Injects document titles, canonical URLs, OpenGraph/Twitter card meta tags,
 * and Schema.org JSON-LD structured data to maximize organic ranking
 * and eliminate Google's thin-content quality penalty.
 */

export interface PageSeoConfig {
  title: string
  description: string
  canonicalUrl: string
  ogType?: 'website' | 'article' | 'profile' | 'place'
  image?: string
  keywords?: string[]
  jsonLd?: Record<string, unknown>
}

export function updatePageSeoMetadata(config: PageSeoConfig): () => void {
  if (typeof document === 'undefined') return () => {}

  const previousTitle = document.title
  document.title = config.title

  function setMetaTag(attrName: 'name' | 'property', attrValue: string, content: string) {
    let element = document.querySelector<HTMLMetaElement>(`meta[${attrName}="${attrValue}"]`)
    if (!element) {
      element = document.createElement('meta')
      element.setAttribute(attrName, attrValue)
      document.head.appendChild(element)
    }
    element.content = content
  }

  function setLinkTag(rel: string, href: string) {
    let element = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
    if (!element) {
      element = document.createElement('link')
      element.rel = rel
      document.head.appendChild(element)
    }
    element.href = href
  }

  setMetaTag('name', 'description', config.description)
  if (config.keywords && config.keywords.length > 0) {
    setMetaTag('name', 'keywords', config.keywords.join(', '))
  }

  setLinkTag('canonical', config.canonicalUrl)

  // Open Graph
  setMetaTag('property', 'og:title', config.title)
  setMetaTag('property', 'og:description', config.description)
  setMetaTag('property', 'og:url', config.canonicalUrl)
  setMetaTag('property', 'og:type', config.ogType || 'website')
  setMetaTag('property', 'og:site_name', 'KhelGrid')
  if (config.image) {
    setMetaTag('property', 'og:image', config.image)
  }

  // Twitter Cards
  setMetaTag('name', 'twitter:card', 'summary_large_image')
  setMetaTag('name', 'twitter:title', config.title)
  setMetaTag('name', 'twitter:description', config.description)
  if (config.image) {
    setMetaTag('name', 'twitter:image', config.image)
  }

  // Schema.org JSON-LD
  let scriptElement = document.getElementById('khelgrid-jsonld') as HTMLScriptElement | null
  if (config.jsonLd) {
    if (!scriptElement) {
      scriptElement = document.createElement('script')
      scriptElement.id = 'khelgrid-jsonld'
      scriptElement.type = 'application/ld+json'
      document.head.appendChild(scriptElement)
    }
    scriptElement.textContent = JSON.stringify(config.jsonLd)
  } else if (scriptElement) {
    scriptElement.remove()
  }

  // Cleanup on unmount
  return () => {
    document.title = previousTitle
  }
}
