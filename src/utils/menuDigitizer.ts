import { DietaryType, MenuCategory } from '../types';

export interface ExtractedMenuItemDraft {
  id: string;
  selected: boolean;
  name: string;
  category: MenuCategory;
  price: number;
  dietary: DietaryType;
  description: string;
  autoDetectedDietReason?: string;
}

export const DIGITIZER_CATEGORIES: MenuCategory[] = [
  'Appetizers',
  'Tandoor',
  'Curries',
  'Biryani',
  'Breads',
  'Beverages',
  'Desserts',
  'Starters',
  'Mains',
  'Chef Specials',
];

const NON_VEG_KEYWORDS = [
  'chicken',
  'murgh',
  'murg',
  'mutton',
  'gosht',
  'lamb',
  'fish',
  'machi',
  'machli',
  'pomfret',
  'surmai',
  'rawas',
  'salmon',
  'sea bass',
  'prawn',
  'prawns',
  'jhinga',
  'shrimp',
  'crab',
  'lobster',
  'scallop',
  'oyster',
  'calamari',
  'squid',
  'egg',
  'eggs',
  'anda',
  'omelette',
  'poached egg',
  'keema',
  'seekh',
  'galouti',
  'laal maas',
  'rogan josh',
  'nihari',
  'korma',
  'duck',
  'beef',
  'wagyu',
  'pork',
  'bacon',
  'pepperoni',
  'ham',
];

const VEG_KEYWORDS = [
  'paneer',
  'dal',
  'daal',
  'sabzi',
  'subz',
  'tarkari',
  'aloo',
  'gobi',
  'gobhi',
  'mushroom',
  'khumb',
  'palak',
  'saag',
  'chana',
  'chole',
  'rajma',
  'kofta',
  'malai kofta',
  'soya',
  'chaap',
  'bhindi',
  'baingan',
  'matar',
  'methi',
  'corn',
  'hara bhara',
  'dahi',
  'raita',
  'chaas',
  'lassi',
  'shahi tukda',
  'gulab jamun',
  'rasmalai',
  'kulfi',
  'halwa',
  'naan',
  'roti',
  'paratha',
  'kulcha',
  'brioche',
  'croissant',
  'avocado',
  'burrata',
  'truffle',
  'matcha',
  'espresso',
  'cortado',
  'cold brew',
  'latte',
  'cappuccino',
  'waffle',
  'tiramisu',
  'tres leches',
];

/**
 * Auto-detects Veg vs. Non-Veg based on dish name and description/ingredients.
 */
export function autoDetectDietaryType(
  name: string,
  description: string = ''
): { dietary: DietaryType; matchedKeyword?: string } {
  const combined = `${name} ${description}`.toLowerCase();

  for (const kw of NON_VEG_KEYWORDS) {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(combined)) {
      return { dietary: 'Non-Veg', matchedKeyword: kw };
    }
  }

  for (const kw of VEG_KEYWORDS) {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(combined)) {
      return { dietary: 'Veg', matchedKeyword: kw };
    }
  }

  return { dietary: 'Veg' };
}

/**
 * Cleanly extracts a numerical INR price from strings like "₹ 540/-", "Rs. 620", "450.00", etc.
 */
export function cleanNumericPrice(raw: string | number | undefined): number {
  if (typeof raw === 'number' && !isNaN(raw)) {
    return Math.max(0, Math.round(raw));
  }
  if (!raw) return 350;
  const str = String(raw).replace(/,/g, '');
  const match = str.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 350;
  const parsed = parseFloat(match[1]);
  return isNaN(parsed) ? 350 : Math.max(10, Math.round(parsed));
}

/**
 * Normalizes any AI-extracted category string into a valid MenuCategory.
 */
export function normalizeMenuCategory(rawCategory: string | undefined): MenuCategory {
  if (!rawCategory) return 'Curries';
  const c = rawCategory.trim().toLowerCase();

  if (c.includes('tandoor') || c.includes('kebab') || c.includes('tikka') || c.includes('grill')) {
    return 'Tandoor';
  }
  if (c.includes('appetizer') || c.includes('chaat') || c.includes('small plate') || c.includes('snack') || c.includes('toast') || c.includes('savory')) {
    return 'Appetizers';
  }
  if (c.includes('starter') || c.includes('soup') || c.includes('salad')) {
    return 'Starters';
  }
  if (c.includes('curry') || c.includes('curries') || c.includes('gravy') || c.includes('dal') || c.includes('masala') || c.includes('handi') || c.includes('kadai')) {
    return 'Curries';
  }
  if (c.includes('biryani') || c.includes('pulao') || c.includes('rice')) {
    return 'Biryani';
  }
  if (c.includes('bread') || c.includes('naan') || c.includes('roti') || c.includes('paratha') || c.includes('kulcha') || c.includes('bakery') || c.includes('viennoiserie')) {
    return 'Breads';
  }
  if (c.includes('beverage') || c.includes('drink') || c.includes('coffee') || c.includes('tea') || c.includes('mocktail') || c.includes('cocktail') || c.includes('lassi') || c.includes('cooler')) {
    return 'Beverages';
  }
  if (c.includes('dessert') || c.includes('sweet') || c.includes('mithai') || c.includes('pastry')) {
    return 'Desserts';
  }
  if (c.includes('special') || c.includes('signature')) {
    return 'Chef Specials';
  }
  if (c.includes('main')) {
    return 'Mains';
  }

  return 'Curries';
}

export interface SampleMenuPreset {
  id: 'north_indian' | 'cafe_beverage';
  title: string;
  buttonLabel: string;
  subtitle: string;
  fileName: string;
  fileMeta: string;
  headerTitle: string;
  headerSubtitle: string;
  items: Omit<ExtractedMenuItemDraft, 'id' | 'selected'>[];
}

export const SAMPLE_MENU_PRESETS: Record<'north_indian' | 'cafe_beverage', SampleMenuPreset> = {
  north_indian: {
    id: 'north_indian',
    title: 'Sample Indian North Indian Menu',
    buttonLabel: 'Try with Sample Indian North Indian Menu',
    subtitle: '10 dishes across Tandoor, Appetizers, Curries, Biryani, Breads, Desserts & Beverages',
    fileName: 'Purani_Dilli_Royal_Awadhi_Menu_2026.jpg',
    fileMeta: 'JPG · 2.4 MB · High-Res Menu Card Scan',
    headerTitle: 'DASTAN-E-AWADH & PUNJAB',
    headerSubtitle: 'Royal Clay Oven Tandoor, Slow-Simmered Handi Curries & Dum Biryani',
    items: [
      {
        name: 'Amritsari Malai Paneer Tikka',
        category: 'Tandoor',
        price: 460,
        dietary: 'Veg',
        description: 'Charcoal-roasted cottage cheese cubes marinated in hung curd, kasuri methi, ajwain & white pepper.',
        autoDetectedDietReason: 'Matched Veg keyword: "paneer"',
      },
      {
        name: 'Tandoori Murgh Angara (Half)',
        category: 'Tandoor',
        price: 580,
        dietary: 'Non-Veg',
        description: 'Clay-oven smoked spring chicken rubbed with Mathania red chillies, roasted cumin & mustard oil.',
        autoDetectedDietReason: 'Matched Non-Veg keyword: "chicken / murgh"',
      },
      {
        name: 'Kurkuri Palak Patta Chaat',
        category: 'Appetizers',
        price: 380,
        dietary: 'Veg',
        description: 'Crisp gram-flour battered baby spinach leaves, sweetened hung curd, tamarind & pomegranate jewels.',
        autoDetectedDietReason: 'Matched Veg keyword: "palak"',
      },
      {
        name: 'Amritsari Macchi Fry (Sole Fish)',
        category: 'Appetizers',
        price: 640,
        dietary: 'Non-Veg',
        description: 'Crisp carom-seed battered river sole fish fillets served with mint-coriander chutney & pickled radish.',
        autoDetectedDietReason: 'Matched Non-Veg keyword: "fish"',
      },
      {
        name: 'Dal Makhani 24-Hr Slow Simmered',
        category: 'Curries',
        price: 490,
        dietary: 'Veg',
        description: 'Whole black urad lentils slow-cooked overnight on charcoal embers with organic white butter & cream.',
        autoDetectedDietReason: 'Matched Veg keyword: "dal"',
      },
      {
        name: 'Kadai Paneer Peshawari',
        category: 'Curries',
        price: 540,
        dietary: 'Veg',
        description: 'Fresh malai paneer tossed in an iron wok with pounded coriander seeds, bell peppers & Roma tomatoes.',
        autoDetectedDietReason: 'Matched Veg keyword: "paneer"',
      },
      {
        name: 'Rajasthani Laal Maas (Mutton)',
        category: 'Curries',
        price: 790,
        dietary: 'Non-Veg',
        description: 'Tender bone-in goat mutton braised in a fiery smoked Mathania chilli, garlic & desi ghee gravy.',
        autoDetectedDietReason: 'Matched Non-Veg keyword: "mutton / laal maas"',
      },
      {
        name: 'Awadhi Dum Gosht Biryani',
        category: 'Biryani',
        price: 750,
        dietary: 'Non-Veg',
        description: 'Aged long-grain basmati rice & saffron-braised lamb sealed in a handi with puff pastry parda.',
        autoDetectedDietReason: 'Matched Non-Veg keyword: "gosht / lamb"',
      },
      {
        name: 'Subz Zafrani Tarkari Biryani',
        category: 'Biryani',
        price: 560,
        dietary: 'Veg',
        description: 'Seasonal root vegetables, jackfruit & paneer layered with saffron basmati, caramelized onions & mint.',
        autoDetectedDietReason: 'Matched Veg keyword: "subz / paneer"',
      },
      {
        name: 'Old Delhi Chur Chur Garlic Naan',
        category: 'Breads',
        price: 160,
        dietary: 'Veg',
        description: 'Flaky crushed tandoori flatbread brushed with roasted garlic, fresh coriander & cultured butter.',
        autoDetectedDietReason: 'Matched Veg keyword: "naan"',
      },
      {
        name: 'Zafrani Shahi Tukda with Rabri',
        category: 'Desserts',
        price: 340,
        dietary: 'Veg',
        description: 'Ghee-toasted brioche soaked in saffron cardamom syrup, topped with reduced pistachio rabri & silver leaf.',
        autoDetectedDietReason: 'Matched Veg keyword: "shahi tukda"',
      },
      {
        name: 'Smoked Jeera Masala Chaas',
        category: 'Beverages',
        price: 190,
        dietary: 'Veg',
        description: 'Chilled churned buttermilk tempered with roasted cumin, black salt, ginger & fresh mint leaves.',
        autoDetectedDietReason: 'Matched Veg keyword: "chaas"',
      },
    ],
  },
  cafe_beverage: {
    id: 'cafe_beverage',
    title: 'Sample Cafe & Beverage Menu',
    buttonLabel: 'Try with Sample Cafe & Beverage Menu',
    subtitle: '9 artisanal cafe plates, sourdough toasts, specialty coffee & desserts',
    fileName: 'Atelier_Roastery_All_Day_Cafe_Menu.pdf',
    fileMeta: 'PDF · 1.8 MB · Vector Menu Document',
    headerTitle: 'ATELIER ROASTERY & ALL-DAY BAKEHOUSE',
    headerSubtitle: 'Single-Origin Espresso Bar, Artisanal Sourdough & Patisserie',
    items: [
      {
        name: 'Avocado & Poached Egg Sourdough Toast',
        category: 'Appetizers',
        price: 480,
        dietary: 'Non-Veg',
        description: '48-hour fermented country sourdough, smashed Hass avocado, two free-range poached eggs, chilli oil.',
        autoDetectedDietReason: 'Matched Non-Veg keyword: "poached egg"',
      },
      {
        name: 'Truffle Wild Mushroom & Gruyère Croissant',
        category: 'Appetizers',
        price: 440,
        dietary: 'Veg',
        description: 'Flaky French butter croissant stuffed with sautéed cremini mushrooms, aged Gruyère & black truffle.',
        autoDetectedDietReason: 'Matched Veg keyword: "mushroom / croissant"',
      },
      {
        name: 'Smoked Chicken & Basil Pesto Panini',
        category: 'Appetizers',
        price: 520,
        dietary: 'Non-Veg',
        description: 'Herb-roasted pulled chicken breast, house pine-nut basil pesto, Fior di Latte mozzarella on ciabatta.',
        autoDetectedDietReason: 'Matched Non-Veg keyword: "chicken"',
      },
      {
        name: 'Burrata & Heirloom Tomato Focaccia',
        category: 'Breads',
        price: 490,
        dietary: 'Veg',
        description: 'Rosemary sea-salt olive oil focaccia topped with creamy Pugliese burrata, basil & aged balsamic.',
        autoDetectedDietReason: 'Matched Veg keyword: "burrata"',
      },
      {
        name: 'Spanish Saffron & Condensed Milk Cortado',
        category: 'Beverages',
        price: 280,
        dietary: 'Veg',
        description: 'Double ristretto of Chikmagalur Arabica balanced with textured milk, Kashmiri saffron & sweet crema.',
        autoDetectedDietReason: 'Matched Veg keyword: "cortado"',
      },
      {
        name: 'Iced Uji Matcha & Yuzu Sparkling Fizz',
        category: 'Beverages',
        price: 340,
        dietary: 'Veg',
        description: 'Ceremonial grade Kyoto Uji matcha whisked over Japanese yuzu citrus tonic & botanical ice.',
        autoDetectedDietReason: 'Matched Veg keyword: "matcha"',
      },
      {
        name: 'Barrel-Aged Malabar Cold Brew (250ml)',
        category: 'Beverages',
        price: 290,
        dietary: 'Veg',
        description: '18-hour cold-steeped Monsooned Malabar estate coffee with notes of dark cocoa & toasted hazelnut.',
        autoDetectedDietReason: 'Matched Veg keyword: "cold brew"',
      },
      {
        name: 'Warm Belgian Valrhona Chocolate Waffle',
        category: 'Desserts',
        price: 410,
        dietary: 'Veg',
        description: 'Crisp Liège pearl-sugar waffle drizzled with 70% dark Valrhona ganache, roasted hazelnuts & vanilla bean gelato.',
        autoDetectedDietReason: 'Matched Veg keyword: "waffle"',
      },
      {
        name: 'Masala Chai Spiced Tres Leches Cake',
        category: 'Desserts',
        price: 390,
        dietary: 'Veg',
        description: 'Light sponge soaked in cardamom, cinnamon & Assam tea three-milk infusion, topped with whipped mascarpone.',
        autoDetectedDietReason: 'Matched Veg keyword: "tres leches"',
      },
    ],
  },
};

export function createDraftItemsFromList(
  rawItems: Array<{
    name?: string;
    category?: string;
    price?: number | string;
    dietary?: string;
    description?: string;
  }>
): ExtractedMenuItemDraft[] {
  return rawItems.map((raw, idx) => {
    const cleanName = (raw.name || `Menu Item ${idx + 1}`).trim();
    const cleanDesc = (raw.description || 'Freshly prepared house specialty.').trim();
    const category = normalizeMenuCategory(raw.category);
    const price = cleanNumericPrice(raw.price);

    const detected = autoDetectDietaryType(cleanName, cleanDesc);
    let dietary: DietaryType = detected.dietary;

    // Respect explicit Non-Veg/Veg from AI unless keyword strongly indicates Non-Veg
    if (detected.dietary === 'Non-Veg') {
      dietary = 'Non-Veg';
    } else if (raw.dietary) {
      const d = raw.dietary.toLowerCase();
      if (d.includes('non')) dietary = 'Non-Veg';
      else if (d.includes('vegan')) dietary = 'Vegan';
      else dietary = 'Veg';
    }

    return {
      id: `draft-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      selected: true,
      name: cleanName,
      category,
      price,
      dietary,
      description: cleanDesc,
      autoDetectedDietReason: detected.matchedKeyword
        ? `Auto-detected ${dietary} ("${detected.matchedKeyword}")`
        : `Auto-classified ${dietary}`,
    };
  });
}
