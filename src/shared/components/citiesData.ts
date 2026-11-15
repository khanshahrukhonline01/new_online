export interface CityInfo {
  name: string
  state: string
  zone: 'North' | 'South' | 'East' | 'West' | 'Central' | 'North-East' | 'Islands'
  isMetro: boolean
  venues: string[]
  slug: string
}

export const ALL_INDIAN_CITIES: CityInfo[] = [
  {
    "name": "Delhi",
    "state": "Delhi NCR",
    "zone": "North",
    "isMetro": true,
    "venues": [
      "Jawaharlal Nehru Stadium",
      "Thyagaraj Stadium",
      "SAI Karni Singh Shooting Range"
    ],
    "slug": "delhi"
  },
  {
    "name": "Mumbai",
    "state": "Maharashtra",
    "zone": "West",
    "isMetro": true,
    "venues": [
      "Wankhede Stadium",
      "MCA-BKC Ground",
      "Cooperage Football Ground"
    ],
    "slug": "mumbai"
  },
  {
    "name": "Bengaluru",
    "state": "Karnataka",
    "zone": "South",
    "isMetro": true,
    "venues": [
      "Sree Kanteerava Stadium",
      "M. Chinnaswamy Stadium",
      "Kanteerava Aquatic Centre"
    ],
    "slug": "bengaluru"
  },
  {
    "name": "Hyderabad",
    "state": "Telangana",
    "zone": "South",
    "isMetro": true,
    "venues": [
      "Gachibowli Stadium",
      "GMC Balayogi Stadium",
      "Rajiv Gandhi Cricket Stadium"
    ],
    "slug": "hyderabad"
  },
  {
    "name": "Pune",
    "state": "Maharashtra",
    "zone": "West",
    "isMetro": true,
    "venues": [
      "Shree Shiv Chhatrapati Sports Complex",
      "MCA Stadium, Gahunje",
      "Deccan Gymkhana"
    ],
    "slug": "pune"
  },
  {
    "name": "Kolkata",
    "state": "West Bengal",
    "zone": "East",
    "isMetro": true,
    "venues": [
      "Salt Lake Stadium",
      "Eden Gardens",
      "Mohun Bagan Ground"
    ],
    "slug": "kolkata"
  },
  {
    "name": "Chennai",
    "state": "Tamil Nadu",
    "zone": "South",
    "isMetro": true,
    "venues": [
      "Jawaharlal Nehru Stadium",
      "M. A. Chidambaram Stadium",
      "SDAT Tennis Stadium"
    ],
    "slug": "chennai"
  },
  {
    "name": "Ahmedabad",
    "state": "Gujarat",
    "zone": "West",
    "isMetro": true,
    "venues": [
      "Narendra Modi Stadium",
      "The Arena by TransStadia",
      "Eka Club Sports Arena"
    ],
    "slug": "ahmedabad"
  },
  {
    "name": "Chandigarh",
    "state": "Punjab & Haryana",
    "zone": "North",
    "isMetro": true,
    "venues": [
      "PCA Stadium Mohali",
      "Sector 16 Cricket Stadium",
      "Sector 42 Hockey Stadium"
    ],
    "slug": "chandigarh"
  },
  {
    "name": "Bhubaneswar",
    "state": "Odisha",
    "zone": "East",
    "isMetro": true,
    "venues": [
      "Kalinga Stadium",
      "Kalinga Hockey Stadium",
      "Biju Patnaik Swimming Pool"
    ],
    "slug": "bhubaneswar"
  },
  {
    "name": "Lucknow",
    "state": "Uttar Pradesh",
    "zone": "North",
    "isMetro": true,
    "venues": [
      "BRSABV Ekana Cricket Stadium",
      "KD Singh Babu Stadium",
      "BBD Badminton Academy"
    ],
    "slug": "lucknow"
  },
  {
    "name": "Jaipur",
    "state": "Rajasthan",
    "zone": "North",
    "isMetro": true,
    "venues": [
      "Sawai Mansingh Stadium",
      "SMS Indoor Sports Arena",
      "Rajasthan Cricket Academy Ground"
    ],
    "slug": "jaipur"
  },
  {
    "name": "Bhopal",
    "state": "Madhya Pradesh",
    "zone": "Central",
    "isMetro": true,
    "venues": [
      "TT Nagar Stadium",
      "Major Dhyan Chand Hockey Stadium",
      "SAI Regional Centre Goregaon"
    ],
    "slug": "bhopal"
  },
  {
    "name": "Kochi",
    "state": "Kerala",
    "zone": "South",
    "isMetro": true,
    "venues": [
      "Jawaharlal Nehru International Stadium",
      "Regional Sports Centre",
      "Maharajas College Ground"
    ],
    "slug": "kochi"
  },
  {
    "name": "Ranchi",
    "state": "Jharkhand",
    "zone": "East",
    "isMetro": true,
    "venues": [
      "Birsa Munda Athletics Stadium",
      "JSCA International Stadium Complex",
      "Mega Sports Complex Hotwar"
    ],
    "slug": "ranchi"
  },
  {
    "name": "Dehradun",
    "state": "Uttarakhand",
    "zone": "North",
    "isMetro": true,
    "venues": [
      "Rajiv Gandhi International Cricket Stadium",
      "Pavilion Ground",
      "Maharana Pratap Sports College"
    ],
    "slug": "dehradun"
  },
  {
    "name": "Ajmer",
    "state": "Rajasthan",
    "zone": "North",
    "isMetro": false,
    "venues": [
      "Mayo College Sports Ground",
      "Patel Stadium"
    ],
    "slug": "ajmer"
  },
  {
    "name": "Ayodhya",
    "state": "Uttar Pradesh",
    "zone": "North",
    "isMetro": false,
    "venues": [
      "Dr. Bhim Rao Ambedkar International Sports Stadium"
    ],
    "slug": "ayodhya"
  },
  {
    "name": "Ballia",
    "state": "Uttar Pradesh",
    "zone": "North",
    "isMetro": false,
    "venues": [
      "Veer LORIK Sports Stadium"
    ],
    "slug": "ballia"
  },
  {
    "name": "Bareilly",
    "state": "Uttar Pradesh",
    "zone": "North",
    "isMetro": false,
    "venues": [
      "Major Dhyan Chand Sports Stadium Bareilly"
    ],
    "slug": "bareilly"
  },
  {
    "name": "Bikaner",
    "state": "Rajasthan",
    "zone": "North",
    "isMetro": false,
    "venues": [
      "Dr. Karni Singh Stadium Bikaner"
    ],
    "slug": "bikaner"
  },
  {
    "name": "Chhatarpur",
    "state": "Madhya Pradesh",
    "zone": "Central",
    "isMetro": false,
    "venues": [
      "Chhatarpur District Sports Stadium"
    ],
    "slug": "chhatarpur"
  },
  {
    "name": "Chhatrapati Sambhajinagar",
    "state": "Maharashtra",
    "zone": "West",
    "isMetro": false,
    "venues": [
      "SAI National Centre of Excellence Aurangabad",
      "Garware Stadium"
    ],
    "slug": "chhatrapati-sambhajinagar"
  },
  {
    "name": "Dewas",
    "state": "Madhya Pradesh",
    "zone": "Central",
    "isMetro": false,
    "venues": [
      "Kushabhau Thakre Stadium Dewas"
    ],
    "slug": "dewas"
  },
  {
    "name": "Dimapur",
    "state": "Nagaland",
    "zone": "North-East",
    "isMetro": false,
    "venues": [
      "Dimapur District Sports Complex (DDSC) Stadium"
    ],
    "slug": "dimapur"
  },
  {
    "name": "Gandhinagar",
    "state": "Gujarat",
    "zone": "West",
    "isMetro": false,
    "venues": [
      "SAI Western Training Centre Gandhinagar"
    ],
    "slug": "gandhinagar"
  },
  {
    "name": "Gorakhpur",
    "state": "Uttar Pradesh",
    "zone": "North",
    "isMetro": false,
    "venues": [
      "Regional Sports Stadium Gorakhpur"
    ],
    "slug": "gorakhpur"
  },
  {
    "name": "Guna",
    "state": "Madhya Pradesh",
    "zone": "Central",
    "isMetro": false,
    "venues": [
      "Sanjay Stadium Guna"
    ],
    "slug": "guna"
  },
  {
    "name": "Guwahati",
    "state": "Assam",
    "zone": "North-East",
    "isMetro": false,
    "venues": [
      "Indira Gandhi Athletic Stadium",
      "Barsapara Cricket Stadium",
      "Sarusajai Sports Complex"
    ],
    "slug": "guwahati"
  },
  {
    "name": "Gwalior",
    "state": "Madhya Pradesh",
    "zone": "Central",
    "isMetro": false,
    "venues": [
      "Captain Roop Singh Stadium",
      "LNIPE Sports Complex"
    ],
    "slug": "gwalior"
  },
  {
    "name": "Indore",
    "state": "Madhya Pradesh",
    "zone": "Central",
    "isMetro": false,
    "venues": [
      "Holkar Stadium",
      "Nehru Stadium Indore",
      "Abhay Prashal Indoor Stadium"
    ],
    "slug": "indore"
  },
  {
    "name": "Itanagar",
    "state": "Arunachal Pradesh",
    "zone": "North-East",
    "isMetro": false,
    "venues": [
      "Rajiv Gandhi Stadium",
      "Yupia Cricket Ground"
    ],
    "slug": "itanagar"
  },
  {
    "name": "Jammu",
    "state": "Jammu & Kashmir",
    "zone": "North",
    "isMetro": false,
    "venues": [
      "M.A. Stadium Jammu",
      "Green Play Field Gandhi Nagar"
    ],
    "slug": "jammu"
  },
  {
    "name": "Kanpur",
    "state": "Uttar Pradesh",
    "zone": "North",
    "isMetro": false,
    "venues": [
      "Green Park Stadium",
      "Palika Stadium"
    ],
    "slug": "kanpur"
  },
  {
    "name": "Kotagiri",
    "state": "Tamil Nadu",
    "zone": "South",
    "isMetro": false,
    "venues": [
      "Nilgiris District Sports Complex"
    ],
    "slug": "kotagiri"
  },
  {
    "name": "Ludhiana",
    "state": "Punjab",
    "zone": "North",
    "isMetro": false,
    "venues": [
      "Guru Nanak Stadium",
      "PAU Sports Complex"
    ],
    "slug": "ludhiana"
  },
  {
    "name": "Mandrem",
    "state": "Goa",
    "zone": "West",
    "isMetro": false,
    "venues": [
      "Goa State Shooting Range Mandrem",
      "Peddem Sports Complex"
    ],
    "slug": "mandrem"
  },
  {
    "name": "Mandsaur",
    "state": "Madhya Pradesh",
    "zone": "Central",
    "isMetro": false,
    "venues": [
      "Khel Parisar Mandsaur"
    ],
    "slug": "mandsaur"
  },
  {
    "name": "Mehalpur",
    "state": "Punjab",
    "zone": "North",
    "isMetro": false,
    "venues": [
      "Jarnail Singh Memorial Football Stadium Mahilpur"
    ],
    "slug": "mehalpur"
  },
  {
    "name": "Namchi",
    "state": "Sikkim",
    "zone": "North-East",
    "isMetro": false,
    "venues": [
      "Bhaichung Stadium Namchi"
    ],
    "slug": "namchi"
  },
  {
    "name": "Narshinghpur",
    "state": "Madhya Pradesh",
    "zone": "Central",
    "isMetro": false,
    "venues": [
      "Narshinghpur District Sports Ground"
    ],
    "slug": "narshinghpur"
  },
  {
    "name": "North and Middle Andaman",
    "state": "Andaman & Nicobar Islands",
    "zone": "Islands",
    "isMetro": false,
    "venues": [
      "Netaji Stadium Mayabunder",
      "GSSS Baratang Grounds"
    ],
    "slug": "north-and-middle-andaman"
  },
  {
    "name": "Raipur",
    "state": "Chhattisgarh",
    "zone": "Central",
    "isMetro": false,
    "venues": [
      "Shaheed Veer Narayan Singh Stadium",
      "Sardar Vallabhbhai Patel International Hockey Stadium"
    ],
    "slug": "raipur"
  },
  {
    "name": "Raisen",
    "state": "Madhya Pradesh",
    "zone": "Central",
    "isMetro": false,
    "venues": [
      "Raisen District Sports Complex"
    ],
    "slug": "raisen"
  },
  {
    "name": "Sagar",
    "state": "Madhya Pradesh",
    "zone": "Central",
    "isMetro": false,
    "venues": [
      "Pt. Ravishankar Shukla Stadium Sagar"
    ],
    "slug": "sagar"
  },
  {
    "name": "Satna",
    "state": "Madhya Pradesh",
    "zone": "Central",
    "isMetro": false,
    "venues": [
      "Satna District Sports Stadium"
    ],
    "slug": "satna"
  },
  {
    "name": "Sehore",
    "state": "Madhya Pradesh",
    "zone": "Central",
    "isMetro": false,
    "venues": [
      "Church Ground Sehore",
      "Bhopal Naka Sports Complex"
    ],
    "slug": "sehore"
  },
  {
    "name": "Shirdi-Ahilyanagar",
    "state": "Maharashtra",
    "zone": "West",
    "isMetro": false,
    "venues": [
      "Shirdi Sai Sansthan Sports Complex"
    ],
    "slug": "shirdi-ahilyanagar"
  },
  {
    "name": "Shivpuri",
    "state": "Madhya Pradesh",
    "zone": "Central",
    "isMetro": false,
    "venues": [
      "Madhav Rao Scindia Sports Complex Shivpuri"
    ],
    "slug": "shivpuri"
  },
  {
    "name": "Sikar",
    "state": "Rajasthan",
    "zone": "North",
    "isMetro": false,
    "venues": [
      "District Sports Stadium Sikar"
    ],
    "slug": "sikar"
  },
  {
    "name": "Sri Vijaya Puram",
    "state": "Andaman & Nicobar Islands",
    "zone": "Islands",
    "isMetro": false,
    "venues": [
      "Netaji Subhash Chandra Bose Stadium Port Blair",
      "SAI STC Centre"
    ],
    "slug": "sri-vijaya-puram"
  },
  {
    "name": "Srinagar",
    "state": "Jammu & Kashmir",
    "zone": "North",
    "isMetro": false,
    "venues": [
      "Bakshi Stadium",
      "TRC Turf Ground",
      "Sher-i-Kashmir Stadium"
    ],
    "slug": "srinagar"
  },
  {
    "name": "Sundargarh",
    "state": "Odisha",
    "zone": "East",
    "isMetro": false,
    "venues": [
      "Birsa Munda International Hockey Stadium Rourkela",
      "SAI Training Centre Sundargarh"
    ],
    "slug": "sundargarh"
  }
]

export const METRO_16_CITIES = ALL_INDIAN_CITIES.filter(c => c.isMetro)
export const REMAINING_CITIES = ALL_INDIAN_CITIES.filter(c => !c.isMetro)
