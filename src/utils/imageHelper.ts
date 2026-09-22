export const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  dogs: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
  cats: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
  rabbits: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=800&q=80',
  birds: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&w=800&q=80',
  others: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=800&q=80',
};

/**
 * Returns a valid, guaranteed accessible image URL for a pet.
 */
export const getValidPetImageUrl = (
  imageUrl?: string | null,
  category?: string
): string => {
  const catKey = (category || 'dogs').toLowerCase();
  const fallback =
    DEFAULT_CATEGORY_IMAGES[catKey] || DEFAULT_CATEGORY_IMAGES.dogs;

  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
    return fallback;
  }

  const trimmed = imageUrl.trim();

  // Valid remote URL or base64 Data URI
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:image/')
  ) {
    return trimmed;
  }

  // Local file or temporary cache URIs are not valid remote URLs for cross-device rendering
  return fallback;
};

/**
 * Returns category fallback image
 */
export const getCategoryFallbackImage = (category?: string): string => {
  const catKey = (category || 'dogs').toLowerCase();
  return DEFAULT_CATEGORY_IMAGES[catKey] || DEFAULT_CATEGORY_IMAGES.dogs;
};
