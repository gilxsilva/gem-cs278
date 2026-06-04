export const CATEGORIES = [
  { id: 'study',         label: 'Study Gems',   icon: 'book-outline',         color: '#7A9FC2', base: '#5B7FA6' },
  { id: 'food',          label: 'Food Spots',   icon: 'restaurant-outline',    color: '#C4A882', base: '#A07840' },
  { id: 'coffee',        label: 'Coffee Runs',  icon: 'cafe-outline',          color: '#B8956A', base: '#9A7040' },
  { id: 'events',        label: 'Moments',      icon: 'sparkles-outline',      color: '#A98BBE', base: '#7E5E9A' },
  { id: 'hidden',        label: 'Hidden Gems',  icon: 'diamond-outline',       color: '#C4828A', base: '#A06070' },
  { id: 'entertainment', label: 'Late Night',   icon: 'moon-outline',          color: '#8A9BBE', base: '#5A6E9A' },
];

export const getCat = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[0];

export const STANFORD = { latitude: 37.4275, longitude: -122.1697 };

export const NEARBY_PLACES = [
  { name: 'Green Library',       address: 'Stanford Libraries',               latitude: 37.4264, longitude: -122.1673 },
  { name: 'Coupa Café',          address: 'School of Business, Stanford',     latitude: 37.4281, longitude: -122.1651 },
  { name: 'Meyer Library',       address: 'Stanford University',              latitude: 37.4267, longitude: -122.1680 },
  { name: 'The Axe & Palm',      address: 'Stanford, CA',                     latitude: 37.4295, longitude: -122.1698 },
  { name: 'Cantor Arts Center',  address: '328 Lomita Dr, Stanford',          latitude: 37.4343, longitude: -122.1669 },
  { name: 'Dish Trail',          address: 'Stanford, CA',                     latitude: 37.4085, longitude: -122.1693 },
  { name: "Zareen's",            address: '1026 N California Ave, Palo Alto', latitude: 37.4489, longitude: -122.1463 },
  { name: 'Philz Coffee',        address: '855 El Camino Real, Palo Alto',    latitude: 37.4421, longitude: -122.1601 },
  { name: 'Tresidder Union',     address: 'Tresidder Union, Stanford',        latitude: 37.4245, longitude: -122.1690 },
  { name: 'Old Union',           address: 'Old Union, Stanford',              latitude: 37.4260, longitude: -122.1680 },
];

export const THEMES = {
  dark: {
    bg:       '#1A1512',
    surface:  '#241E1A',
    surface2: '#302820',
    border:   'rgba(250,247,242,0.08)',
    text:     '#FAF7F2',
    muted:    'rgba(250,247,242,0.40)',
    accent:   '#C2E0F7',
  },
  light: {
    bg:       '#FFFFFF',
    surface:  '#F5F5F5',
    surface2: '#EBEBEB',
    border:   'rgba(0,0,0,0.07)',
    text:     '#1C1714',
    muted:    'rgba(28,23,20,0.38)',
    accent:   '#0D1F3C',
  },
};

export const MAP_STYLES_DARK = [
  { elementType: 'geometry',             stylers: [{ color: '#1A1512' }] },
  { elementType: 'labels.text.stroke',   stylers: [{ color: '#1A1512' }] },
  { elementType: 'labels.text.fill',     stylers: [{ color: '#7A6A5A' }] },
  { featureType: 'poi',                  stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#243028' }] },
  { featureType: 'road', elementType: 'geometry',          stylers: [{ color: '#2E2822' }] },
  { featureType: 'road', elementType: 'labels.text.fill',  stylers: [{ color: '#8A7A6A' }] },
  { featureType: 'road.highway', elementType: 'geometry',  stylers: [{ color: '#3A3020' }] },
  { featureType: 'water', elementType: 'geometry',         stylers: [{ color: '#1A2838' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4A5C6A' }] },
  { featureType: 'transit',              stylers: [{ visibility: 'off' }] },
];

export const MAP_STYLES_LIGHT = [
  { elementType: 'geometry',                                       stylers: [{ color: '#FFFFFF' }] },
  { elementType: 'labels.text.fill',                               stylers: [{ color: '#1A1A1A' }] },
  { elementType: 'labels.text.stroke',                             stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'geometry',                  stylers: [{ color: '#F1F5F9' }] },
  { featureType: 'road', elementType: 'geometry.stroke',           stylers: [{ color: '#E2E8F0' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill',    stylers: [{ color: '#94A3B8' }] },
  { featureType: 'road.highway', elementType: 'geometry',          stylers: [{ color: '#E0E7FF' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke',   stylers: [{ color: '#C7D2FE' }] },
  { featureType: 'water', elementType: 'geometry',                 stylers: [{ color: '#BAE6FD' }] },
  { featureType: 'water', elementType: 'labels.text.fill',         stylers: [{ color: '#0369A1' }] },
  { featureType: 'poi.park', elementType: 'geometry',              stylers: [{ color: '#BBF7D0' }] },
  { featureType: 'poi.park', elementType: 'labels',                stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape.natural', elementType: 'geometry',     stylers: [{ color: '#F0FDF4' }] },
  { featureType: 'poi', elementType: 'geometry',                   stylers: [{ color: '#F8FAFC' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry',    stylers: [{ color: '#F1F5F9' }] },
  { featureType: 'transit',                                        stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#CBD5E1' }] },
];
