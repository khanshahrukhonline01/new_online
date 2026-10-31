import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TopSportsComplexes } from './TopSportsComplexes'

describe('TopSportsComplexes component for SEO & Thin-Content mitigation', () => {
  it('renders all 16 metropolitan sports complexes with rich indexable content, Schema.org ItemList, and crawl links', () => {
    const html = renderToStaticMarkup(<TopSportsComplexes />)

    // Heading, Badge & Contextual subtitle
    expect(html).toContain('Top Sports Complexes in Cities')
    expect(html).toContain('16 Metro Sports Hubs')
    expect(html).toContain('Explore major stadiums, sports centres and training hubs across India')
    expect(html).toContain('Explore all 50+ cities across India')
    expect(html).toContain('/cities')

    // Schema.org Structured Data
    expect(html).toContain('application/ld+json')
    expect(html).toContain('https://schema.org')
    expect(html).toContain('"@type":"ItemList"')

    // City 1: Delhi
    expect(html).toContain('Delhi')
    expect(html).toContain('Delhi NCR')
    expect(html).toContain('Jawaharlal Nehru Stadium')
    expect(html).toContain('Thyagaraj Stadium')
    expect(html).toContain('SAI Karni Singh Shooting Range')
    expect(html).toContain('/city/delhi')

    // City 2: Mumbai
    expect(html).toContain('Mumbai')
    expect(html).toContain('Maharashtra')
    expect(html).toContain('Wankhede Stadium')
    expect(html).toContain('MCA-BKC Ground')
    expect(html).toContain('Cooperage Football Ground')
    expect(html).toContain('/city/mumbai')

    // City 3: Bengaluru
    expect(html).toContain('Bengaluru')
    expect(html).toContain('Karnataka')
    expect(html).toContain('Sree Kanteerava Stadium')
    expect(html).toContain('M. Chinnaswamy Stadium')
    expect(html).toContain('Kanteerava Aquatic Centre')
    expect(html).toContain('/city/bengaluru')

    // City 4: Hyderabad
    expect(html).toContain('Hyderabad')
    expect(html).toContain('Telangana')
    expect(html).toContain('Gachibowli Stadium')
    expect(html).toContain('GMC Balayogi Stadium')
    expect(html).toContain('Rajiv Gandhi International Cricket Stadium')
    expect(html).toContain('/city/hyderabad')

    // City 5: Pune
    expect(html).toContain('Pune')
    expect(html).toContain('Shree Shiv Chhatrapati Sports Complex')
    expect(html).toContain('MCA Stadium, Gahunje')
    expect(html).toContain('Deccan Gymkhana')
    expect(html).toContain('/city/pune')

    // City 6: Kolkata
    expect(html).toContain('Kolkata')
    expect(html).toContain('West Bengal')
    expect(html).toContain('Salt Lake Stadium')
    expect(html).toContain('Eden Gardens')
    expect(html).toContain('Mohun Bagan Ground')
    expect(html).toContain('/city/kolkata')

    // City 7: Chennai
    expect(html).toContain('Chennai')
    expect(html).toContain('Tamil Nadu')
    expect(html).toContain('M. A. Chidambaram Stadium')
    expect(html).toContain('SDAT Tennis Stadium')
    expect(html).toContain('/city/chennai')

    // City 8: Ahmedabad
    expect(html).toContain('Ahmedabad')
    expect(html).toContain('Gujarat')
    expect(html).toContain('Narendra Modi Stadium')
    expect(html).toContain('The Arena by TransStadia')
    expect(html).toContain('/city/ahmedabad')

    // City 9: Chandigarh
    expect(html).toContain('Chandigarh')
    expect(html).toContain('Punjab &amp; Haryana')
    expect(html).toContain('PCA Stadium Mohali')
    expect(html).toContain('/city/chandigarh')

    // City 10: Bhubaneswar
    expect(html).toContain('Bhubaneswar')
    expect(html).toContain('Odisha')
    expect(html).toContain('Kalinga Stadium')
    expect(html).toContain('Kalinga Hockey Stadium')
    expect(html).toContain('Biju Patnaik Swimming Pool')
    expect(html).toContain('/city/bhubaneswar')

    // City 11: Lucknow
    expect(html).toContain('Lucknow')
    expect(html).toContain('Uttar Pradesh')
    expect(html).toContain('BRSABV Ekana Cricket Stadium')
    expect(html).toContain('/city/lucknow')

    // City 12: Jaipur
    expect(html).toContain('Jaipur')
    expect(html).toContain('Rajasthan')
    expect(html).toContain('Sawai Mansingh Stadium')
    expect(html).toContain('/city/jaipur')

    // City 13: Bhopal
    expect(html).toContain('Bhopal')
    expect(html).toContain('Madhya Pradesh')
    expect(html).toContain('TT Nagar Stadium')
    expect(html).toContain('/city/bhopal')

    // City 14: Kochi
    expect(html).toContain('Kochi')
    expect(html).toContain('Kerala')
    expect(html).toContain('Jawaharlal Nehru International Stadium')
    expect(html).toContain('/city/kochi')

    // City 15: Ranchi
    expect(html).toContain('Ranchi')
    expect(html).toContain('Jharkhand')
    expect(html).toContain('JSCA International Stadium Complex')
    expect(html).toContain('/city/ranchi')

    // City 16: Dehradun
    expect(html).toContain('Dehradun')
    expect(html).toContain('Uttarakhand')
    expect(html).toContain('Maharana Pratap Sports College')
    expect(html).toContain('/city/dehradun')

    // AdSense anti-thin-content contextual copy & legal disclaimer
    expect(html).toContain('National Sports Infrastructure &amp; Venue Directory:')
    expect(html).toContain('Venue names are discovery starting points, not a confirmation of current availability')
  })
})
