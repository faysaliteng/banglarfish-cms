// AUTO-GENERATED starter templates + demo data (multi-vertical). Applied by starter.functions.ts.
export type StarterProduct = { slug: string; name: string; categorySlug: string; price: number; compareAt: number; description: string; stock: number; weightOptions: string[]; bestSeller: boolean; newArrival: boolean };
export type StarterTemplate = {
  id: string; name: string; description: string; icon: string; themePreset: string;
  currency: { code: string; symbol: string; decimals: number; position: "before" | "after" };
  store: {
    storeName: string; announcement: string; heroEyebrow: string; heroTitleTop: string; heroTitleBottom: string; heroSubtitle: string;
    ctaPrimaryLabel: string; ctaSecondaryLabel: string; categoriesTitle: string; bestSellersTitle: string; newArrivalsTitle: string;
    stats: { n: string; label: string }[]; features: { icon: string; title: string; desc: string }[];
  };
  categories: { slug: string; name: string }[];
  products: StarterProduct[];
};

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    "id": "fashion",
    "name": "Fashion & Apparel",
    "description": "An elegant starter template for a modern clothing boutique spanning women's, men's, and accessories — ready to launch a full fashion store in one click.",
    "icon": "Shirt",
    "themePreset": "charcoal-gold",
    "currency": {
      "code": "USD",
      "symbol": "$",
      "decimals": 2,
      "position": "before"
    },
    "store": {
      "storeName": "Aurelle",
      "announcement": "Complimentary shipping on all orders over $150 — plus free 30-day returns",
      "heroEyebrow": "Autumn / Winter 2026 Collection",
      "heroTitleTop": "Timeless Style,",
      "heroTitleBottom": "Effortlessly Worn",
      "heroSubtitle": "Thoughtfully designed wardrobe essentials in premium natural fabrics. Elevated staples for men and women, made to be worn season after season.",
      "ctaPrimaryLabel": "Shop New Arrivals",
      "ctaSecondaryLabel": "Explore Collections",
      "categoriesTitle": "Shop by Category",
      "bestSellersTitle": "Our Best Sellers",
      "newArrivalsTitle": "Fresh Off the Rack",
      "stats": [
        {
          "n": "50K+",
          "label": "Happy Customers"
        },
        {
          "n": "4.9/5",
          "label": "Average Rating"
        },
        {
          "n": "120+",
          "label": "New Styles Monthly"
        }
      ],
      "features": [
        {
          "icon": "truck",
          "title": "Free Shipping",
          "desc": "Complimentary delivery on every order over $150, right to your door."
        },
        {
          "icon": "clock",
          "title": "30-Day Returns",
          "desc": "Changed your mind? Enjoy easy, no-questions-asked returns within 30 days."
        },
        {
          "icon": "shield",
          "title": "Secure Checkout",
          "desc": "Shop with confidence using fully encrypted, protected payments."
        },
        {
          "icon": "snowflake",
          "title": "All-Season Fabrics",
          "desc": "Breathable naturals and cozy knits crafted to keep you comfortable year-round."
        }
      ]
    },
    "categories": [
      {
        "slug": "women",
        "name": "Women's Clothing"
      },
      {
        "slug": "men",
        "name": "Men's Clothing"
      },
      {
        "slug": "outerwear",
        "name": "Outerwear"
      },
      {
        "slug": "footwear",
        "name": "Footwear"
      },
      {
        "slug": "accessories",
        "name": "Accessories"
      }
    ],
    "products": [
      {
        "slug": "silk-slip-dress",
        "name": "Silk Slip Dress",
        "categorySlug": "women",
        "price": 128,
        "compareAt": 168,
        "description": "A bias-cut midi dress in lustrous 100% mulberry silk with an adjustable strap. Effortlessly elegant from desk to dinner.",
        "stock": 64,
        "weightOptions": [
          "S",
          "M",
          "L",
          "XL"
        ],
        "bestSeller": true,
        "newArrival": false
      },
      {
        "slug": "merino-wool-crewneck-sweater",
        "name": "Merino Wool Crewneck Sweater",
        "categorySlug": "men",
        "price": 98,
        "compareAt": 0,
        "description": "A refined everyday knit spun from ultra-soft extra-fine merino wool. Naturally temperature-regulating and beautifully draped.",
        "stock": 142,
        "weightOptions": [
          "S",
          "M",
          "L",
          "XL"
        ],
        "bestSeller": true,
        "newArrival": false
      },
      {
        "slug": "tailored-wool-blazer",
        "name": "Tailored Wool Blazer",
        "categorySlug": "women",
        "price": 245,
        "compareAt": 0,
        "description": "A single-breasted blazer in Italian wool with a structured shoulder and clean lapel. The sharpest layer in your wardrobe.",
        "stock": 38,
        "weightOptions": [
          "S",
          "M",
          "L",
          "XL"
        ],
        "bestSeller": false,
        "newArrival": true
      },
      {
        "slug": "organic-cotton-oxford-shirt",
        "name": "Organic Cotton Oxford Shirt",
        "categorySlug": "men",
        "price": 79,
        "compareAt": 95,
        "description": "A crisp button-down woven from GOTS-certified organic cotton. Tailored for a modern fit that works buttoned up or open.",
        "stock": 176,
        "weightOptions": [
          "S",
          "M",
          "L",
          "XL"
        ],
        "bestSeller": true,
        "newArrival": false
      },
      {
        "slug": "wide-leg-linen-trousers",
        "name": "Wide-Leg Linen Trousers",
        "categorySlug": "women",
        "price": 89,
        "compareAt": 0,
        "description": "High-waisted, wide-leg trousers in breathable European linen. Relaxed elegance for warm days and easy travel.",
        "stock": 97,
        "weightOptions": [
          "S",
          "M",
          "L",
          "XL"
        ],
        "bestSeller": false,
        "newArrival": true
      },
      {
        "slug": "quilted-puffer-jacket",
        "name": "Quilted Puffer Jacket",
        "categorySlug": "outerwear",
        "price": 189,
        "compareAt": 229,
        "description": "A lightweight yet toasty puffer with recycled down-alternative fill and a water-repellent shell. Packs down small, warms up big.",
        "stock": 55,
        "weightOptions": [
          "S",
          "M",
          "L",
          "XL"
        ],
        "bestSeller": false,
        "newArrival": true
      },
      {
        "slug": "leather-chelsea-boots",
        "name": "Leather Chelsea Boots",
        "categorySlug": "footwear",
        "price": 215,
        "compareAt": 0,
        "description": "Handcrafted Chelsea boots in full-grain leather with elastic side panels and a durable stacked heel. A wardrobe classic that ages beautifully.",
        "stock": 42,
        "weightOptions": [
          "US 7",
          "US 8",
          "US 9",
          "US 10",
          "US 11"
        ],
        "bestSeller": false,
        "newArrival": false
      },
      {
        "slug": "italian-leather-tote-bag",
        "name": "Italian Leather Tote Bag",
        "categorySlug": "accessories",
        "price": 165,
        "compareAt": 195,
        "description": "A structured everyday tote in supple vegetable-tanned Italian leather with a suede-lined interior. Roomy enough for a laptop, refined enough for anywhere.",
        "stock": 71,
        "weightOptions": [
          "One Size"
        ],
        "bestSeller": true,
        "newArrival": false
      }
    ]
  },
  {
    "id": "electronics",
    "name": "Electronics & Gadgets",
    "description": "A crisp, spec-driven starter template for a modern electronics store selling phones, laptops, audio gear, wearables, and accessories.",
    "icon": "Smartphone",
    "themePreset": "cobalt",
    "currency": {
      "code": "USD",
      "symbol": "$",
      "decimals": 2,
      "position": "before"
    },
    "store": {
      "storeName": "VoltEdge",
      "announcement": "Free 2-day shipping on orders over $75 — shop the 2026 lineup now",
      "heroEyebrow": "New 2026 Lineup",
      "heroTitleTop": "Next-Gen Tech,",
      "heroTitleBottom": "Delivered Fast",
      "heroSubtitle": "Premium phones, laptops, and audio gear at prices that make sense. Cutting-edge specs, honest reviews, and support that actually helps.",
      "ctaPrimaryLabel": "Shop New Arrivals",
      "ctaSecondaryLabel": "Browse Deals",
      "categoriesTitle": "Shop by Category",
      "bestSellersTitle": "Best Sellers",
      "newArrivalsTitle": "Just Landed",
      "stats": [
        {
          "n": "50K+",
          "label": "Gadgets Shipped"
        },
        {
          "n": "4.8/5",
          "label": "Average Rating"
        },
        {
          "n": "2-Year",
          "label": "Warranty Included"
        }
      ],
      "features": [
        {
          "icon": "truck",
          "title": "Free Fast Shipping",
          "desc": "Free 2-day delivery on every order over $75, right to your door."
        },
        {
          "icon": "shield",
          "title": "2-Year Warranty",
          "desc": "Full manufacturer coverage on every device we sell, no fine print."
        },
        {
          "icon": "clock",
          "title": "24/7 Support",
          "desc": "Real tech experts on call around the clock to help you out."
        },
        {
          "icon": "snowflake",
          "title": "Carbon-Neutral Shipping",
          "desc": "Every order ships climate-neutral, fully offset at no extra cost."
        }
      ]
    },
    "categories": [
      {
        "slug": "smartphones",
        "name": "Smartphones"
      },
      {
        "slug": "laptops",
        "name": "Laptops & Computers"
      },
      {
        "slug": "audio",
        "name": "Audio & Headphones"
      },
      {
        "slug": "wearables",
        "name": "Wearables"
      },
      {
        "slug": "accessories",
        "name": "Accessories"
      }
    ],
    "products": [
      {
        "slug": "pulsar-x5-pro-5g",
        "name": "Pulsar X5 Pro 5G",
        "categorySlug": "smartphones",
        "price": 899.99,
        "compareAt": 999.99,
        "description": "A flagship 6.7-inch AMOLED phone with a 120Hz display, triple 50MP camera system, and blazing 5G speeds. All-day battery with 65W fast charging.",
        "stock": 64,
        "weightOptions": [
          "128GB / Obsidian",
          "256GB / Obsidian",
          "256GB / Silver",
          "512GB / Ocean Blue"
        ],
        "bestSeller": true,
        "newArrival": false
      },
      {
        "slug": "nimbus-book-14-ultra",
        "name": "Nimbus Book 14 Ultra",
        "categorySlug": "laptops",
        "price": 1299,
        "compareAt": 1499,
        "description": "An ultralight 14-inch laptop with a stunning 3K OLED display and up to 18 hours of battery. Powered by the latest 12-core chip for effortless multitasking.",
        "stock": 38,
        "weightOptions": [
          "16GB / 512GB",
          "16GB / 1TB",
          "32GB / 1TB"
        ],
        "bestSeller": false,
        "newArrival": true
      },
      {
        "slug": "echobuds-pro-2-anc",
        "name": "EchoBuds Pro 2 ANC",
        "categorySlug": "audio",
        "price": 149.99,
        "compareAt": 199.99,
        "description": "Wireless earbuds with adaptive active noise cancellation and rich, balanced sound. 30-hour total battery life and a comfortable, secure fit.",
        "stock": 152,
        "weightOptions": [
          "White",
          "Black"
        ],
        "bestSeller": true,
        "newArrival": false
      },
      {
        "slug": "sonicwave-over-ear-headphones",
        "name": "SonicWave Over-Ear Headphones",
        "categorySlug": "audio",
        "price": 279.99,
        "compareAt": 0,
        "description": "Premium over-ear headphones with plush memory-foam cushions and studio-grade 40mm drivers. 40 hours of playback with fast USB-C charging.",
        "stock": 71,
        "weightOptions": [
          "Midnight Black",
          "Silver",
          "Navy"
        ],
        "bestSeller": false,
        "newArrival": true
      },
      {
        "slug": "vita-watch-series-6",
        "name": "Vita Watch Series 6",
        "categorySlug": "wearables",
        "price": 329.99,
        "compareAt": 0,
        "description": "A sleek smartwatch with continuous heart-rate, SpO2, and sleep tracking on a bright always-on display. Water-resistant to 50m with GPS built in.",
        "stock": 89,
        "weightOptions": [
          "40mm",
          "44mm"
        ],
        "bestSeller": false,
        "newArrival": true
      },
      {
        "slug": "gan-65w-fast-charger",
        "name": "GaN 65W Fast Charger",
        "categorySlug": "accessories",
        "price": 39.99,
        "compareAt": 54.99,
        "description": "A compact GaN wall charger that powers laptops, phones, and tablets at up to 65W. Dual USB-C and one USB-A port charge three devices at once.",
        "stock": 187,
        "weightOptions": [
          "1 pc"
        ],
        "bestSeller": true,
        "newArrival": false
      },
      {
        "slug": "aerostand-aluminum-laptop-stand",
        "name": "AeroStand Aluminum Laptop Stand",
        "categorySlug": "accessories",
        "price": 44.99,
        "compareAt": 0,
        "description": "An ergonomic, foldable aluminum stand that lifts your laptop to eye level for better posture and airflow. Fits any 11 to 17-inch laptop.",
        "stock": 124,
        "weightOptions": [
          "Space Gray",
          "Silver"
        ],
        "bestSeller": false,
        "newArrival": false
      },
      {
        "slug": "powercore-20k-magnetic-power-bank",
        "name": "PowerCore 20K Magnetic Power Bank",
        "categorySlug": "accessories",
        "price": 59.99,
        "compareAt": 79.99,
        "description": "A 20,000mAh magnetic power bank that snaps onto your phone for wireless top-ups on the go. 30W USB-C output recharges a phone in under an hour.",
        "stock": 96,
        "weightOptions": [
          "Black",
          "White"
        ],
        "bestSeller": false,
        "newArrival": true
      }
    ]
  },
  {
    "id": "grocery",
    "name": "Grocery & Fresh",
    "description": "A fresh, friendly online supermarket starter with produce, dairy, bakery, and pantry staples delivered to the door.",
    "icon": "Apple",
    "themePreset": "spring-meadow",
    "currency": {
      "code": "EUR",
      "symbol": "€",
      "decimals": 2,
      "position": "before"
    },
    "store": {
      "storeName": "GreenBasket Market",
      "announcement": "Free delivery on orders over €40 — fresh to your door within 24 hours",
      "heroEyebrow": "Farm-fresh, every day",
      "heroTitleTop": "Groceries picked fresh,",
      "heroTitleBottom": "delivered to your door",
      "heroSubtitle": "From crisp seasonal produce to warm-from-the-oven bakery, shop thousands of everyday essentials and local favourites — all delivered fresh at their best.",
      "ctaPrimaryLabel": "Shop groceries",
      "ctaSecondaryLabel": "Browse weekly deals",
      "categoriesTitle": "Shop by aisle",
      "bestSellersTitle": "Weekly favourites",
      "newArrivalsTitle": "Just in season",
      "stats": [
        {
          "n": "10k+",
          "label": "Products in store"
        },
        {
          "n": "24h",
          "label": "Fresh delivery"
        },
        {
          "n": "50k+",
          "label": "Happy shoppers"
        }
      ],
      "features": [
        {
          "icon": "truck",
          "title": "Free delivery over €40",
          "desc": "Same-day and next-day slots bring your shop right to the kitchen."
        },
        {
          "icon": "snowflake",
          "title": "Cold-chain fresh",
          "desc": "Chilled and frozen items are packed to stay perfectly fresh in transit."
        },
        {
          "icon": "shield",
          "title": "Freshness guaranteed",
          "desc": "Not happy with an item? We'll refund or replace it, no questions asked."
        },
        {
          "icon": "clock",
          "title": "Reorder in minutes",
          "desc": "Save your favourites and rebuild your weekly shop in just a few taps."
        }
      ]
    },
    "categories": [
      {
        "slug": "fresh-produce",
        "name": "Fresh Produce"
      },
      {
        "slug": "dairy-eggs",
        "name": "Dairy & Eggs"
      },
      {
        "slug": "bakery",
        "name": "Bakery"
      },
      {
        "slug": "pantry",
        "name": "Pantry Staples"
      },
      {
        "slug": "meat-seafood",
        "name": "Meat & Seafood"
      }
    ],
    "products": [
      {
        "slug": "organic-hass-avocados",
        "name": "Organic Hass Avocados",
        "categorySlug": "fresh-produce",
        "price": 3.99,
        "compareAt": 0,
        "description": "Creamy, ripe-and-ready Hass avocados grown organically. Perfect for toast, salads, or a quick guacamole.",
        "stock": 120,
        "weightOptions": [
          "4 pcs",
          "6 pcs"
        ],
        "bestSeller": true,
        "newArrival": false
      },
      {
        "slug": "vine-ripened-cherry-tomatoes",
        "name": "Vine-Ripened Cherry Tomatoes",
        "categorySlug": "fresh-produce",
        "price": 2.49,
        "compareAt": 0,
        "description": "Sweet, juicy cherry tomatoes picked on the vine for full flavour. Great for snacking, roasting, or salads.",
        "stock": 95,
        "weightOptions": [
          "250g",
          "500g"
        ],
        "bestSeller": false,
        "newArrival": true
      },
      {
        "slug": "organic-bananas",
        "name": "Organic Bananas",
        "categorySlug": "fresh-produce",
        "price": 1.79,
        "compareAt": 0,
        "description": "Naturally sweet Fairtrade organic bananas, ripened to perfection. An everyday lunchbox and smoothie staple.",
        "stock": 200,
        "weightOptions": [
          "1kg"
        ],
        "bestSeller": false,
        "newArrival": false
      },
      {
        "slug": "free-range-large-eggs",
        "name": "Free-Range Large Eggs",
        "categorySlug": "dairy-eggs",
        "price": 3.29,
        "compareAt": 0,
        "description": "Farm-fresh large eggs from happy free-range hens, with rich golden yolks. A kitchen essential for baking and breakfast.",
        "stock": 150,
        "weightOptions": [
          "6 pack",
          "12 pack"
        ],
        "bestSeller": true,
        "newArrival": false
      },
      {
        "slug": "greek-natural-yogurt",
        "name": "Greek Natural Yogurt",
        "categorySlug": "dairy-eggs",
        "price": 2.99,
        "compareAt": 0,
        "description": "Thick, creamy strained Greek yogurt with no added sugar. Delicious with fruit and granola or in cooking.",
        "stock": 80,
        "weightOptions": [
          "500g",
          "1kg"
        ],
        "bestSeller": false,
        "newArrival": false
      },
      {
        "slug": "artisan-sourdough-loaf",
        "name": "Artisan Sourdough Loaf",
        "categorySlug": "bakery",
        "price": 4.5,
        "compareAt": 0,
        "description": "Slow-proofed for 24 hours and baked fresh each morning, with a crisp crust and airy, tangy crumb.",
        "stock": 60,
        "weightOptions": [
          "400g",
          "800g"
        ],
        "bestSeller": true,
        "newArrival": true
      },
      {
        "slug": "extra-virgin-olive-oil",
        "name": "Cold-Pressed Extra Virgin Olive Oil",
        "categorySlug": "pantry",
        "price": 8.99,
        "compareAt": 11.99,
        "description": "First cold-pressed extra virgin olive oil with a smooth, peppery finish. Ideal for dressings, dipping, and drizzling.",
        "stock": 70,
        "weightOptions": [
          "500ml",
          "1L"
        ],
        "bestSeller": false,
        "newArrival": false
      },
      {
        "slug": "wild-atlantic-salmon-fillet",
        "name": "Wild-Caught Atlantic Salmon Fillet",
        "categorySlug": "meat-seafood",
        "price": 9.49,
        "compareAt": 12.99,
        "description": "Sustainably sourced, boneless salmon fillet with firm, buttery flesh. Pan-ready for a quick, healthy dinner.",
        "stock": 45,
        "weightOptions": [
          "300g",
          "600g"
        ],
        "bestSeller": false,
        "newArrival": true
      }
    ]
  },
  {
    "id": "restaurant",
    "name": "Restaurant & Food",
    "description": "A warm, appetising storefront for restaurants and cloud kitchens to showcase starters, mains, desserts and drinks with cooked-to-order delivery.",
    "icon": "UtensilsCrossed",
    "themePreset": "golden-hour",
    "currency": {
      "code": "GBP",
      "symbol": "£",
      "decimals": 2,
      "position": "before"
    },
    "store": {
      "storeName": "Ember & Oak Kitchen",
      "announcement": "Free delivery on orders over £30 — freshly cooked, delivered hot to your door.",
      "heroEyebrow": "Freshly cooked, delivered fast",
      "heroTitleTop": "Real food, made with",
      "heroTitleBottom": "fire & flavour",
      "heroSubtitle": "From sizzling starters to indulgent desserts, our chefs cook every dish to order and send it out piping hot across the city.",
      "ctaPrimaryLabel": "Order Now",
      "ctaSecondaryLabel": "View Full Menu",
      "categoriesTitle": "Explore the Menu",
      "bestSellersTitle": "Customer Favourites",
      "newArrivalsTitle": "Fresh on the Menu",
      "stats": [
        {
          "n": "50k+",
          "label": "Meals delivered"
        },
        {
          "n": "4.8★",
          "label": "Average rating"
        },
        {
          "n": "30 min",
          "label": "Average delivery"
        }
      ],
      "features": [
        {
          "icon": "clock",
          "title": "Cooked to Order",
          "desc": "Every dish is freshly prepared the moment you order — never pre-made or sitting under a lamp."
        },
        {
          "icon": "truck",
          "title": "Hot & Fast Delivery",
          "desc": "Insulated bags keep everything piping hot, with an average doorstep time of just 30 minutes."
        },
        {
          "icon": "shield",
          "title": "Quality You Can Taste",
          "desc": "Locally sourced produce and premium cuts, prepped fresh in our kitchen every single day."
        },
        {
          "icon": "snowflake",
          "title": "Fresh, Never Frozen",
          "desc": "We cook with fresh ingredients daily — nothing reheated, nothing straight from the freezer."
        }
      ]
    },
    "categories": [
      {
        "slug": "starters",
        "name": "Starters"
      },
      {
        "slug": "mains",
        "name": "Mains"
      },
      {
        "slug": "desserts",
        "name": "Desserts"
      },
      {
        "slug": "drinks",
        "name": "Drinks"
      }
    ],
    "products": [
      {
        "slug": "crispy-salt-pepper-squid",
        "name": "Crispy Salt & Pepper Squid",
        "categorySlug": "starters",
        "price": 7.95,
        "compareAt": 0,
        "description": "Tender squid rings in a light, crackling batter tossed with fragrant chilli, spring onion and Sichuan salt. Served with a zesty lime aioli for dipping.",
        "stock": 80,
        "weightOptions": [
          "Regular",
          "Large"
        ],
        "bestSeller": true,
        "newArrival": false
      },
      {
        "slug": "loaded-nachos-supreme",
        "name": "Loaded Nachos Supreme",
        "categorySlug": "starters",
        "price": 6.95,
        "compareAt": 8.5,
        "description": "A mountain of warm tortilla chips smothered in melted cheese, jalapeños, guacamole, salsa and sour cream. The ultimate sharing starter.",
        "stock": 120,
        "weightOptions": [
          "For One",
          "To Share"
        ],
        "bestSeller": false,
        "newArrival": false
      },
      {
        "slug": "chargrilled-ribeye-steak",
        "name": "Char-Grilled Ribeye Steak",
        "categorySlug": "mains",
        "price": 24.95,
        "compareAt": 28.95,
        "description": "A well-marbled ribeye flame-grilled to your liking and finished with garlic herb butter. Served with triple-cooked chips and a dressed rocket salad.",
        "stock": 45,
        "weightOptions": [
          "8oz",
          "12oz"
        ],
        "bestSeller": true,
        "newArrival": false
      },
      {
        "slug": "chicken-tikka-masala",
        "name": "Chicken Tikka Masala",
        "categorySlug": "mains",
        "price": 13.95,
        "compareAt": 15.5,
        "description": "Char-grilled chicken tikka simmered in a rich, creamy tomato and cardamom sauce. Served with fluffy basmati rice and a warm buttered naan.",
        "stock": 90,
        "weightOptions": [
          "Regular",
          "Large"
        ],
        "bestSeller": true,
        "newArrival": false
      },
      {
        "slug": "wild-mushroom-truffle-risotto",
        "name": "Wild Mushroom Truffle Risotto",
        "categorySlug": "mains",
        "price": 14.5,
        "compareAt": 0,
        "description": "Creamy Arborio rice folded with wild mushrooms, aged parmesan and a drizzle of white truffle oil. Comforting, earthy and indulgent.",
        "stock": 60,
        "weightOptions": [
          "Regular",
          "Large"
        ],
        "bestSeller": false,
        "newArrival": true
      },
      {
        "slug": "molten-chocolate-lava-cake",
        "name": "Molten Chocolate Lava Cake",
        "categorySlug": "desserts",
        "price": 6.95,
        "compareAt": 0,
        "description": "A warm dark-chocolate sponge with a gooey molten centre, dusted with cocoa and served with a scoop of vanilla bean ice cream.",
        "stock": 110,
        "weightOptions": [
          "1 pc"
        ],
        "bestSeller": false,
        "newArrival": true
      },
      {
        "slug": "sticky-toffee-pudding",
        "name": "Sticky Toffee Pudding",
        "categorySlug": "desserts",
        "price": 6.5,
        "compareAt": 0,
        "description": "Moist date sponge drenched in warm butterscotch toffee sauce and served with a generous spoon of clotted cream. A timeless British classic.",
        "stock": 75,
        "weightOptions": [
          "Regular",
          "To Share"
        ],
        "bestSeller": false,
        "newArrival": false
      },
      {
        "slug": "fresh-mango-lassi",
        "name": "Fresh Mango Lassi",
        "categorySlug": "drinks",
        "price": 3.95,
        "compareAt": 0,
        "description": "A cooling, creamy blend of ripe Alphonso mango and yoghurt, lightly spiced with cardamom. The perfect companion to a spicy main.",
        "stock": 150,
        "weightOptions": [
          "Regular",
          "Large"
        ],
        "bestSeller": false,
        "newArrival": true
      }
    ]
  },
  {
    "id": "beauty",
    "name": "Beauty & Cosmetics",
    "description": "A luxe, soft-toned starter store for skincare, makeup, fragrance, and hair care — complete with elegant demo products and homepage copy in USD.",
    "icon": "Sparkles",
    "themePreset": "blossom",
    "currency": {
      "code": "USD",
      "symbol": "$",
      "decimals": 2,
      "position": "before"
    },
    "store": {
      "storeName": "Aurelle",
      "announcement": "Free shipping on orders over $50 · Complimentary samples with every order",
      "heroEyebrow": "Dermatologist-loved · Cruelty-free",
      "heroTitleTop": "Your daily ritual for",
      "heroTitleBottom": "glowing skin",
      "heroSubtitle": "Clean, high-performance formulas — serums, makeup, and fragrance crafted to make you feel effortlessly radiant.",
      "ctaPrimaryLabel": "Shop bestsellers",
      "ctaSecondaryLabel": "Explore skincare",
      "categoriesTitle": "Shop by category",
      "bestSellersTitle": "Loved by thousands",
      "newArrivalsTitle": "Fresh arrivals",
      "stats": [
        {
          "n": "500K+",
          "label": "Happy customers"
        },
        {
          "n": "100%",
          "label": "Cruelty-free"
        },
        {
          "n": "4.9★",
          "label": "Average rating"
        }
      ],
      "features": [
        {
          "icon": "truck",
          "title": "Free luxe delivery",
          "desc": "Complimentary shipping on all orders over $50, beautifully packaged."
        },
        {
          "icon": "shield",
          "title": "Clean & cruelty-free",
          "desc": "Dermatologist-tested formulas, never tested on animals."
        },
        {
          "icon": "clock",
          "title": "30-day glow guarantee",
          "desc": "Love your results or return within 30 days, no questions asked."
        },
        {
          "icon": "snowflake",
          "title": "Fresh, potent formulas",
          "desc": "Small-batch made and temperature-controlled to preserve every active."
        }
      ]
    },
    "categories": [
      {
        "slug": "skincare",
        "name": "Skincare"
      },
      {
        "slug": "makeup",
        "name": "Makeup"
      },
      {
        "slug": "fragrance",
        "name": "Fragrance"
      },
      {
        "slug": "hair-care",
        "name": "Hair Care"
      }
    ],
    "products": [
      {
        "slug": "vitamin-c-brightening-serum",
        "name": "Vitamin C Brightening Serum",
        "categorySlug": "skincare",
        "price": 48,
        "compareAt": 62,
        "description": "A silky 15% vitamin C serum that visibly brightens, evens tone, and boosts radiance. Pairs stabilized vitamin C with hyaluronic acid for all-day glow.",
        "stock": 140,
        "weightOptions": [
          "30ml",
          "50ml"
        ],
        "bestSeller": true,
        "newArrival": false
      },
      {
        "slug": "overnight-retinol-renewal-cream",
        "name": "Overnight Retinol Renewal Cream",
        "categorySlug": "skincare",
        "price": 62,
        "compareAt": 0,
        "description": "A gentle encapsulated retinol cream that smooths fine lines while you sleep. Wake to firmer, refreshed, and noticeably softer skin.",
        "stock": 90,
        "weightOptions": [
          "50ml"
        ],
        "bestSeller": false,
        "newArrival": true
      },
      {
        "slug": "velvet-matte-liquid-lipstick",
        "name": "Velvet Matte Liquid Lipstick",
        "categorySlug": "makeup",
        "price": 24,
        "compareAt": 0,
        "description": "Weightless, transfer-proof color in a creamy matte finish that lasts all day. Enriched with vitamin E so lips never feel dry.",
        "stock": 200,
        "weightOptions": [
          "6ml"
        ],
        "bestSeller": true,
        "newArrival": false
      },
      {
        "slug": "luminous-silk-foundation",
        "name": "Luminous Silk Foundation",
        "categorySlug": "makeup",
        "price": 45,
        "compareAt": 0,
        "description": "A buildable, medium-coverage foundation with a natural luminous finish. Blurs imperfections while letting your skin breathe.",
        "stock": 110,
        "weightOptions": [
          "30ml"
        ],
        "bestSeller": false,
        "newArrival": true
      },
      {
        "slug": "rose-noir-eau-de-parfum",
        "name": "Rose Noir Eau de Parfum",
        "categorySlug": "fragrance",
        "price": 95,
        "compareAt": 120,
        "description": "An intoxicating floral-woody fragrance of Damask rose, blackcurrant, and warm amber. Long-lasting and unmistakably elegant.",
        "stock": 60,
        "weightOptions": [
          "50ml",
          "100ml"
        ],
        "bestSeller": true,
        "newArrival": false
      },
      {
        "slug": "amber-oud-travel-spray",
        "name": "Amber Oud Travel Spray",
        "categorySlug": "fragrance",
        "price": 38,
        "compareAt": 0,
        "description": "A pocket-sized spray of smoky oud, amber, and vanilla for scent on the go. The perfect purse companion or introduction to the house.",
        "stock": 80,
        "weightOptions": [
          "10ml",
          "30ml"
        ],
        "bestSeller": false,
        "newArrival": true
      },
      {
        "slug": "argan-repair-hair-oil",
        "name": "Argan Repair Hair Oil",
        "categorySlug": "hair-care",
        "price": 32,
        "compareAt": 40,
        "description": "A fast-absorbing blend of argan and marula oils that tames frizz and restores shine. Weightless nourishment for dry, damaged ends.",
        "stock": 150,
        "weightOptions": [
          "50ml",
          "100ml"
        ],
        "bestSeller": false,
        "newArrival": false
      },
      {
        "slug": "silk-bond-repair-shampoo",
        "name": "Silk Bond Repair Shampoo",
        "categorySlug": "hair-care",
        "price": 28,
        "compareAt": 0,
        "description": "A sulfate-free bond-repair shampoo that strengthens and smooths from the first wash. Gently cleanses while protecting color and shine.",
        "stock": 130,
        "weightOptions": [
          "250ml",
          "500ml"
        ],
        "bestSeller": false,
        "newArrival": false
      }
    ]
  },
  {
    "id": "home-living",
    "name": "Home & Living",
    "description": "A warm, aspirational starter template for a home decor and furniture store spanning furniture, lighting, kitchen and decor, ready to customize and launch.",
    "icon": "Sofa",
    "themePreset": "sandstone",
    "currency": {
      "code": "AUD",
      "symbol": "$",
      "decimals": 2,
      "position": "before"
    },
    "store": {
      "storeName": "Hearth & Home",
      "announcement": "Free AU-wide shipping on orders over $150 · Easy 30-day returns",
      "heroEyebrow": "Curated for the modern home",
      "heroTitleTop": "Beautiful pieces for",
      "heroTitleBottom": "the life you live",
      "heroSubtitle": "Thoughtfully made furniture, lighting and decor to turn any house into a home you never want to leave.",
      "ctaPrimaryLabel": "Shop the collection",
      "ctaSecondaryLabel": "Explore new arrivals",
      "categoriesTitle": "Shop by room",
      "bestSellersTitle": "Loved by our customers",
      "newArrivalsTitle": "Fresh finds",
      "stats": [
        {
          "n": "12k+",
          "label": "Homes styled"
        },
        {
          "n": "4.9★",
          "label": "Average customer rating"
        },
        {
          "n": "48h",
          "label": "Metro dispatch"
        }
      ],
      "features": [
        {
          "icon": "truck",
          "title": "Free AU-wide shipping",
          "desc": "Complimentary delivery on all orders over $150, sent Australia-wide."
        },
        {
          "icon": "shield",
          "title": "5-year warranty",
          "desc": "Built to last and backed by our 5-year quality guarantee."
        },
        {
          "icon": "clock",
          "title": "Fast metro dispatch",
          "desc": "In-stock pieces leave our warehouse within 48 hours."
        },
        {
          "icon": "snowflake",
          "title": "Sustainably crafted",
          "desc": "Natural, responsibly sourced materials that are kind to your home and the planet."
        }
      ]
    },
    "categories": [
      {
        "slug": "furniture",
        "name": "Furniture"
      },
      {
        "slug": "lighting",
        "name": "Lighting"
      },
      {
        "slug": "kitchen",
        "name": "Kitchen & Dining"
      },
      {
        "slug": "decor",
        "name": "Decor"
      },
      {
        "slug": "textiles",
        "name": "Rugs & Textiles"
      }
    ],
    "products": [
      {
        "slug": "oakwood-linen-sofa",
        "name": "Oakwood 3-Seater Linen Sofa",
        "categorySlug": "furniture",
        "price": 1899,
        "compareAt": 2299,
        "description": "A generously cushioned three-seater upholstered in soft natural linen over a solid oak frame. The relaxed silhouette anchors any living room in understated comfort.",
        "stock": 34,
        "weightOptions": [
          "2 Seater",
          "3 Seater"
        ],
        "bestSeller": true,
        "newArrival": false
      },
      {
        "slug": "rattan-accent-chair",
        "name": "Noa Rattan Accent Chair",
        "categorySlug": "furniture",
        "price": 549,
        "compareAt": 0,
        "description": "Hand-woven rattan meets a warm timber frame in this airy accent chair. A sculptural seat that brings texture and calm to any corner.",
        "stock": 62,
        "weightOptions": [
          "1 pc"
        ],
        "bestSeller": false,
        "newArrival": true
      },
      {
        "slug": "halo-arc-floor-lamp",
        "name": "Halo Arc Floor Lamp",
        "categorySlug": "lighting",
        "price": 329,
        "compareAt": 399,
        "description": "A gracefully curved arc lamp with a brushed brass finish and linen drum shade. Casts a soft, ambient glow perfect for reading nooks and lounges.",
        "stock": 88,
        "weightOptions": [
          "1 pc"
        ],
        "bestSeller": true,
        "newArrival": false
      },
      {
        "slug": "terra-ceramic-pendant",
        "name": "Terra Ceramic Pendant Light",
        "categorySlug": "lighting",
        "price": 189,
        "compareAt": 0,
        "description": "A handcrafted ceramic pendant with a matte earthen glaze that warms every kitchen island and dining table. Each piece carries its own subtle variation.",
        "stock": 120,
        "weightOptions": [
          "1 pc"
        ],
        "bestSeller": false,
        "newArrival": true
      },
      {
        "slug": "stoneware-dinner-set",
        "name": "Rustic Stoneware Dinner Set",
        "categorySlug": "kitchen",
        "price": 149,
        "compareAt": 199,
        "description": "A 12-piece reactive-glaze stoneware set in warm sand tones, made for everyday meals and slow weekend lunches. Dishwasher and microwave safe.",
        "stock": 75,
        "weightOptions": [
          "12 pc set",
          "18 pc set"
        ],
        "bestSeller": true,
        "newArrival": false
      },
      {
        "slug": "acacia-chopping-board",
        "name": "Acacia Serving & Chopping Board",
        "categorySlug": "kitchen",
        "price": 59,
        "compareAt": 0,
        "description": "A generously sized acacia board with rich grain and a built-in handle, equally at home slicing veg or serving a grazing platter.",
        "stock": 140,
        "weightOptions": [
          "1 pc"
        ],
        "bestSeller": false,
        "newArrival": false
      },
      {
        "slug": "handwoven-wool-rug",
        "name": "Aria Handwoven Wool Rug",
        "categorySlug": "textiles",
        "price": 499,
        "compareAt": 649,
        "description": "A plush, hand-woven wool rug in a soft neutral palette with a subtle tonal pattern. Adds instant warmth and grounds any space underfoot.",
        "stock": 46,
        "weightOptions": [
          "160 x 230 cm",
          "200 x 300 cm"
        ],
        "bestSeller": false,
        "newArrival": true
      },
      {
        "slug": "terracotta-vase-trio",
        "name": "Terracotta Vase Trio",
        "categorySlug": "decor",
        "price": 89,
        "compareAt": 0,
        "description": "A set of three hand-thrown terracotta vases in graduated heights, styled together or apart. Beautiful with dried stems or on their own.",
        "stock": 95,
        "weightOptions": [
          "Set of 3"
        ],
        "bestSeller": false,
        "newArrival": false
      }
    ]
  }
];
