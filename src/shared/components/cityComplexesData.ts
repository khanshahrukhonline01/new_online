export interface CitySportsComplex {
  city: string
  state: string
  slug: string
  href: string
  complexes: string[]
}

export const TOP_CITY_SPORTS_COMPLEXES: CitySportsComplex[] = [
  {
    city: 'Delhi',
    state: 'Delhi NCR',
    slug: 'delhi',
    href: '/city/delhi',
    complexes: [
      'Jawaharlal Nehru Stadium',
      'Thyagaraj Stadium',
      'SAI Karni Singh Shooting Range',
    ],
  },
  {
    city: 'Mumbai',
    state: 'Maharashtra',
    slug: 'mumbai',
    href: '/city/mumbai',
    complexes: [
      'Wankhede Stadium',
      'MCA-BKC Ground',
      'Cooperage Football Ground',
    ],
  },
  {
    city: 'Bengaluru',
    state: 'Karnataka',
    slug: 'bengaluru',
    href: '/city/bengaluru',
    complexes: [
      'Sree Kanteerava Stadium',
      'M. Chinnaswamy Stadium',
      'Kanteerava Aquatic Centre',
    ],
  },
  {
    city: 'Hyderabad',
    state: 'Telangana',
    slug: 'hyderabad',
    href: '/city/hyderabad',
    complexes: [
      'Gachibowli Stadium',
      'GMC Balayogi Stadium',
      'Rajiv Gandhi International Cricket Stadium',
    ],
  },
  {
    city: 'Pune',
    state: 'Maharashtra',
    slug: 'pune',
    href: '/city/pune',
    complexes: [
      'Shree Shiv Chhatrapati Sports Complex',
      'MCA Stadium, Gahunje',
      'Deccan Gymkhana',
    ],
  },
  {
    city: 'Kolkata',
    state: 'West Bengal',
    slug: 'kolkata',
    href: '/city/kolkata',
    complexes: [
      'Salt Lake Stadium',
      'Eden Gardens',
      'Mohun Bagan Ground',
    ],
  },
  {
    city: 'Chennai',
    state: 'Tamil Nadu',
    slug: 'chennai',
    href: '/city/chennai',
    complexes: [
      'Jawaharlal Nehru Stadium',
      'M. A. Chidambaram Stadium',
      'SDAT Tennis Stadium',
    ],
  },
  {
    city: 'Ahmedabad',
    state: 'Gujarat',
    slug: 'ahmedabad',
    href: '/city/ahmedabad',
    complexes: [
      'Narendra Modi Stadium',
      'The Arena by TransStadia',
      'Eka Club Sports Arena',
    ],
  },
  {
    city: 'Chandigarh',
    state: 'Punjab & Haryana',
    slug: 'chandigarh',
    href: '/city/chandigarh',
    complexes: [
      'PCA Stadium Mohali',
      'Sector 16 Cricket Stadium',
      'Sector 42 Hockey Stadium',
    ],
  },
  {
    city: 'Bhubaneswar',
    state: 'Odisha',
    slug: 'bhubaneswar',
    href: '/city/bhubaneswar',
    complexes: [
      'Kalinga Stadium',
      'Kalinga Hockey Stadium',
      'Biju Patnaik Swimming Pool',
    ],
  },
  {
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    slug: 'lucknow',
    href: '/city/lucknow',
    complexes: [
      'BRSABV Ekana Cricket Stadium',
      'KD Singh Babu Stadium',
      'BBD Badminton Academy',
    ],
  },
  {
    city: 'Jaipur',
    state: 'Rajasthan',
    slug: 'jaipur',
    href: '/city/jaipur',
    complexes: [
      'Sawai Mansingh Stadium',
      'SMS Indoor Sports Arena',
      'Rajasthan Cricket Academy Ground',
    ],
  },
  {
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    slug: 'bhopal',
    href: '/city/bhopal',
    complexes: [
      'TT Nagar Stadium',
      'Major Dhyan Chand Hockey Stadium',
      'SAI Regional Centre Goregaon',
    ],
  },
  {
    city: 'Kochi',
    state: 'Kerala',
    slug: 'kochi',
    href: '/city/kochi',
    complexes: [
      'Jawaharlal Nehru International Stadium',
      'Regional Sports Centre (Kadhavanthra)',
      'Maharajas College Ground',
    ],
  },
  {
    city: 'Ranchi',
    state: 'Jharkhand',
    slug: 'ranchi',
    href: '/city/ranchi',
    complexes: [
      'Birsa Munda Athletics Stadium',
      'JSCA International Stadium Complex',
      'Mega Sports Complex Hotwar',
    ],
  },
  {
    city: 'Dehradun',
    state: 'Uttarakhand',
    slug: 'dehradun',
    href: '/city/dehradun',
    complexes: [
      'Rajiv Gandhi International Cricket Stadium',
      'Pavilion Ground',
      'Maharana Pratap Sports College',
    ],
  },
]

export const REGIONAL_CITY_SPORTS_COMPLEXES: CitySportsComplex[] = [
  {
    city: 'Kanpur',
    state: 'Uttar Pradesh',
    slug: 'kanpur',
    href: '/city/kanpur',
    complexes: [
      'Green Park International Cricket Stadium',
      'Palika Stadium & Sports Complex',
      'Kanpur South Ground (Kidwai Nagar)',
    ],
  },
  {
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    slug: 'varanasi',
    href: '/city/varanasi',
    complexes: [
      'Dr. Sampurnanand Sports Stadium (Sigra)',
      'Varanasi International Cricket Stadium',
      'Banaras Hindu University (BHU) Sports Ground',
    ],
  },
  {
    city: 'Meerut',
    state: 'Uttar Pradesh',
    slug: 'meerut',
    href: '/city/meerut',
    complexes: [
      'Kailash Prakash Sports Stadium',
      'Victoria Park Cricket Ground',
      'Bhangel Sports Complex',
    ],
  },
  {
    city: 'Jalandhar',
    state: 'Punjab',
    slug: 'jalandhar',
    href: '/city/jalandhar',
    complexes: [
      'Burlton Park Sports Stadium',
      'Surjit Hockey Stadium',
      'Olympian Surjit Bhullar Arena',
    ],
  },
  {
    city: 'Indore',
    state: 'Madhya Pradesh',
    slug: 'indore',
    href: '/city/indore',
    complexes: [
      'Holkar Cricket Stadium',
      'Nehru Stadium',
      'Abhay Prashal Indoor Stadium',
    ],
  },
]

export const ALL_ACTIVE_CITY_HUBS: CitySportsComplex[] = [
  ...TOP_CITY_SPORTS_COMPLEXES,
  ...REGIONAL_CITY_SPORTS_COMPLEXES,
]

