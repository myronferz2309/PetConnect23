import { Pet, AdoptionApplication, UserProfile } from '../types';

export const SYSTEM_SHELTER_OWNER_ID = 'system-shelter-partner';

export const INITIAL_PETS: Pet[] = [
  {
    id: 'bella-1',
    name: 'Bella',
    breed: 'Golden Retriever',
    age: '2 years',
    gender: 'female',
    location: 'San Francisco, CA',
    category: 'dogs',
    description:
      "Bella is a sweet and energetic Golden Retriever who loves long walks on the beach and playing fetch. She is exceptionally friendly, great with kids, and always ready for an adventure. Bella is fully vaccinated and house-trained. She's looking for a loving home with a yard where she can run and play!",
    imageUrl:
      'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=80',
    additionalImages: [
      'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
    ],
    tags: ['Friendly', 'House-trained', 'Vaccinated', 'Good with Kids'],
    isFeatured: true,
    shelterName: 'Golden Gate Animal Rescue',
    shelterContact: 'adoptions@goldengaterescue.org',
    ownerId: SYSTEM_SHELTER_OWNER_ID,
    ownerName: 'Golden Gate Animal Rescue',
    status: 'available',
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'milo-2',
    name: 'Milo',
    breed: 'Domestic Shorthair',
    age: '6 months',
    gender: 'male',
    location: 'Oakland, CA',
    category: 'cats',
    description:
      'Milo is a curious, affectionate tabby kitten with an inquisitive spirit. He loves chasing feather toys, purring warmly on cozy laps, and sunbathing by window sills. Milo is social, vaccinated, and gets along well with gentle cats.',
    imageUrl:
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
    additionalImages: [
      'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=800&q=80',
    ],
    tags: ['Playful', 'Litter-trained', 'Cuddle Bug'],
    isFeatured: true,
    shelterName: 'Bay Area Feline Haven',
    shelterContact: 'contact@bayareacats.org',
    ownerId: SYSTEM_SHELTER_OWNER_ID,
    ownerName: 'Bay Area Feline Haven',
    status: 'available',
    createdAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'oliver-3',
    name: 'Oliver',
    breed: 'French Bulldog',
    age: '1 year',
    gender: 'male',
    location: 'San Jose, CA',
    category: 'dogs',
    description:
      'Oliver is a charming French Bulldog with a heart of gold. He enjoys short strolls, cuddling on comfortable couches, and meeting friendly neighbors.',
    imageUrl:
      'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80',
    additionalImages: [
      'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80',
    ],
    tags: ['Calm', 'Apartment Friendly', 'Affectionate'],
    isFeatured: true,
    shelterName: 'Silicon Valley Pet Sanctuary',
    shelterContact: 'adopt@svsanctuary.org',
    ownerId: SYSTEM_SHELTER_OWNER_ID,
    ownerName: 'Silicon Valley Pet Sanctuary',
    status: 'available',
    createdAt: Date.now() - 86400000 * 3,
  },
];

export const INITIAL_APPLICATIONS: AdoptionApplication[] = [
  {
    id: 'demo-app-1',
    petId: 'bella-1',
    petName: 'Bella',
    petBreed: 'Golden Retriever',
    petImageUrl:
      'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=80',
    petOwnerId: SYSTEM_SHELTER_OWNER_ID,
    applicantId: 'demo-user-sarah',
    applicantName: 'Sarah Jenkins',
    applicantEmail: 'sarah.j@example.com',
    phoneNumber: '(555) 234-5678',
    address: '124 Market St, San Francisco, CA',
    experience: 'Had Golden Retrievers for 12 years. Big fenced backyard.',
    reason:
      'We fell in love with Bella’s warm and energetic personality. She would have a loving family with kids and lots of outdoor time.',
    status: 'pending',
    submittedAt: '2 days ago',
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'demo-app-2',
    petId: 'milo-2',
    petName: 'Milo',
    petBreed: 'Domestic Shorthair',
    petImageUrl:
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
    petOwnerId: SYSTEM_SHELTER_OWNER_ID,
    applicantId: 'demo-user-sarah',
    applicantName: 'Sarah Jenkins',
    applicantEmail: 'sarah.j@example.com',
    phoneNumber: '(555) 234-5678',
    address: '124 Market St, San Francisco, CA',
    experience: 'Currently have one calm 4-year-old cat looking for a companion.',
    reason:
      'Milo would be the perfect brother for our resident cat. We have multiple cat trees, window perches, and love to give.',
    status: 'Under Shelter Review',
    submittedAt: '5 days ago',
    createdAt: Date.now() - 86400000 * 5,
  },
];

export const INITIAL_USER: UserProfile = {
  uid: 'demo-user-sarah',
  name: 'Sarah Jenkins',
  email: 'sarah.jenkins@example.com',
  phone: '+91 98765 43210',
  address: 'Bandra West, Mumbai, Maharashtra',
  profilePhotoUrl: '',
  avatarUrl: '',
  savedPetIds: ['bella-1', 'milo-2'],
  createdAt: Date.now() - 86400000 * 30,
  updatedAt: Date.now(),
};
