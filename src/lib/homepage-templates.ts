// AUTO-GENERATED homepage layout + copy templates. Applied by homepage-template.functions.ts.
import type { ThemeHero, HomeSections } from "./types";

export type HomepageTemplate = {
  id: string; name: string; category: string; description: string;
  hero: ThemeHero;
  sections: HomeSections;
  copy: {
    heroEyebrow: string; heroTitleTop: string; heroTitleBottom: string; heroSubtitle: string;
    ctaPrimaryLabel: string; ctaSecondaryLabel: string;
    categoriesTitle: string; bestSellersTitle: string; newArrivalsTitle: string;
  };
};

export const HOMEPAGE_TEMPLATES: HomepageTemplate[] = [
  {
    "id": "minimal-pure-essence",
    "name": "Pure Essence",
    "category": "minimal",
    "description": "A stripped-back, essentials-only layout built on the 'less, but better' philosophy.",
    "hero": "minimal",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Considered Design",
      "heroTitleTop": "Everything you need,",
      "heroTitleBottom": "nothing you don't",
      "heroSubtitle": "A tightly edited collection built to last. No noise, no clutter — just the essentials, done exceptionally well.",
      "ctaPrimaryLabel": "Shop the Edit",
      "ctaSecondaryLabel": "Our Philosophy",
      "categoriesTitle": "Browse by Category",
      "bestSellersTitle": "Quietly Popular",
      "newArrivalsTitle": "Just Added"
    }
  },
  {
    "id": "minimal-quiet-luxury",
    "name": "Quiet Luxury",
    "category": "minimal",
    "description": "Understated, refined layout for brands that let quality speak softly.",
    "hero": "centered",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Understated Luxury",
      "heroTitleTop": "Luxury that never",
      "heroTitleBottom": "raises its voice",
      "heroSubtitle": "Refined materials, honest craftsmanship, and a quiet confidence you feel long after the first look.",
      "ctaPrimaryLabel": "Explore Collection",
      "ctaSecondaryLabel": "The Story",
      "categoriesTitle": "Shop by Category",
      "bestSellersTitle": "Most Loved",
      "newArrivalsTitle": "New This Season"
    }
  },
  {
    "id": "minimal-editorial-edit",
    "name": "The Editorial",
    "category": "minimal",
    "description": "Magazine-style split hero with a curated, editor-driven voice.",
    "hero": "split",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "The Edit",
      "heroTitleTop": "Curated with",
      "heroTitleBottom": "an editor's eye",
      "heroSubtitle": "Each piece earns its place. A living edit of the objects we believe are genuinely worth keeping.",
      "ctaPrimaryLabel": "Read the Edit",
      "ctaSecondaryLabel": "View Lookbook",
      "categoriesTitle": "Explore Categories",
      "bestSellersTitle": "Editor's Picks",
      "newArrivalsTitle": "Latest Additions"
    }
  },
  {
    "id": "minimal-white-space",
    "name": "White Space",
    "category": "minimal",
    "description": "Ultra-sparse full-bleed hero where open space is the main feature.",
    "hero": "fullbleed",
    "sections": {
      "categories": false,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Room to Breathe",
      "heroTitleTop": "Space is the",
      "heroTitleBottom": "ultimate luxury",
      "heroSubtitle": "We let the work speak. Clean lines, open room, and pieces designed to stand entirely on their own.",
      "ctaPrimaryLabel": "Enter the Space",
      "ctaSecondaryLabel": "Learn More",
      "categoriesTitle": "Collections",
      "bestSellersTitle": "Signature Pieces",
      "newArrivalsTitle": "Recently Released"
    }
  },
  {
    "id": "minimal-slow-living",
    "name": "Slow Living",
    "category": "minimal",
    "description": "Calm, intentional layout with process storytelling for slow-made goods.",
    "hero": "spotlight",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": false,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Made to Last",
      "heroTitleTop": "Slow down,",
      "heroTitleBottom": "choose better",
      "heroSubtitle": "An antidote to fast and forgettable. Thoughtful objects for a life lived with a little more intention.",
      "ctaPrimaryLabel": "Start Slow",
      "ctaSecondaryLabel": "How We Make It",
      "categoriesTitle": "Find Your Fit",
      "bestSellersTitle": "Time-Tested Favorites",
      "newArrivalsTitle": "Fresh Arrivals"
    }
  },
  {
    "id": "minimal-modern-form",
    "name": "Modern Form",
    "category": "minimal",
    "description": "Architectural diagonal hero balancing clean geometry with everyday function.",
    "hero": "diagonal",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Form Meets Function",
      "heroTitleTop": "Designed for",
      "heroTitleBottom": "the way you live",
      "heroSubtitle": "Where clean geometry meets daily utility. Modern essentials engineered to disappear into your routine.",
      "ctaPrimaryLabel": "Shop Now",
      "ctaSecondaryLabel": "Design Notes",
      "categoriesTitle": "Shop by Type",
      "bestSellersTitle": "Proven Designs",
      "newArrivalsTitle": "New Releases"
    }
  },
  {
    "id": "minimal-curated-few",
    "name": "The Shortlist",
    "category": "minimal",
    "description": "Showcase hero championing a deliberately small, hand-picked range.",
    "hero": "showcase",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "A Small Collection",
      "heroTitleTop": "Fewer things,",
      "heroTitleBottom": "chosen carefully",
      "heroSubtitle": "We'd rather offer a handful of pieces we love than a thousand we don't. This is the shortlist.",
      "ctaPrimaryLabel": "See the Shortlist",
      "ctaSecondaryLabel": "Why So Few?",
      "categoriesTitle": "The Categories",
      "bestSellersTitle": "Most Reached For",
      "newArrivalsTitle": "Newest Picks"
    }
  },
  {
    "id": "minimal-soft-focus",
    "name": "Soft Focus",
    "category": "minimal",
    "description": "Gentle gradient hero with warm neutrals and a softer minimalist mood.",
    "hero": "gradient",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Soft & Simple",
      "heroTitleTop": "Calm in every",
      "heroTitleBottom": "little detail",
      "heroSubtitle": "Warm neutrals, gentle forms, and a softer take on modern minimalism. Ease, made tangible.",
      "ctaPrimaryLabel": "Discover Calm",
      "ctaSecondaryLabel": "Our Approach",
      "categoriesTitle": "Gently Categorized",
      "bestSellersTitle": "Softly Favored",
      "newArrivalsTitle": "Just In"
    }
  },
  {
    "id": "minimal-monochrome",
    "name": "Monochrome",
    "category": "minimal",
    "description": "Timeless, tone-and-line focused layout with the sparsest section set.",
    "hero": "minimal",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": false,
      "newsletter": false
    },
    "copy": {
      "heroEyebrow": "Timeless by Design",
      "heroTitleTop": "A palette that",
      "heroTitleBottom": "never goes out",
      "heroSubtitle": "Stripped back to the essentials of tone and line. Pieces that look as right in ten years as they do today.",
      "ctaPrimaryLabel": "Shop the Range",
      "ctaSecondaryLabel": "The Ethos",
      "categoriesTitle": "Browse the Range",
      "bestSellersTitle": "The Classics",
      "newArrivalsTitle": "New In"
    }
  },
  {
    "id": "minimal-considered",
    "name": "Considered",
    "category": "minimal",
    "description": "Deliberate, process-led layout emphasizing intentional design choices.",
    "hero": "centered",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Nothing by Accident",
      "heroTitleTop": "Every choice,",
      "heroTitleBottom": "made on purpose",
      "heroSubtitle": "From the first sketch to the final stitch, everything here is deliberate. Design you can feel in the hand.",
      "ctaPrimaryLabel": "Explore Thoughtfully",
      "ctaSecondaryLabel": "Our Process",
      "categoriesTitle": "Shop with Intent",
      "bestSellersTitle": "Best Considered",
      "newArrivalsTitle": "Newly Considered"
    }
  },
  {
    "id": "minimal-essentials-capsule",
    "name": "The Capsule",
    "category": "minimal",
    "description": "Split hero built around versatile, mix-and-match essentials.",
    "hero": "split",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "The Capsule",
      "heroTitleTop": "Build around",
      "heroTitleBottom": "the essentials",
      "heroSubtitle": "A foundation of versatile pieces that work together effortlessly. Start here, and build from there.",
      "ctaPrimaryLabel": "Shop Essentials",
      "ctaSecondaryLabel": "Build Your Capsule",
      "categoriesTitle": "The Building Blocks",
      "bestSellersTitle": "Everyday Staples",
      "newArrivalsTitle": "New Essentials"
    }
  },
  {
    "id": "minimal-gallery",
    "name": "The Gallery",
    "category": "minimal",
    "description": "Museum-inspired full-bleed layout that frames products like exhibits.",
    "hero": "fullbleed",
    "sections": {
      "categories": false,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "On Display",
      "heroTitleTop": "Objects worth",
      "heroTitleBottom": "a second look",
      "heroSubtitle": "We treat every piece like it belongs in a gallery — because it does. Step inside the collection.",
      "ctaPrimaryLabel": "Enter the Gallery",
      "ctaSecondaryLabel": "View Exhibition",
      "categoriesTitle": "Wings & Collections",
      "bestSellersTitle": "Permanent Collection",
      "newArrivalsTitle": "New Acquisitions"
    }
  },
  {
    "id": "minimal-refined-craft",
    "name": "Refined Craft",
    "category": "minimal",
    "description": "Spotlight hero celebrating meticulous craftsmanship and fine detail.",
    "hero": "spotlight",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Refined to the Detail",
      "heroTitleTop": "Craft, distilled",
      "heroTitleBottom": "to its finest",
      "heroSubtitle": "Hours of refinement in every seam and surface. This is what happens when nothing is left to chance.",
      "ctaPrimaryLabel": "Discover the Craft",
      "ctaSecondaryLabel": "Meet the Makers",
      "categoriesTitle": "By Discipline",
      "bestSellersTitle": "Finest Work",
      "newArrivalsTitle": "Latest Craft"
    }
  },
  {
    "id": "minimal-nordic-calm",
    "name": "Nordic Calm",
    "category": "minimal",
    "description": "Scandinavian-inspired showcase with honest materials and quiet warmth.",
    "hero": "showcase",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Scandinavian Simplicity",
      "heroTitleTop": "Warmth in",
      "heroTitleBottom": "the simplest things",
      "heroSubtitle": "Inspired by long northern light and honest materials. Simple, functional, and quietly beautiful.",
      "ctaPrimaryLabel": "Shop the Collection",
      "ctaSecondaryLabel": "The Nordic Way",
      "categoriesTitle": "Browse Categories",
      "bestSellersTitle": "Northern Favorites",
      "newArrivalsTitle": "New Arrivals"
    }
  },
  {
    "id": "minimal-timeless-invest",
    "name": "Buy Once",
    "category": "minimal",
    "description": "Gradient hero for buy-it-for-life goods that outlast every trend.",
    "hero": "gradient",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": false,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Buy Once",
      "heroTitleTop": "Made to outlast",
      "heroTitleBottom": "every trend",
      "heroSubtitle": "We don't chase seasons. We make things you'll reach for year after year, and never think to replace.",
      "ctaPrimaryLabel": "Invest in Better",
      "ctaSecondaryLabel": "Our Guarantee",
      "categoriesTitle": "Shop by Category",
      "bestSellersTitle": "Enduring Favorites",
      "newArrivalsTitle": "Recently Added"
    }
  },
  {
    "id": "minimal-understated",
    "name": "Understated",
    "category": "minimal",
    "description": "Confident, ultra-quiet centered layout that trusts the informed shopper.",
    "hero": "centered",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": false,
      "newsletter": false
    },
    "copy": {
      "heroEyebrow": "Quiet Confidence",
      "heroTitleTop": "It doesn't need",
      "heroTitleBottom": "to shout",
      "heroSubtitle": "The best things rarely announce themselves. Understated pieces for people who already know.",
      "ctaPrimaryLabel": "Shop Quietly",
      "ctaSecondaryLabel": "Learn More",
      "categoriesTitle": "Categories",
      "bestSellersTitle": "Understated Favorites",
      "newArrivalsTitle": "New Arrivals"
    }
  },
  {
    "id": "minimal-clean-slate",
    "name": "Clean Slate",
    "category": "minimal",
    "description": "Fresh-start minimal hero with a simple, guided how-it-works flow.",
    "hero": "minimal",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "A Fresh Start",
      "heroTitleTop": "Begin with a",
      "heroTitleBottom": "clean slate",
      "heroSubtitle": "Clear the clutter and start fresh. A simpler collection for a simpler, better everyday.",
      "ctaPrimaryLabel": "Start Fresh",
      "ctaSecondaryLabel": "How It Works",
      "categoriesTitle": "Start Here",
      "bestSellersTitle": "Where to Begin",
      "newArrivalsTitle": "Newly Arrived"
    }
  },
  {
    "id": "bold-electric-launch",
    "name": "Electric Launch",
    "category": "bold",
    "description": "High-voltage split hero built to fire up product launches and drops.",
    "hero": "split",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "NEW DROP LIVE",
      "heroTitleTop": "Turn Heads,",
      "heroTitleBottom": "Break Records",
      "heroSubtitle": "The pieces everyone will be talking about — engineered to sell out and impossible to ignore.",
      "ctaPrimaryLabel": "Shop The Drop",
      "ctaSecondaryLabel": "See What's Hot",
      "categoriesTitle": "Pick Your Lane",
      "bestSellersTitle": "Flying Off The Shelves",
      "newArrivalsTitle": "Just Landed"
    }
  },
  {
    "id": "bold-headline-hero",
    "name": "Headline Hero",
    "category": "bold",
    "description": "Centered mega-type statement that hits hard the moment the page loads.",
    "hero": "centered",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "GO BIG OR GO HOME",
      "heroTitleTop": "Everything You Want.",
      "heroTitleBottom": "Nothing You Don't.",
      "heroSubtitle": "Bold picks, blunt pricing, zero filler. Scroll once and you'll see why we don't do subtle.",
      "ctaPrimaryLabel": "Start Shopping",
      "ctaSecondaryLabel": "Browse Everything",
      "categoriesTitle": "Find Your Fix",
      "bestSellersTitle": "Crowd Favorites",
      "newArrivalsTitle": "Fresh This Week"
    }
  },
  {
    "id": "bold-full-impact",
    "name": "Full Impact",
    "category": "bold",
    "description": "Edge-to-edge fullbleed banner that makes an entrance you can't scroll past.",
    "hero": "fullbleed",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "THE MAIN EVENT",
      "heroTitleTop": "Make Every Day",
      "heroTitleBottom": "Unmissable",
      "heroSubtitle": "One look and you're in. Big styles, bigger energy, and a lineup built to steal the spotlight.",
      "ctaPrimaryLabel": "Get Yours Now",
      "ctaSecondaryLabel": "Explore The Range",
      "categoriesTitle": "Shop By Vibe",
      "bestSellersTitle": "The Heavy Hitters",
      "newArrivalsTitle": "Hot Off The Line"
    }
  },
  {
    "id": "bold-blunt-minimal",
    "name": "Blunt Minimal",
    "category": "bold",
    "description": "Stripped-back minimal hero where oversized type does all the shouting.",
    "hero": "minimal",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "NO FLUFF",
      "heroTitleTop": "Less Noise.",
      "heroTitleBottom": "More Wow.",
      "heroSubtitle": "We cut the clutter so the good stuff hits harder. Straight to the point, straight to your cart.",
      "ctaPrimaryLabel": "Shop Now",
      "ctaSecondaryLabel": "View All",
      "categoriesTitle": "Straight To It",
      "bestSellersTitle": "Top Picks",
      "newArrivalsTitle": "New In"
    }
  },
  {
    "id": "bold-spotlight-star",
    "name": "Spotlight Star",
    "category": "bold",
    "description": "Spotlight hero that puts one hero product center-stage under the lights.",
    "hero": "spotlight",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "IN THE SPOTLIGHT",
      "heroTitleTop": "This Is The One",
      "heroTitleBottom": "You'll Brag About",
      "heroSubtitle": "Meet the standout everyone's chasing — the piece that makes the rest of your cart jealous.",
      "ctaPrimaryLabel": "Grab The Star",
      "ctaSecondaryLabel": "See The Lineup",
      "categoriesTitle": "Steal The Show",
      "bestSellersTitle": "Fan Favorites",
      "newArrivalsTitle": "Now Trending"
    }
  },
  {
    "id": "bold-diagonal-rush",
    "name": "Diagonal Rush",
    "category": "bold",
    "description": "Slashing diagonal hero that gives the page instant forward momentum.",
    "hero": "diagonal",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "MOVE FAST",
      "heroTitleTop": "Don't Wait.",
      "heroTitleBottom": "Dominate.",
      "heroSubtitle": "The bold don't browse forever. Lock in the looks that win before the crowd catches on.",
      "ctaPrimaryLabel": "Move First",
      "ctaSecondaryLabel": "Catch The Deals",
      "categoriesTitle": "Pick A Direction",
      "bestSellersTitle": "Winning Right Now",
      "newArrivalsTitle": "Just Dropped"
    }
  },
  {
    "id": "bold-showcase-flex",
    "name": "Showcase Flex",
    "category": "bold",
    "description": "Multi-product showcase hero that flexes the full range up front.",
    "hero": "showcase",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "THE FULL LINEUP",
      "heroTitleTop": "So Much To Love,",
      "heroTitleBottom": "So Little Chill",
      "heroSubtitle": "A wall of wins, all in one place. Feast your eyes, then fill your cart — we won't judge.",
      "ctaPrimaryLabel": "Shop The Lineup",
      "ctaSecondaryLabel": "Browse By Category",
      "categoriesTitle": "Something For Everyone",
      "bestSellersTitle": "The Big Winners",
      "newArrivalsTitle": "Fresh Faces"
    }
  },
  {
    "id": "bold-gradient-blaze",
    "name": "Gradient Blaze",
    "category": "bold",
    "description": "Blazing gradient hero with punchy type and a conversion-first layout.",
    "hero": "gradient",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "FEEL THE HEAT",
      "heroTitleTop": "Shop Loud.",
      "heroTitleBottom": "Live Louder.",
      "heroSubtitle": "Colors that pop, deals that hit, and a vibe that refuses to blend in. Welcome to the bright side.",
      "ctaPrimaryLabel": "Light It Up",
      "ctaSecondaryLabel": "See The Deals",
      "categoriesTitle": "Turn It Up",
      "bestSellersTitle": "Blazing Best Sellers",
      "newArrivalsTitle": "Newly Lit"
    }
  },
  {
    "id": "bold-deal-machine",
    "name": "Deal Machine",
    "category": "bold",
    "description": "Promo-driven split hero that hammers savings and urgency from the top.",
    "hero": "split",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "PRICES SLASHED",
      "heroTitleTop": "Big Savings,",
      "heroTitleBottom": "Bigger Bragging Rights",
      "heroSubtitle": "Deals this loud don't last. Stack the savings, skip the regret, and check out like a champ.",
      "ctaPrimaryLabel": "Shop The Deals",
      "ctaSecondaryLabel": "Grab Before It's Gone",
      "categoriesTitle": "Save By Category",
      "bestSellersTitle": "Most-Grabbed Deals",
      "newArrivalsTitle": "New & On Sale"
    }
  },
  {
    "id": "bold-loud-proud",
    "name": "Loud & Proud",
    "category": "bold",
    "description": "Centered attitude-forward hero for brands that refuse to whisper.",
    "hero": "centered",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "OWN THE ROOM",
      "heroTitleTop": "Made For People",
      "heroTitleBottom": "Who Go First",
      "heroSubtitle": "This is where the confident come to shop. No apologies, no half measures, just full-send picks.",
      "ctaPrimaryLabel": "Claim Yours",
      "ctaSecondaryLabel": "Meet The Range",
      "categoriesTitle": "Choose Your Statement",
      "bestSellersTitle": "Bought By The Bold",
      "newArrivalsTitle": "The Latest Flex"
    }
  },
  {
    "id": "bold-hype-drop",
    "name": "Hype Drop",
    "category": "bold",
    "description": "Fullbleed countdown-energy hero engineered for limited releases and hype.",
    "hero": "fullbleed",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "LIMITED. LOUD. GONE FAST.",
      "heroTitleTop": "Blink And",
      "heroTitleBottom": "You'll Miss It",
      "heroSubtitle": "Limited runs, real hype, zero restocks. When it's gone, it's a story you tell — so don't sleep on it.",
      "ctaPrimaryLabel": "Cop It Now",
      "ctaSecondaryLabel": "See The Drop",
      "categoriesTitle": "Shop The Hype",
      "bestSellersTitle": "Selling Out Now",
      "newArrivalsTitle": "Freshest Drops"
    }
  },
  {
    "id": "bold-center-stage",
    "name": "Center Stage",
    "category": "bold",
    "description": "Spotlight hero framing your flagship product like the headline act.",
    "hero": "spotlight",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "TONIGHT'S HEADLINER",
      "heroTitleTop": "Step Up.",
      "heroTitleBottom": "Stand Out.",
      "heroSubtitle": "The showstopper that earns the double-takes. Put it in the cart before it becomes everyone's favorite.",
      "ctaPrimaryLabel": "Take The Stage",
      "ctaSecondaryLabel": "Explore More",
      "categoriesTitle": "Set The Scene",
      "bestSellersTitle": "Headline Acts",
      "newArrivalsTitle": "Encore Arrivals"
    }
  },
  {
    "id": "bold-fast-lane",
    "name": "Fast Lane",
    "category": "bold",
    "description": "Diagonal high-speed hero that pushes shoppers straight to checkout.",
    "hero": "diagonal",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "ZERO TO CART",
      "heroTitleTop": "Shop Quick.",
      "heroTitleBottom": "Win Big.",
      "heroSubtitle": "No detours, no dithering. Find it, grab it, flex it — the fast lane to stuff you'll actually love.",
      "ctaPrimaryLabel": "Hit The Gas",
      "ctaSecondaryLabel": "Quick Browse",
      "categoriesTitle": "Choose Your Route",
      "bestSellersTitle": "Fastest Sellers",
      "newArrivalsTitle": "Just Arrived"
    }
  },
  {
    "id": "bold-grid-slam",
    "name": "Grid Slam",
    "category": "bold",
    "description": "Showcase grid hero that slams a full wall of product in your face.",
    "hero": "showcase",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "ALL KILLER, NO FILLER",
      "heroTitleTop": "Too Good",
      "heroTitleBottom": "To Scroll Past",
      "heroSubtitle": "A packed grid of pure hits. Every tile a temptation, every click a step closer to your new favorite.",
      "ctaPrimaryLabel": "Shop It All",
      "ctaSecondaryLabel": "Filter By Category",
      "categoriesTitle": "Slam Into It",
      "bestSellersTitle": "Grid Toppers",
      "newArrivalsTitle": "Newest In The Grid"
    }
  },
  {
    "id": "bold-neon-nights",
    "name": "Neon Nights",
    "category": "bold",
    "description": "Gradient after-dark hero glowing with high-energy nightlife attitude.",
    "hero": "gradient",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "AFTER DARK EDIT",
      "heroTitleTop": "Glow Different.",
      "heroTitleBottom": "Shine Harder.",
      "heroSubtitle": "Turn the lights down and the volume up. Bold picks that hit their peak long after the sun goes home.",
      "ctaPrimaryLabel": "Shop The Night",
      "ctaSecondaryLabel": "See What Glows",
      "categoriesTitle": "Light Up Your Look",
      "bestSellersTitle": "Neon Best Sellers",
      "newArrivalsTitle": "Just Switched On"
    }
  },
  {
    "id": "bold-mega-banner",
    "name": "Mega Banner",
    "category": "bold",
    "description": "Fullbleed billboard hero sized like a highway sign you can't miss.",
    "hero": "fullbleed",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "SEEN FROM SPACE",
      "heroTitleTop": "Go Big",
      "heroTitleBottom": "Or Go Bigger",
      "heroSubtitle": "A headline the size of your ambitions. If it's worth doing, it's worth doing loud — starting now.",
      "ctaPrimaryLabel": "Shop Big",
      "ctaSecondaryLabel": "See Everything",
      "categoriesTitle": "Big Picks, Big Wins",
      "bestSellersTitle": "The Blockbusters",
      "newArrivalsTitle": "Just Unboxed"
    }
  },
  {
    "id": "bold-punchline",
    "name": "Punchline",
    "category": "bold",
    "description": "Centered one-two-punch hero that lands the message and the sale fast.",
    "hero": "centered",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "STRAIGHT SHOOTER",
      "heroTitleTop": "You Came To Shop.",
      "heroTitleBottom": "So Let's Shop.",
      "heroSubtitle": "No warm-up, no waffle. The good stuff is right here and it's ready when you are. Let's go.",
      "ctaPrimaryLabel": "Let's Go",
      "ctaSecondaryLabel": "Show Me More",
      "categoriesTitle": "Cut To The Chase",
      "bestSellersTitle": "Crowd Pleasers",
      "newArrivalsTitle": "Fresh Arrivals"
    }
  },
  {
    "id": "luxury-atelier",
    "name": "The Atelier",
    "category": "luxury",
    "description": "Craftsmanship-forward split hero celebrating the hand behind every piece.",
    "hero": "split",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Made by hand, kept for life",
      "heroTitleTop": "Where mastery",
      "heroTitleBottom": "becomes yours",
      "heroSubtitle": "Every piece is shaped slowly, deliberately, by artisans who sign their work. Discover objects worth keeping.",
      "ctaPrimaryLabel": "Explore the Atelier",
      "ctaSecondaryLabel": "Meet the Makers",
      "categoriesTitle": "Browse the Collections",
      "bestSellersTitle": "Signature Pieces",
      "newArrivalsTitle": "Newly Crafted"
    }
  },
  {
    "id": "luxury-noir",
    "name": "Noir",
    "category": "luxury",
    "description": "Dramatic full-bleed hero with dark, cinematic high-fashion energy.",
    "hero": "fullbleed",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "For those who arrive late and unforgettable",
      "heroTitleTop": "Dressed in",
      "heroTitleBottom": "quiet power",
      "heroSubtitle": "A collection made for the after-dark hours, when understatement speaks the loudest.",
      "ctaPrimaryLabel": "Enter the Collection",
      "ctaSecondaryLabel": "View Lookbook",
      "categoriesTitle": "Shop by Mood",
      "bestSellersTitle": "Most Coveted",
      "newArrivalsTitle": "Just Landed"
    }
  },
  {
    "id": "luxury-heritage",
    "name": "Heritage House",
    "category": "luxury",
    "description": "Centered hero rooted in legacy, tradition and timeless provenance.",
    "hero": "centered",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": false,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "A tradition of excellence since day one",
      "heroTitleTop": "Time-honored,",
      "heroTitleBottom": "never dated",
      "heroSubtitle": "Built on decades of devotion to detail. These are the pieces that outlast the seasons and the trends.",
      "ctaPrimaryLabel": "Discover Our Story",
      "ctaSecondaryLabel": "Shop the House",
      "categoriesTitle": "The Houses Within",
      "bestSellersTitle": "Enduring Favorites",
      "newArrivalsTitle": "This Season"
    }
  },
  {
    "id": "luxury-minimal-muse",
    "name": "Minimal Muse",
    "category": "luxury",
    "description": "Pared-back minimal hero embodying calm, quiet luxury and restraint.",
    "hero": "minimal",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Less, but only the finest",
      "heroTitleTop": "The beauty",
      "heroTitleBottom": "of enough",
      "heroSubtitle": "A curated edit for those who understand that true luxury whispers. Nothing excessive. Nothing missing.",
      "ctaPrimaryLabel": "Shop the Edit",
      "ctaSecondaryLabel": "Our Philosophy",
      "categoriesTitle": "Essentials",
      "bestSellersTitle": "Quiet Icons",
      "newArrivalsTitle": "Recently Added"
    }
  },
  {
    "id": "luxury-spotlight-edit",
    "name": "The Spotlight Edit",
    "category": "luxury",
    "description": "Spotlight hero framing a single hero piece as the star of a curated edit.",
    "hero": "spotlight",
    "sections": {
      "categories": false,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "One piece. All eyes.",
      "heroTitleTop": "The center",
      "heroTitleBottom": "of attention",
      "heroSubtitle": "This season we let a single object take the stage. Meticulously chosen, impossible to overlook.",
      "ctaPrimaryLabel": "See the Feature",
      "ctaSecondaryLabel": "Browse the Edit",
      "categoriesTitle": "Shop the Rest",
      "bestSellersTitle": "In the Spotlight",
      "newArrivalsTitle": "Fresh Arrivals"
    }
  },
  {
    "id": "luxury-gilded",
    "name": "Gilded",
    "category": "luxury",
    "description": "Opulent gradient hero radiating gold-touched glamour and indulgence.",
    "hero": "gradient",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Indulgence, perfected",
      "heroTitleTop": "Touched with",
      "heroTitleBottom": "a golden hour",
      "heroSubtitle": "Rich, radiant and unapologetically lavish. A collection that treats every day like an occasion.",
      "ctaPrimaryLabel": "Indulge Now",
      "ctaSecondaryLabel": "Explore Luxe",
      "categoriesTitle": "Curated Categories",
      "bestSellersTitle": "The Golden Standard",
      "newArrivalsTitle": "New & Radiant"
    }
  },
  {
    "id": "luxury-diagonal-vogue",
    "name": "Vogue Angle",
    "category": "luxury",
    "description": "Diagonal editorial hero with a bold, magazine-cover fashion attitude.",
    "hero": "diagonal",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Straight off the editorial page",
      "heroTitleTop": "Bold lines,",
      "heroTitleBottom": "sharper taste",
      "heroSubtitle": "Styled like a cover shoot and built for the front row. This is fashion with a point of view.",
      "ctaPrimaryLabel": "Shop the Story",
      "ctaSecondaryLabel": "Read the Feature",
      "categoriesTitle": "The Sections",
      "bestSellersTitle": "Editor's Picks",
      "newArrivalsTitle": "Hot Off the Runway"
    }
  },
  {
    "id": "luxury-showcase-gallery",
    "name": "The Gallery",
    "category": "luxury",
    "description": "Showcase hero presenting the range like curated works in a private gallery.",
    "hero": "showcase",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "An exhibition of the exceptional",
      "heroTitleTop": "Every piece,",
      "heroTitleBottom": "a work of art",
      "heroSubtitle": "Wander a gallery where each object earns its place. Considered, collected and worthy of admiration.",
      "ctaPrimaryLabel": "Tour the Gallery",
      "ctaSecondaryLabel": "View Collections",
      "categoriesTitle": "The Wings",
      "bestSellersTitle": "Most Admired",
      "newArrivalsTitle": "Newly Unveiled"
    }
  },
  {
    "id": "luxury-icon",
    "name": "Icon",
    "category": "luxury",
    "description": "Centered statement hero built around a single bold, iconic declaration.",
    "hero": "centered",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Some things are simply unmistakable",
      "heroTitleTop": "Become",
      "heroTitleBottom": "the statement",
      "heroSubtitle": "Designed to be recognized across a room and remembered long after. This is what iconic looks like.",
      "ctaPrimaryLabel": "Make It Yours",
      "ctaSecondaryLabel": "See Why",
      "categoriesTitle": "Shop by Icon",
      "bestSellersTitle": "The Icons",
      "newArrivalsTitle": "The Next Icon"
    }
  },
  {
    "id": "luxury-velvet",
    "name": "Velvet",
    "category": "luxury",
    "description": "Sensory full-bleed hero drenched in tactile, richly indulgent texture.",
    "hero": "fullbleed",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Luxury you can feel",
      "heroTitleTop": "Soft to touch,",
      "heroTitleBottom": "hard to forget",
      "heroSubtitle": "A collection built on texture and sensation, where every material was chosen to be experienced, not just seen.",
      "ctaPrimaryLabel": "Feel the Collection",
      "ctaSecondaryLabel": "Discover Textures",
      "categoriesTitle": "Explore by Feel",
      "bestSellersTitle": "The Most Loved",
      "newArrivalsTitle": "New Sensations"
    }
  },
  {
    "id": "luxury-concierge",
    "name": "The Concierge",
    "category": "luxury",
    "description": "Service-led split hero promising white-glove, personal attention throughout.",
    "hero": "split",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": false,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Attended to, every step of the way",
      "heroTitleTop": "Service worthy",
      "heroTitleBottom": "of the finest",
      "heroSubtitle": "From selection to your door, our concierge makes every moment effortless. Luxury is how it feels, not just what you buy.",
      "ctaPrimaryLabel": "Begin Your Experience",
      "ctaSecondaryLabel": "How It Works",
      "categoriesTitle": "Where to Begin",
      "bestSellersTitle": "Client Favorites",
      "newArrivalsTitle": "Just for You"
    }
  },
  {
    "id": "luxury-private-collection",
    "name": "Private Collection",
    "category": "luxury",
    "description": "Spotlight hero framing pieces as exclusive, members-only rarities.",
    "hero": "spotlight",
    "sections": {
      "categories": false,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "By invitation, for the discerning few",
      "heroTitleTop": "Reserved for",
      "heroTitleBottom": "those who know",
      "heroSubtitle": "A private selection of rare pieces, offered in limited number. Once they are gone, they are gone for good.",
      "ctaPrimaryLabel": "Request Access",
      "ctaSecondaryLabel": "View the Rarities",
      "categoriesTitle": "Inside the Vault",
      "bestSellersTitle": "Coveted & Rare",
      "newArrivalsTitle": "Latest Acquisitions"
    }
  },
  {
    "id": "luxury-bespoke",
    "name": "Bespoke",
    "category": "luxury",
    "description": "Split hero centered on made-to-order, personalized, one-of-one luxury.",
    "hero": "split",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Made to your measure, and yours alone",
      "heroTitleTop": "One of one,",
      "heroTitleBottom": "made for you",
      "heroSubtitle": "Choose, personalize and perfect. Every detail is yours to define, crafted to your exact desire.",
      "ctaPrimaryLabel": "Start Customizing",
      "ctaSecondaryLabel": "See the Process",
      "categoriesTitle": "Begin With a Base",
      "bestSellersTitle": "Most Personalized",
      "newArrivalsTitle": "New to Customize"
    }
  },
  {
    "id": "luxury-eclat",
    "name": "Éclat",
    "category": "luxury",
    "description": "Radiant gradient hero built on glamour, sparkle and celebratory shine.",
    "hero": "gradient",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "For moments meant to shine",
      "heroTitleTop": "Dazzle the",
      "heroTitleBottom": "entire room",
      "heroSubtitle": "Brilliant, luminous and made to be noticed. When the occasion calls for more, this is where you begin.",
      "ctaPrimaryLabel": "Shine Now",
      "ctaSecondaryLabel": "Explore the Glamour",
      "categoriesTitle": "Shop by Occasion",
      "bestSellersTitle": "Show-Stoppers",
      "newArrivalsTitle": "New & Luminous"
    }
  },
  {
    "id": "luxury-monogram",
    "name": "Monogram",
    "category": "luxury",
    "description": "Minimal hero built around a refined signature-and-initials sensibility.",
    "hero": "minimal",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": false,
      "recipes": false,
      "blog": true,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "A signature all your own",
      "heroTitleTop": "Marked by",
      "heroTitleBottom": "distinction",
      "heroSubtitle": "Understated pieces that carry a quiet signature. Refined for those who let their taste do the talking.",
      "ctaPrimaryLabel": "Shop the Signature",
      "ctaSecondaryLabel": "Our Codes",
      "categoriesTitle": "The Collections",
      "bestSellersTitle": "Signature Staples",
      "newArrivalsTitle": "Newest Marks"
    }
  },
  {
    "id": "luxury-riviera",
    "name": "Riviera",
    "category": "luxury",
    "description": "Showcase hero evoking jet-set escapism and effortless coastal glamour.",
    "hero": "showcase",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "An invitation to the good life",
      "heroTitleTop": "Live like the",
      "heroTitleBottom": "sun never sets",
      "heroSubtitle": "Effortless glamour for the well-traveled. A collection styled for long lunches, warm coasts and slower days.",
      "ctaPrimaryLabel": "Escape With Us",
      "ctaSecondaryLabel": "Shop the Lifestyle",
      "categoriesTitle": "Shop the Destinations",
      "bestSellersTitle": "Jet-Set Favorites",
      "newArrivalsTitle": "Fresh Off the Coast"
    }
  },
  {
    "id": "luxury-obsidian",
    "name": "Obsidian",
    "category": "luxury",
    "description": "Sleek diagonal hero with modern, architectural, dark-luxe minimalism.",
    "hero": "diagonal",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Modern luxury, sharpened",
      "heroTitleTop": "Precision meets",
      "heroTitleBottom": "pure desire",
      "heroSubtitle": "Clean geometry, deep finishes and zero compromise. Contemporary luxury for those who move forward.",
      "ctaPrimaryLabel": "Explore Obsidian",
      "ctaSecondaryLabel": "The Design Ethos",
      "categoriesTitle": "Navigate the Range",
      "bestSellersTitle": "Defining Pieces",
      "newArrivalsTitle": "Newest Releases"
    }
  },
  {
    "id": "playful-confetti-pop",
    "name": "Confetti Pop",
    "category": "playful",
    "description": "A bright, high-energy landing page that treats every scroll like a mini celebration.",
    "hero": "gradient",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Say hello to happy",
      "heroTitleTop": "Shopping just got",
      "heroTitleBottom": "a whole lot brighter",
      "heroSubtitle": "Handpicked goodies, feel-good prices, and a little confetti in every order. Come find your new favorite thing.",
      "ctaPrimaryLabel": "Start the fun",
      "ctaSecondaryLabel": "Peek inside",
      "categoriesTitle": "Pick your vibe",
      "bestSellersTitle": "Crowd favorites",
      "newArrivalsTitle": "Fresh drops incoming"
    }
  },
  {
    "id": "playful-side-by-side-smile",
    "name": "Side-by-Side Smile",
    "category": "playful",
    "description": "A friendly split hero pairing a big grin of a headline with a hero product shot.",
    "hero": "split",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Nice to meet you",
      "heroTitleTop": "Good stuff that",
      "heroTitleBottom": "makes you grin",
      "heroSubtitle": "We hunt down the fun, the useful, and the downright delightful so your day gets a little easier and a lot happier.",
      "ctaPrimaryLabel": "Shop the smiles",
      "ctaSecondaryLabel": "How it works",
      "categoriesTitle": "Browse by mood",
      "bestSellersTitle": "Everybody loves these",
      "newArrivalsTitle": "Just landed"
    }
  },
  {
    "id": "playful-center-stage",
    "name": "Center Stage",
    "category": "playful",
    "description": "A bold centered hero that puts one punchy promise front and center.",
    "hero": "centered",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Welcome to the good stuff",
      "heroTitleTop": "Everything you love,",
      "heroTitleBottom": "none of the boring",
      "heroSubtitle": "Curated finds with big personality and zero fuss. Scroll a little, smile a lot, and grab something great.",
      "ctaPrimaryLabel": "Let's go",
      "ctaSecondaryLabel": "Browse all",
      "categoriesTitle": "Where to next?",
      "bestSellersTitle": "Fan favorites",
      "newArrivalsTitle": "Hot off the shelf"
    }
  },
  {
    "id": "playful-toybox-showcase",
    "name": "Toybox Showcase",
    "category": "playful",
    "description": "A showcase hero that spills out a colorful grid of goodies like a treasure chest.",
    "hero": "showcase",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Open the toybox",
      "heroTitleTop": "So many good things,",
      "heroTitleBottom": "so little scrolling",
      "heroSubtitle": "A colorful lineup of bestsellers and brand-new finds, all in one happy place. Go ahead, dig in.",
      "ctaPrimaryLabel": "Explore it all",
      "ctaSecondaryLabel": "See what's new",
      "categoriesTitle": "Take your pick",
      "bestSellersTitle": "Tried, tested, adored",
      "newArrivalsTitle": "Shiny and new"
    }
  },
  {
    "id": "playful-spotlight-star",
    "name": "Spotlight Star",
    "category": "playful",
    "description": "A spotlight hero that shines on one must-have hero product with a wink.",
    "hero": "spotlight",
    "sections": {
      "categories": false,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Drumroll, please",
      "heroTitleTop": "Meet the one",
      "heroTitleBottom": "everyone's talking about",
      "heroSubtitle": "This month's little obsession is here and it's every bit as good as your feed promised. Snag yours before it's gone.",
      "ctaPrimaryLabel": "Grab the star",
      "ctaSecondaryLabel": "See more picks",
      "categoriesTitle": "Explore the lineup",
      "bestSellersTitle": "Repeat offenders",
      "newArrivalsTitle": "Next big things"
    }
  },
  {
    "id": "playful-zigzag-jam",
    "name": "Zigzag Jam",
    "category": "playful",
    "description": "A diagonal hero with playful angles and an upbeat, no-rules energy.",
    "hero": "diagonal",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Color outside the lines",
      "heroTitleTop": "Rules are boring,",
      "heroTitleBottom": "great finds aren't",
      "heroSubtitle": "Bold picks for people who like a little zig with their zag. Shop the stuff that actually makes you feel something.",
      "ctaPrimaryLabel": "Jump in",
      "ctaSecondaryLabel": "How it works",
      "categoriesTitle": "Choose your adventure",
      "bestSellersTitle": "The greatest hits",
      "newArrivalsTitle": "Just dropped"
    }
  },
  {
    "id": "playful-big-splash",
    "name": "Big Splash",
    "category": "playful",
    "description": "A fullbleed hero that goes all-in with one giant, cheerful statement image.",
    "hero": "fullbleed",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Go big or go home",
      "heroTitleTop": "Make a little",
      "heroTitleBottom": "everyday splash",
      "heroSubtitle": "Turn ordinary days into something worth talking about with finds that bring the color, the joy, and the wow.",
      "ctaPrimaryLabel": "Dive in",
      "ctaSecondaryLabel": "Take a look",
      "categoriesTitle": "Find your favorite corner",
      "bestSellersTitle": "Making waves",
      "newArrivalsTitle": "Freshly stocked"
    }
  },
  {
    "id": "playful-keep-it-cute",
    "name": "Keep It Cute",
    "category": "playful",
    "description": "A clean minimal hero with a soft, cheeky voice and lots of breathing room.",
    "hero": "minimal",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Simple, but make it fun",
      "heroTitleTop": "Less clutter,",
      "heroTitleBottom": "more happy",
      "heroSubtitle": "A tidy little collection of things we genuinely love. No overwhelm, just the good stuff, ready when you are.",
      "ctaPrimaryLabel": "Shop the edit",
      "ctaSecondaryLabel": "Learn more",
      "categoriesTitle": "A few good places to start",
      "bestSellersTitle": "The reliably great ones",
      "newArrivalsTitle": "New this week"
    }
  },
  {
    "id": "playful-sunshine-gradient",
    "name": "Sunshine Gradient",
    "category": "playful",
    "description": "A warm gradient hero radiating good-morning, good-mood energy.",
    "hero": "gradient",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Rise and shine",
      "heroTitleTop": "A little sunshine,",
      "heroTitleBottom": "delivered daily",
      "heroSubtitle": "Bright, cheerful finds that put a spring in your step from the first click to the doorstep. Ready for a good day?",
      "ctaPrimaryLabel": "Brighten my day",
      "ctaSecondaryLabel": "See the perks",
      "categoriesTitle": "Sunny spots to explore",
      "bestSellersTitle": "Warm and well-loved",
      "newArrivalsTitle": "New under the sun"
    }
  },
  {
    "id": "playful-buddy-split",
    "name": "Buddy Split",
    "category": "playful",
    "description": "A split hero that talks to you like a best friend hyping up your cart.",
    "hero": "split",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Psst, over here",
      "heroTitleTop": "Trust us,",
      "heroTitleBottom": "you'll want this",
      "heroSubtitle": "We're basically the friend who always knows the good stuff. Consider this your very reliable, very fun recommendation.",
      "ctaPrimaryLabel": "Show me the goods",
      "ctaSecondaryLabel": "Why we love it",
      "categoriesTitle": "Stuff for every kind of day",
      "bestSellersTitle": "You asked, they delivered",
      "newArrivalsTitle": "Sneak peek: new arrivals"
    }
  },
  {
    "id": "playful-happy-place",
    "name": "Happy Place",
    "category": "playful",
    "description": "A centered hero framed as a cozy, welcoming corner of the internet.",
    "hero": "centered",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "You made it",
      "heroTitleTop": "Welcome to your",
      "heroTitleBottom": "new happy place",
      "heroSubtitle": "Kick back and browse a friendly little world of finds picked to make everyday life a bit more delightful.",
      "ctaPrimaryLabel": "Look around",
      "ctaSecondaryLabel": "Our story",
      "categoriesTitle": "Cozy corners to browse",
      "bestSellersTitle": "Reader, they loved it",
      "newArrivalsTitle": "Fresh faces"
    }
  },
  {
    "id": "playful-grab-bag",
    "name": "Grab Bag",
    "category": "playful",
    "description": "A showcase hero bursting with surprise-and-delight variety for browsers.",
    "hero": "showcase",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "A little bit of everything",
      "heroTitleTop": "You never know",
      "heroTitleBottom": "what you'll find",
      "heroSubtitle": "Half the fun is the hunt. Scroll through a happy jumble of favorites and surprises and see what catches your eye.",
      "ctaPrimaryLabel": "Start digging",
      "ctaSecondaryLabel": "Surprise me",
      "categoriesTitle": "Wander in",
      "bestSellersTitle": "Crowd-pleasers",
      "newArrivalsTitle": "Newly unpacked"
    }
  },
  {
    "id": "playful-main-character",
    "name": "Main Character",
    "category": "playful",
    "description": "A spotlight hero that makes the shopper the star of their own story.",
    "hero": "spotlight",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "This is your moment",
      "heroTitleTop": "Time to be the",
      "heroTitleBottom": "main character",
      "heroSubtitle": "Treat yourself to finds with main-character energy. Bold, joyful, and made for people who show up as themselves.",
      "ctaPrimaryLabel": "Own it",
      "ctaSecondaryLabel": "Get inspired",
      "categoriesTitle": "Set the scene",
      "bestSellersTitle": "Scene-stealers",
      "newArrivalsTitle": "New in the spotlight"
    }
  },
  {
    "id": "playful-slantastic",
    "name": "Slantastic",
    "category": "playful",
    "description": "A diagonal hero with kinetic, deal-forward energy for bargain lovers.",
    "hero": "diagonal",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Deals that dance",
      "heroTitleTop": "Great finds,",
      "heroTitleBottom": "greater prices",
      "heroSubtitle": "The joy of a fun product and a happy wallet, all at once. Grab your favorites before the good deals bounce away.",
      "ctaPrimaryLabel": "Snag a deal",
      "ctaSecondaryLabel": "See the sale",
      "categoriesTitle": "Deal-hunting starts here",
      "bestSellersTitle": "Flying off the shelves",
      "newArrivalsTitle": "New and on sale"
    }
  },
  {
    "id": "playful-wonderwall",
    "name": "Wonderwall",
    "category": "playful",
    "description": "A fullbleed hero that immerses shoppers in one dreamy, wonder-filled scene.",
    "hero": "fullbleed",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Keep the wonder",
      "heroTitleTop": "Little things that",
      "heroTitleBottom": "spark big joy",
      "heroSubtitle": "Step into a world of finds made to surprise, delight, and remind you that shopping can actually be fun.",
      "ctaPrimaryLabel": "Enter the fun",
      "ctaSecondaryLabel": "How it works",
      "categoriesTitle": "Rooms full of wonder",
      "bestSellersTitle": "Wonderfully popular",
      "newArrivalsTitle": "Newest wonders"
    }
  },
  {
    "id": "playful-tiny-treats",
    "name": "Tiny Treats",
    "category": "playful",
    "description": "A minimal hero with a sweet, low-key voice for small feel-good buys.",
    "hero": "minimal",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "You deserve it",
      "heroTitleTop": "Little treats,",
      "heroTitleBottom": "big happy",
      "heroSubtitle": "Small, joyful pick-me-ups that fit any budget and any day. Because sometimes a tiny treat is exactly the move.",
      "ctaPrimaryLabel": "Treat yourself",
      "ctaSecondaryLabel": "Browse the treats",
      "categoriesTitle": "Little joys, sorted",
      "bestSellersTitle": "Most-loved little things",
      "newArrivalsTitle": "Fresh treats"
    }
  },
  {
    "id": "playful-rainbow-rush",
    "name": "Rainbow Rush",
    "category": "playful",
    "description": "A vivid gradient hero with an energetic, get-it-while-it's-hot buzz.",
    "hero": "gradient",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Blink and you'll miss it",
      "heroTitleTop": "Chase the",
      "heroTitleBottom": "good stuff",
      "heroSubtitle": "New favorites drop fast and fly out faster. Ride the rainbow, fill your cart, and catch the joy while it's here.",
      "ctaPrimaryLabel": "Catch it now",
      "ctaSecondaryLabel": "What's trending",
      "categoriesTitle": "Follow the fun",
      "bestSellersTitle": "Selling out quick",
      "newArrivalsTitle": "Just arrived"
    }
  },
  {
    "id": "corporate-enterprise-edge",
    "name": "Enterprise Edge",
    "category": "corporate",
    "description": "Split hero for scale-first brands selling reliability to large organizations.",
    "hero": "split",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Built for the enterprise",
      "heroTitleTop": "Everything your organization needs,",
      "heroTitleBottom": "engineered to scale",
      "heroSubtitle": "Deploy with confidence across teams, regions, and volumes. Proven performance, transparent pricing, and support that shows up when it counts.",
      "ctaPrimaryLabel": "Request a Demo",
      "ctaSecondaryLabel": "Talk to Sales",
      "categoriesTitle": "Solutions by Department",
      "bestSellersTitle": "Most Deployed",
      "newArrivalsTitle": "Latest Releases"
    }
  },
  {
    "id": "corporate-trust-first",
    "name": "Trust First",
    "category": "corporate",
    "description": "Centered hero that leads with credibility, proof, and dependability.",
    "hero": "centered",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": false,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Trusted by teams worldwide",
      "heroTitleTop": "The dependable choice",
      "heroTitleBottom": "for serious business",
      "heroSubtitle": "Thousands of professionals rely on us every day. Consistent quality, verified results, and a track record you can stand behind.",
      "ctaPrimaryLabel": "Get Started",
      "ctaSecondaryLabel": "See the Proof",
      "categoriesTitle": "Explore by Need",
      "bestSellersTitle": "Customer Favorites",
      "newArrivalsTitle": "Just Added"
    }
  },
  {
    "id": "corporate-spec-sheet",
    "name": "Spec Sheet",
    "category": "corporate",
    "description": "Minimal hero for spec-driven buyers who want facts, not fluff.",
    "hero": "minimal",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Precision-built",
      "heroTitleTop": "The details that",
      "heroTitleBottom": "define quality",
      "heroSubtitle": "Every specification measured, documented, and delivered exactly as promised. No surprises, no compromises.",
      "ctaPrimaryLabel": "View Specifications",
      "ctaSecondaryLabel": "Download Datasheet",
      "categoriesTitle": "Browse by Category",
      "bestSellersTitle": "Top Rated",
      "newArrivalsTitle": "New This Quarter"
    }
  },
  {
    "id": "corporate-growth-engine",
    "name": "Growth Engine",
    "category": "corporate",
    "description": "Gradient hero built around ROI, outcomes, and measurable results.",
    "hero": "gradient",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Results that compound",
      "heroTitleTop": "Turn every investment",
      "heroTitleBottom": "into measurable growth",
      "heroSubtitle": "Solutions designed to move the numbers that matter. Track the impact, prove the value, and keep momentum on your side.",
      "ctaPrimaryLabel": "Start Growing",
      "ctaSecondaryLabel": "See the Numbers",
      "categoriesTitle": "Ways to Grow",
      "bestSellersTitle": "Proven Performers",
      "newArrivalsTitle": "Fresh Opportunities"
    }
  },
  {
    "id": "corporate-boardroom",
    "name": "Boardroom",
    "category": "corporate",
    "description": "Showcase hero with an executive, premium tone for decision-makers.",
    "hero": "showcase",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": false
    },
    "copy": {
      "heroEyebrow": "For those who set the standard",
      "heroTitleTop": "Excellence,",
      "heroTitleBottom": "without exception",
      "heroSubtitle": "Curated for leaders who expect more. Refined, considered, and made to represent the very best of what your business stands for.",
      "ctaPrimaryLabel": "Explore the Collection",
      "ctaSecondaryLabel": "Book a Consultation",
      "categoriesTitle": "Curated Selections",
      "bestSellersTitle": "The Signature Line",
      "newArrivalsTitle": "Newly Curated"
    }
  },
  {
    "id": "corporate-blueprint",
    "name": "Blueprint",
    "category": "corporate",
    "description": "Diagonal hero emphasizing methodology, process, and repeatable outcomes.",
    "hero": "diagonal",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": false,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "A proven framework",
      "heroTitleTop": "A smarter way",
      "heroTitleBottom": "to get it done",
      "heroSubtitle": "Follow a process refined over thousands of engagements. Structured, transparent, and repeatable from first step to final delivery.",
      "ctaPrimaryLabel": "See How It Works",
      "ctaSecondaryLabel": "Read the Playbook",
      "categoriesTitle": "Where to Begin",
      "bestSellersTitle": "Field-Tested Picks",
      "newArrivalsTitle": "Recently Introduced"
    }
  },
  {
    "id": "corporate-signal",
    "name": "Signal",
    "category": "corporate",
    "description": "Spotlight hero for data-forward, insight-driven positioning.",
    "hero": "spotlight",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": false,
      "recipes": false,
      "blog": true,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Clarity from complexity",
      "heroTitleTop": "See what matters,",
      "heroTitleBottom": "act with certainty",
      "heroSubtitle": "Cut through the noise with insight you can trust. Real data, clear signals, and the confidence to make your next move.",
      "ctaPrimaryLabel": "Get Insights",
      "ctaSecondaryLabel": "Explore the Data",
      "categoriesTitle": "Insight Areas",
      "bestSellersTitle": "Most Trusted",
      "newArrivalsTitle": "Latest Additions"
    }
  },
  {
    "id": "corporate-momentum",
    "name": "Momentum",
    "category": "corporate",
    "description": "Fullbleed hero centered on performance and forward motion.",
    "hero": "fullbleed",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Keep moving forward",
      "heroTitleTop": "Performance that",
      "heroTitleBottom": "keeps you ahead",
      "heroSubtitle": "Built to help you do more, faster, with fewer setbacks. When the pace picks up, we help you keep it.",
      "ctaPrimaryLabel": "Get Moving",
      "ctaSecondaryLabel": "See Performance",
      "categoriesTitle": "Find Your Fit",
      "bestSellersTitle": "Top Performers",
      "newArrivalsTitle": "Now Available"
    }
  },
  {
    "id": "corporate-clarity",
    "name": "Clarity",
    "category": "corporate",
    "description": "Minimal hero for brands that win on simplicity and focus.",
    "hero": "minimal",
    "sections": {
      "categories": false,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": false,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Simplicity by design",
      "heroTitleTop": "Less complexity,",
      "heroTitleBottom": "more done",
      "heroSubtitle": "We strip away the unnecessary so you can focus on what actually moves your business forward. Clear, direct, effective.",
      "ctaPrimaryLabel": "Get Started",
      "ctaSecondaryLabel": "Learn More",
      "categoriesTitle": "Browse Solutions",
      "bestSellersTitle": "Essentials",
      "newArrivalsTitle": "Newest"
    }
  },
  {
    "id": "corporate-vanguard",
    "name": "Vanguard",
    "category": "corporate",
    "description": "Split hero for innovation leaders defining what comes next.",
    "hero": "split",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Ahead of the curve",
      "heroTitleTop": "Lead the change,",
      "heroTitleBottom": "don't chase it",
      "heroSubtitle": "For organizations that refuse to stand still. Forward-thinking solutions that put you first to market and first to matter.",
      "ctaPrimaryLabel": "Lead the Way",
      "ctaSecondaryLabel": "Explore Innovation",
      "categoriesTitle": "Innovation Areas",
      "bestSellersTitle": "Category Leaders",
      "newArrivalsTitle": "What's Next"
    }
  },
  {
    "id": "corporate-backbone",
    "name": "Backbone",
    "category": "corporate",
    "description": "Centered hero for infrastructure-grade dependability and uptime.",
    "hero": "centered",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": false,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "The foundation you build on",
      "heroTitleTop": "Rock-solid,",
      "heroTitleBottom": "always on",
      "heroSubtitle": "Infrastructure-grade reliability your business can lean on around the clock. When everything depends on it, depend on us.",
      "ctaPrimaryLabel": "Build With Us",
      "ctaSecondaryLabel": "View Reliability",
      "categoriesTitle": "Core Capabilities",
      "bestSellersTitle": "Most Relied On",
      "newArrivalsTitle": "Recently Launched"
    }
  },
  {
    "id": "corporate-scale-up",
    "name": "Scale Up",
    "category": "corporate",
    "description": "Gradient hero speaking to fast-growing teams that need to scale cleanly.",
    "hero": "gradient",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Grow without limits",
      "heroTitleTop": "Ready when you are,",
      "heroTitleBottom": "ready for what's next",
      "heroSubtitle": "Start small, scale fast, and never outgrow your setup. Flexible by design, so growth is never held back by your foundation.",
      "ctaPrimaryLabel": "Scale With Us",
      "ctaSecondaryLabel": "Compare Plans",
      "categoriesTitle": "Solutions by Stage",
      "bestSellersTitle": "Team Favorites",
      "newArrivalsTitle": "New for Growing Teams"
    }
  },
  {
    "id": "corporate-precision",
    "name": "Precision",
    "category": "corporate",
    "description": "Spotlight hero highlighting exacting quality and craftsmanship.",
    "hero": "spotlight",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": false
    },
    "copy": {
      "heroEyebrow": "Made to exacting standards",
      "heroTitleTop": "Precision in every",
      "heroTitleBottom": "single detail",
      "heroSubtitle": "Tolerances measured in fractions, quality checked at every step. When precision is non-negotiable, this is where you turn.",
      "ctaPrimaryLabel": "See the Craft",
      "ctaSecondaryLabel": "Quality Standards",
      "categoriesTitle": "Shop by Application",
      "bestSellersTitle": "Precision Picks",
      "newArrivalsTitle": "Latest Engineering"
    }
  },
  {
    "id": "corporate-partner",
    "name": "The Partner",
    "category": "corporate",
    "description": "Showcase hero built around long-term partnership and service.",
    "hero": "showcase",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": false,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "More than a vendor",
      "heroTitleTop": "A partner invested",
      "heroTitleBottom": "in your success",
      "heroSubtitle": "We measure our success by yours. Dedicated support, honest advice, and a relationship built to last well beyond the sale.",
      "ctaPrimaryLabel": "Partner With Us",
      "ctaSecondaryLabel": "Meet the Team",
      "categoriesTitle": "How We Help",
      "bestSellersTitle": "Client Favorites",
      "newArrivalsTitle": "Newly Available"
    }
  },
  {
    "id": "corporate-velocity",
    "name": "Velocity",
    "category": "corporate",
    "description": "Diagonal hero for speed, efficiency, and streamlined delivery.",
    "hero": "diagonal",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Speed without shortcuts",
      "heroTitleTop": "Move faster,",
      "heroTitleBottom": "waste nothing",
      "heroSubtitle": "Streamlined from end to end so your team ships sooner and spends less doing it. Efficiency you can feel from day one.",
      "ctaPrimaryLabel": "Get Started Fast",
      "ctaSecondaryLabel": "See Time Saved",
      "categoriesTitle": "Streamline by Area",
      "bestSellersTitle": "Fast Movers",
      "newArrivalsTitle": "Just Shipped"
    }
  },
  {
    "id": "corporate-summit",
    "name": "Summit",
    "category": "corporate",
    "description": "Fullbleed hero with an aspirational, market-leadership tone.",
    "hero": "fullbleed",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Reach higher",
      "heroTitleTop": "Set the standard",
      "heroTitleBottom": "your industry follows",
      "heroSubtitle": "For ambitious organizations aiming for the top. Everything you need to outperform, outlast, and lead your market.",
      "ctaPrimaryLabel": "Rise to the Top",
      "ctaSecondaryLabel": "Why We Lead",
      "categoriesTitle": "Paths to the Top",
      "bestSellersTitle": "Market Leaders",
      "newArrivalsTitle": "New at the Peak"
    }
  },
  {
    "id": "corporate-ledger",
    "name": "The Ledger",
    "category": "corporate",
    "description": "Split hero for compliance, security, and governance-minded buyers.",
    "hero": "split",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": false,
      "masala": false,
      "promos": false,
      "newArrivals": false,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Secure. Compliant. Accountable.",
      "heroTitleTop": "Governance you",
      "heroTitleBottom": "can account for",
      "heroSubtitle": "Enterprise-grade security and compliance built in from the ground up. Full transparency, complete audit trails, zero guesswork.",
      "ctaPrimaryLabel": "Request Access",
      "ctaSecondaryLabel": "View Compliance",
      "categoriesTitle": "Controls by Function",
      "bestSellersTitle": "Trusted Standards",
      "newArrivalsTitle": "Latest Certifications"
    }
  },
  {
    "id": "warm-artisan-atelier",
    "name": "Artisan Atelier",
    "category": "warm",
    "description": "A maker-forward split layout that celebrates small-batch, handcrafted goods.",
    "hero": "split",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Handmade in small batches",
      "heroTitleTop": "Crafted by hand,",
      "heroTitleBottom": "made to last",
      "heroSubtitle": "Every piece begins at a workbench, not a factory line. Discover objects shaped slowly, with care you can feel.",
      "ctaPrimaryLabel": "Shop the collection",
      "ctaSecondaryLabel": "Meet the makers",
      "categoriesTitle": "Browse by craft",
      "bestSellersTitle": "Loved by hand, chosen by many",
      "newArrivalsTitle": "Fresh off the workbench"
    }
  },
  {
    "id": "warm-harvest-table",
    "name": "Harvest Table",
    "category": "warm",
    "description": "A centered, seasonal layout for farm-to-table food with recipes and pantry flavor.",
    "hero": "centered",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": true,
      "promos": true,
      "newArrivals": true,
      "recipes": true,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Straight from the soil",
      "heroTitleTop": "Real food,",
      "heroTitleBottom": "grown with love",
      "heroSubtitle": "Seasonal, honest, and full of flavor. We bring the farmer's harvest to your table at its ripest.",
      "ctaPrimaryLabel": "Fill your basket",
      "ctaSecondaryLabel": "Explore the harvest",
      "categoriesTitle": "Shop the season",
      "bestSellersTitle": "Farmhouse favorites",
      "newArrivalsTitle": "Just harvested"
    }
  },
  {
    "id": "warm-pure-ritual",
    "name": "Pure Ritual",
    "category": "warm",
    "description": "A calm spotlight layout for wellness and gentle everyday self-care.",
    "hero": "spotlight",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Everyday wellness",
      "heroTitleTop": "Slow down,",
      "heroTitleBottom": "feel restored",
      "heroSubtitle": "Gentle rituals for body and mind, made from ingredients you can trust and moments worth savoring.",
      "ctaPrimaryLabel": "Begin your ritual",
      "ctaSecondaryLabel": "Learn the practice",
      "categoriesTitle": "Find your ritual",
      "bestSellersTitle": "Most cherished",
      "newArrivalsTitle": "New to the ritual"
    }
  },
  {
    "id": "warm-hearth-home",
    "name": "Hearth & Home",
    "category": "warm",
    "description": "A full-bleed, cozy layout for warm home goods and hygge living.",
    "hero": "fullbleed",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Comfort for every corner",
      "heroTitleTop": "Make room",
      "heroTitleBottom": "for cozy",
      "heroSubtitle": "Soft textures, warm tones, and pieces that turn a house into a home you never want to leave.",
      "ctaPrimaryLabel": "Warm up your space",
      "ctaSecondaryLabel": "Browse the look",
      "categoriesTitle": "Shop by room",
      "bestSellersTitle": "Home favorites",
      "newArrivalsTitle": "Just arrived home"
    }
  },
  {
    "id": "warm-slow-living",
    "name": "Slow Living",
    "category": "warm",
    "description": "A pared-back minimal layout for intentional, essentials-only shopping.",
    "hero": "minimal",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": false,
      "recipes": false,
      "blog": false,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Less, but better",
      "heroTitleTop": "Live simply,",
      "heroTitleBottom": "choose intentionally",
      "heroSubtitle": "A quiet edit of essentials made to be kept, not replaced. Everything you need and nothing you don't.",
      "ctaPrimaryLabel": "Shop essentials",
      "ctaSecondaryLabel": "Our philosophy",
      "categoriesTitle": "The essentials",
      "bestSellersTitle": "Quietly popular",
      "newArrivalsTitle": "Recently added"
    }
  },
  {
    "id": "warm-village-market",
    "name": "Village Market",
    "category": "warm",
    "description": "A lively showcase layout for community makers and local goods.",
    "hero": "showcase",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "From our community to yours",
      "heroTitleTop": "Shop small,",
      "heroTitleBottom": "live large",
      "heroSubtitle": "A gathering of independent makers and local goods, all under one warm and welcoming roof.",
      "ctaPrimaryLabel": "Explore the market",
      "ctaSecondaryLabel": "Meet our makers",
      "categoriesTitle": "Wander the stalls",
      "bestSellersTitle": "Market favorites",
      "newArrivalsTitle": "New at the market"
    }
  },
  {
    "id": "warm-golden-harvest",
    "name": "Golden Harvest",
    "category": "warm",
    "description": "A gradient layout radiating seasonal abundance and thoughtful gifting.",
    "hero": "gradient",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Gifts worth giving",
      "heroTitleTop": "Season of",
      "heroTitleBottom": "warmth & giving",
      "heroSubtitle": "Thoughtfully curated treasures wrapped in warmth, ready to make someone's day a little brighter.",
      "ctaPrimaryLabel": "Find the perfect gift",
      "ctaSecondaryLabel": "Shop gift sets",
      "categoriesTitle": "Gifts for everyone",
      "bestSellersTitle": "Most gifted",
      "newArrivalsTitle": "New this season"
    }
  },
  {
    "id": "warm-botanica",
    "name": "Botanica",
    "category": "warm",
    "description": "A diagonal layout rooted in plant-based, botanical natural care.",
    "hero": "diagonal",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Rooted in nature",
      "heroTitleTop": "Powered by",
      "heroTitleBottom": "plants, purely",
      "heroSubtitle": "Botanical formulas that let nature do the work. Clean, kind, and grown from the ground up.",
      "ctaPrimaryLabel": "Discover botanicals",
      "ctaSecondaryLabel": "See the ingredients",
      "categoriesTitle": "Shop by botanical",
      "bestSellersTitle": "Garden favorites",
      "newArrivalsTitle": "Freshly grown"
    }
  },
  {
    "id": "warm-pantry-comfort",
    "name": "The Pantry",
    "category": "warm",
    "description": "A split layout for wholesome pantry staples, spices, and comfort food.",
    "hero": "split",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": true,
      "promos": true,
      "newArrivals": true,
      "recipes": true,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Stock the good stuff",
      "heroTitleTop": "A pantry full",
      "heroTitleBottom": "of comfort",
      "heroSubtitle": "Wholesome staples and small-batch flavors that turn everyday cooking into something to look forward to.",
      "ctaPrimaryLabel": "Stock up now",
      "ctaSecondaryLabel": "Browse the pantry",
      "categoriesTitle": "Fill your pantry",
      "bestSellersTitle": "Kitchen staples",
      "newArrivalsTitle": "New on the shelf"
    }
  },
  {
    "id": "warm-heritage-craft",
    "name": "Heritage & Craft",
    "category": "warm",
    "description": "A centered layout honoring timeless traditions and generational craftsmanship.",
    "hero": "centered",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Traditions worth keeping",
      "heroTitleTop": "Timeless craft,",
      "heroTitleBottom": "passed down",
      "heroSubtitle": "Techniques honed over generations, brought to life in pieces made to be treasured and handed on.",
      "ctaPrimaryLabel": "Explore the heritage",
      "ctaSecondaryLabel": "Our story",
      "categoriesTitle": "Browse traditions",
      "bestSellersTitle": "Timeless favorites",
      "newArrivalsTitle": "Newly crafted"
    }
  },
  {
    "id": "warm-earth-kind",
    "name": "Earth Kind",
    "category": "warm",
    "description": "A minimal layout for sustainable, eco-conscious goods that tread lightly.",
    "hero": "minimal",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": false,
      "recipes": false,
      "blog": true,
      "testimonials": false,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Better for the planet",
      "heroTitleTop": "Kind to you,",
      "heroTitleBottom": "kinder to earth",
      "heroSubtitle": "Consciously made, responsibly sourced, and designed to tread lightly. Good choices, made easy.",
      "ctaPrimaryLabel": "Shop consciously",
      "ctaSecondaryLabel": "Our promise",
      "categoriesTitle": "Shop sustainably",
      "bestSellersTitle": "Conscious favorites",
      "newArrivalsTitle": "New & responsible"
    }
  },
  {
    "id": "warm-daily-bread",
    "name": "Daily Bread",
    "category": "warm",
    "description": "A showcase layout for a fresh bakery and café with recipes and daily bakes.",
    "hero": "showcase",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": true,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Baked fresh daily",
      "heroTitleTop": "Warm from",
      "heroTitleBottom": "the oven",
      "heroSubtitle": "The simple joy of something freshly made. Golden crusts, honest ingredients, and the smell of home.",
      "ctaPrimaryLabel": "Order fresh",
      "ctaSecondaryLabel": "See today's bakes",
      "categoriesTitle": "From the bakery",
      "bestSellersTitle": "Freshly loved",
      "newArrivalsTitle": "Out of the oven"
    }
  },
  {
    "id": "warm-ember-glow",
    "name": "Ember & Glow",
    "category": "warm",
    "description": "A spotlight layout for hand-poured candles and cozy aromatherapy.",
    "hero": "spotlight",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Hand-poured, small batch",
      "heroTitleTop": "Set the mood,",
      "heroTitleBottom": "light the glow",
      "heroSubtitle": "Warm scents and soft light to turn any evening into a moment. Poured slowly, savored fully.",
      "ctaPrimaryLabel": "Shop the glow",
      "ctaSecondaryLabel": "Explore scents",
      "categoriesTitle": "Shop by scent",
      "bestSellersTitle": "Best-loved scents",
      "newArrivalsTitle": "Newly poured"
    }
  },
  {
    "id": "warm-natural-thread",
    "name": "Natural Thread",
    "category": "warm",
    "description": "A full-bleed layout for earthy fashion woven from natural fibers.",
    "hero": "fullbleed",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Woven from nature",
      "heroTitleTop": "Softness",
      "heroTitleBottom": "that lasts",
      "heroSubtitle": "Natural fibers and earthy tones, made to move with you and worn for years, not just for one season.",
      "ctaPrimaryLabel": "Shop the collection",
      "ctaSecondaryLabel": "Feel the fabric",
      "categoriesTitle": "Shop by fabric",
      "bestSellersTitle": "Wardrobe favorites",
      "newArrivalsTitle": "Newly woven"
    }
  },
  {
    "id": "warm-gather-gift",
    "name": "Gather & Gift",
    "category": "warm",
    "description": "A gradient layout for curated gift bundles made to be shared.",
    "hero": "gradient",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": false,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Thoughtfully bundled",
      "heroTitleTop": "Made to",
      "heroTitleBottom": "be shared",
      "heroSubtitle": "Curated bundles of little joys, wrapped and ready. Because the best things are meant to be given.",
      "ctaPrimaryLabel": "Shop gift bundles",
      "ctaSecondaryLabel": "Build your own",
      "categoriesTitle": "Gifts by occasion",
      "bestSellersTitle": "Crowd-pleasers",
      "newArrivalsTitle": "New bundles"
    }
  },
  {
    "id": "warm-clean-glow",
    "name": "Clean Glow",
    "category": "warm",
    "description": "A diagonal layout for clean, nourishing beauty with nothing to hide.",
    "hero": "diagonal",
    "sections": {
      "categories": true,
      "howItWorks": true,
      "bestSellers": true,
      "masala": false,
      "promos": false,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Clean, honest beauty",
      "heroTitleTop": "Nourish your",
      "heroTitleBottom": "natural glow",
      "heroSubtitle": "Skin-loving ingredients and nothing to hide. Beauty that feels as good as it looks, every single day.",
      "ctaPrimaryLabel": "Start glowing",
      "ctaSecondaryLabel": "What's inside",
      "categoriesTitle": "Shop by need",
      "bestSellersTitle": "Glow-getters",
      "newArrivalsTitle": "New arrivals"
    }
  },
  {
    "id": "warm-homestead",
    "name": "The Homestead",
    "category": "warm",
    "description": "A split layout for rustic, wholesome essentials and back-to-basics living.",
    "hero": "split",
    "sections": {
      "categories": true,
      "howItWorks": false,
      "bestSellers": true,
      "masala": false,
      "promos": true,
      "newArrivals": true,
      "recipes": false,
      "blog": true,
      "testimonials": true,
      "newsletter": true
    },
    "copy": {
      "heroEyebrow": "Simple, honest, made to last",
      "heroTitleTop": "Back to",
      "heroTitleBottom": "the good life",
      "heroSubtitle": "Rustic essentials for a wholesome life, made the honest way with the things that truly matter.",
      "ctaPrimaryLabel": "Shop the homestead",
      "ctaSecondaryLabel": "Our roots",
      "categoriesTitle": "Homestead goods",
      "bestSellersTitle": "Homestead favorites",
      "newArrivalsTitle": "Freshly stocked"
    }
  }
];

export const HOMEPAGE_TEMPLATE_CATEGORIES: string[] = ["minimal","bold","luxury","playful","corporate","warm"];
