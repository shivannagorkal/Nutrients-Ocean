// ============================================================
// NEXVYRO FITNESS - SINGLE SOURCE OF TRUTH
// Edit ONLY this file to change text, prices, links and photos.
// Every line marked TODO is a placeholder to replace later.
// ============================================================

const siteData = {
  siteUrl: "https://www.example.com", // TODO: your real domain, e.g. https://nexvyro.in

  brand: {
    name: "Nutrients Ocean",
    shortName: "Nutriocean",
    tagline: "Fresh protein, made right by your gym.",
    logo: "/images/logo.jpg",
    fssai: "30261031127959160",
  },

  contact: {
    phoneDisplay: "+91 70199 93154",
    phoneRaw: "+919482705834",
    whatsappNumber: "919482705834",
    enquiryPhones: ["9482705834", "7019993154", "8073176142"],
    email: "support@fitmitra.in",
  },

  socials: {
    whatsapp: "https://wa.me/919876543210?text=Hi%20Nexvyro%20Fitness%2C%20I%20would%20like%20to%20pre-order",
    instagram: "https://instagram.com/nutrientsocean.in",
    youtube: "https://youtube.com/@fitmitra-fitness",
    twitter: "https://x.com/fitmitra",
    facebook: "https://facebook.com/fitmitra.fitness",
  },

  legal: {
    companyName: "Nexvyro (Nutrients Ocean)",
    brandName: "Nutrients Ocean",
    lastUpdated: "October 2026",
    address: "Opposite Cobra Fitness Club, Valencia, Kankanadi, Mangalore, Karnataka 575001, India",
    supportEmail: "support@fitmitra.in",
    supportPhone: "+91 70199 93154",
    refundWindow: "Immediate for stall pickup issues / 14 days for packaged supplements",
    responseTimeline: "Within 24 business hours",
  },

  location: {
    gymName: "Cobra Fitness Club", // TODO
    addressLine: "Opposite Cobra Fitness Club, Valencia, Kankanadi, Mangalore", // TODO
    mapsLink: "https://maps.app.goo.gl/5dnLPACG8KJUQa7A7",
    mapPhoto: "/images/google-map.jpg",
    mapsEmbedUrl: "", // OPTIONAL: paste a Google Maps "Embed a map" src URL here to show a live map
    timings: [
      { label: "Morning", time: "6:30 AM - 8:15 AM" },
      { label: "Evening", time: "5:30 PM - 8:30 PM" },
    ],
  },

  hero: {
    headlineStart: "Fuel your workout with",
    headlineHighlight: "fresh protein.",
    subtext:
      "Protein meals, protein shakes and milk, prepared fresh at our stall right opposite your gym. Call, pre-order and pick up in minutes.",
    image: '/images/hero_showcase.jpg',
    backgroundImage: "", // OPTIONAL: e.g. "/images/hero-bg.jpg"
    videoUrl: "", // OPTIONAL: e.g. "/videos/hero.mp4" (muted looping clip, keep under 5 MB)
    videoPoster: "", // OPTIONAL: e.g. "/images/hero-poster.jpg"
    badges: ["Made fresh", "Protein-packed", "Quick pickup"],
    chips: [
      { icon: "Phone", text: "Pre-order by call" },
      { icon: "Clock", text: "Pickup in minutes" },
      { icon: "MapPin", text: "Opposite your gym" },
    ],
  },

  marquee: ["Fresh protein", "Made on the spot", "Pre-order by call", "Pickup in minutes", "Opposite your gym"],

  menu: {
    title: "Our Menu",
    subtitle: "Healthy bites for a fitter you. Simple, fresh and protein-focused.",
    note: "Call us to pre-order and pick up at the stall.",
    pageTitle: "Fresh Stall Menu",
    pageSubtitle:
      "Healthy bites for a fitter you — made fresh on the spot opposite your gym with nutritious, high-protein ingredients.",
    prepNote: "Made fresh on the spot",
    highlights: [
      "Nutritious Ingredients",
      "High Protein",
      "Gym & Active Lifestyle Friendly",
      "Fresh & Delicious",
    ],
    items: [
      {
        id: "peanut_banana_sandwich",
        name: "Normal Sandwich",
        tag: "Snacks",
        isVeg: true,
        description: "Wholesome bread layered with fresh banana slices and creamy peanut butter.",
        ingredients: ["Bread", "Banana", "Peanut Butter", "Honey", "flavour"],
        price: "₹49",
        // OPTIONAL nutrition/prep fields: protein: "12g", calories: "310 kcal", prepTime: "5 mins"
        image: "/images/peanut_banana_sandwich.png",
      },
      {
        id: "dryfruits_sandwich",
        name: "Dry Fruit Sandwich",
        tag: "Snacks",
        isVeg: true,
        description: "Bread layered with banana, peanut butter, dry fruits, honey and chocolate syrup.",
        ingredients: ["Bread", "Banana", "Peanut Butter", "Dry Fruits", "seeds", "fruits", "Honey", "Chocolate Syrup"],
        price: "₹59",
        image: "/images/dryfruits_sandwich.png",
      },
      {
        id: "protein_meal",
        name: "High Protein Oats",
        tag: "Meal",
        isVeg: true,
        description:
          "Yogabar protein oats prepared with milk, peanut butter, banana, dry fruits, seeds, apple, pomegranate and honey.",
        ingredients: [
          "Yogabar Protein Oats",
          "Milk",
          "Peanut Butter",
          "Banana",
          "Dry Fruits",
          "Seeds (Pumpkin, Sunflower, Chia)",
          "Apple",
          "Pomegranate",
          "Honey",
          "flavour",
        ],
        price: "₹99",
        flavors: ["Strawberry", "Chocolate"],
        image: "/images/protein_meal.png",
      },
      {
        id: "nightout_protein_meal",
        name: "Nightout Oats",
        tag: "Meal",
        isVeg: true,
        description:
          "Normal oats made with milk, peanut butter, banana, honey, chocolate syrup, dry fruits, seeds and seasonal fruits.",
        ingredients: [
          "Normal Oats",
          "Milk",
          "Peanut Butter",
          "Banana",
          "Honey",
          "Chocolate Syrup",
          "Dry Fruits",
          "Seeds (Pumpkin, Sunflower, Chia)",
          "Fruits",
        ],
        price: "₹79",
        flavors: ["Strawberry", "Chocolate"],
        image: "/images/nightout_protein_meal.png",
      },
    ],
    subscriptions: {
      badge: "30-Day Healthy Meal Membership",
      title: "Monthly Subscription Plans",
      subtitle: "Choose an Individual or Combo plan for 30 days of daily fresh meals.",
      individualSubtitle: "Choose One Product • Get It Daily for 30 Days",
      individualPlans: [
        {
          id: "sub_normal_sandwich",
          name: "Normal Sandwich",
          price: "₹1,199",
          period: "/ Month",
          originalPrice: "₹1,470",
          savings: "Save ₹271",
          image: "/images/peanut_banana_sandwich.png",
        },
        {
          id: "sub_dry_fruit_sandwich",
          name: "Dry Fruit Sandwich",
          price: "₹1,599",
          period: "/ Month",
          originalPrice: "₹1,770",
          savings: "Save ₹171",
          image: "/images/dryfruits_sandwich.png",
        },
        {
          id: "sub_high_protein_oats",
          name: "High Protein Oats",
          price: "₹2,699",
          period: "/ Month",
          originalPrice: "₹2,970",
          savings: "Save ₹271",
          image: "/images/protein_meal.png",
        },
        {
          id: "sub_nightout_oats",
          name: "Nightout Oats",
          price: "₹2,099",
          period: "/ Month",
          originalPrice: "₹2,370",
          savings: "Save ₹271",
          image: "/images/nightout_protein_meal.png",
        },
      ],
      comboSubtitle: "Get Two Meals Daily • Better Value & More Nutrition",
      comboPlans: [
        {
          id: "sub_premium_combo",
          tier: "Premium Combo",
          name: "Chocolate High Protein Oats + Dry Fruit Sandwich",
          price: "₹3,999",
          period: "/ Month",
          savings: "Save ₹299",
          images: ["/images/protein_meal.png", "/images/dryfruits_sandwich.png"],
        },
        {
          id: "sub_value_combo",
          tier: "Value Combo",
          name: "Nightout Oats + Normal Sandwich",
          price: "₹2,999",
          period: "/ Month",
          savings: "Save ₹299",
          images: ["/images/nightout_protein_meal.png", "/images/peanut_banana_sandwich.png"],
        },
      ],
      delivery: {
        title: "Home Delivery Available",
        subtitle: "Within 2 KM from our Stall",
        tiers: [
          { range: "0 – 500 metres", fee: "₹5 per delivery" },
          { range: "501 metres – 1 KM", fee: "₹10 per delivery" },
          { range: "1.01 KM – 2 KM", fee: "₹15 per delivery" },
        ],
      },
      benefits: [
        "30 days of healthy meals",
        "Choose from Individual or Combo plans",
        "One serving per product per day",
        "Plan freeze: skip a day & get +1 extra day",
        "Stall pickup – Free",
        "Home delivery – ₹5 to ₹15 per delivery",
        "Save up to ₹299 every month",
      ],
      rules: [
        { icon: "Calendar", text: "Validity 30 days (extends when frozen)" },
        { icon: "Utensils", text: "Fixed product (choose at the time of subscription)" },
        { icon: "Clock", text: "Select Morning or Evening collection" },
        { icon: "PauseCircle", text: "Freeze available: skip a day and take 1 extra day" },
      ],
    },
  },

  why: {
    title: "Why Nutrients Ocean",
    subtitle: "Fresh, whole-food protein fuel made on the spot — priced honestly and steps away from your gym.",
    pageTitle: "Why Choose Nutrients Ocean",
    pageSubtitle:
      "Built in Mangalore for everyday lifters and students who want fresh, whole-food workout fuel without delivery delays or packaged fillers.",
    trustPills: [
      "100% Healythy and Tasty",
      "₹49–₹99 Transparent Pricing",
      "Made Fresh on Order",
      "Opposite Cobra Fitness Club",
    ],
    points: [
      {
        icon: "Leaf",
        title: "Made fresh on order",
        text: "Every oats bowl and sandwich is assembled on the spot when you order — never pre-packed days ago.",
      },
      {
        icon: "Dumbbell",
        title: "Real whole-food ingredients",
        text: "Yogabar protein oats, normal oats, milk, peanut butter, banana, apple, pomegranate, dry fruits, and seeds.",
      },
      {
        icon: "IndianRupee",
        title: "Honest ₹49–₹99 pricing",
        text: "Daily gym-budget friendly meals and snacks with zero delivery surcharges or packaging fees.",
      },
      {
        icon: "Phone",
        title: "Zero-wait gym pickup",
        text: "Call or WhatsApp before your last set and collect your fresh meal right opposite Cobra Fitness Club.",
      },
    ],
    comparison: {
      title: "Why our gym stall beats the alternatives",
      subtitle: "Compare fresh stall prep against delivery apps and packaged protein snacks.",
      rows: [
        {
          aspect: "Freshness",
          us: "Prepared fresh when you order",
          delivery: "Sits in transit 30–45 mins",
          packaged: "Packed weeks or months ago",
        },
        {
          aspect: "Price",
          us: "₹49–₹99 (zero platform fees)",
          delivery: "Higher menu + delivery fees",
          packaged: "Expensive per serving",
        },
        {
          aspect: "Ingredients",
          us: "Whole oats, milk, fruits, nuts, seeds, PB",
          delivery: "Varies / unclear oil & sugar",
          packaged: "Preservatives & fillers",
        },
        {
          aspect: "Convenience",
          us: "Steps away opposite your gym",
          delivery: "Wait outside for a rider",
          packaged: "Requires separate store trip",
        },
      ],
    },
    timingGuide: {
      title: "Fuel matched to your workout timing",
      subtitle: "Simple picks from our fresh menu depending on when you train.",
      slots: [
        {
          timing: "Pre-Workout Energy",
          badge: "Before Training",
          items: "Normal Sandwich (₹49) or Dry Fruit Sandwich (₹59)",
          text: "Quick-digesting carbs from bread and fresh banana paired with creamy peanut butter to power your session.",
        },
        {
          timing: "Post-Workout Recovery",
          badge: "After Lifting",
          items: "High Protein Oats (₹99)",
          text: "Yogabar protein oats made with milk, peanut butter, dry fruits, pumpkin/sunflower/chia seeds, apple, pomegranate, and honey.",
        },
        {
          timing: "Evening / Night Session",
          badge: "Evening Fuel",
          items: "Nightout Oats (₹79)",
          text: "Wholesome oats prepared with milk, peanut butter, banana, honey, chocolate syrup, dry fruits, seeds, and seasonal fruits.",
        },
      ],
    },
    standards: {
      title: "Practical standards you can count on",
      subtitle: "Transparent preparation, clean pickup support, and full ecosystem value.",
      items: [
        {
          icon: "ShieldCheck",
          title: "Full ingredient transparency",
          text: "Every ingredient in each sandwich and oats bowl is listed openly on our menu before you order.",
        },
        {
          icon: "Clock",
          title: "Ready around your workout",
          text: "Pre-order via call or WhatsApp during your cool-down so you do not have to wait at the counter.",
        },
        {
          icon: "Zap",
          title: "Nexvyro Fitness +5 ⚡ rewards loop",
          text: "Track workouts in the Nexvyro Fitness app to earn +5 reward points per session redeemable for stall discounts.",
        },
        {
          icon: "CheckCircle2",
          title: "Immediate pickup support",
          text: "Any issue with your fresh stall pickup order is handled immediately under our refund guarantee.",
        },
      ],
    },
  },

  how: {
    title: "How It Works",
    subtitle: "Three simple steps.",
    steps: [
      { title: "Call us", text: "Call the number and tell us what you want." },
      { title: "We prepare it fresh", text: "We make your order at the stall while you finish your workout." },
      { title: "Pick it up", text: "Walk across, collect your order and enjoy." },
    ],
  },

  supplements: {
    badge: "Coming soon",
    title: "Supplements on our website and app",
    text: "We are getting our supplements range ready for the Nexvyro website and app. Join the waitlist and we will let you know first.",
    formButton: "Notify me",
  },

  app: {
    badge: "Mobile Ecosystem",
    name: "Nexvyro Fitness Mobile App",
    tagline: "Your Bilingual Workout Trainer & Fuel Companion",
    description: "Designed specifically to complement your daily training and stall pickup routine. Track your workouts, earn ⚡ Reward Points, get instant AI guidance in Kannada and English, and manage your nutrition effortlessly.",
    image: "/images/app-preview.jpg",
    features: [
      {
        icon: "Dumbbell",
        title: "Interactive Workout Player",
        desc: "Step-by-step exercise logger with live set counters, animated guidance, and automatic rest timers.",
      },
      {
        icon: "Bot",
        title: "Bilingual AI Fitness Coach",
        desc: "Get instant answers on form, macros, and split recommendations in both Kannada (ಕನ್ನಡ) and English.",
      },
      {
        icon: "Zap",
        title: "Earn ⚡ Reward Points",
        desc: "Gain +5 reward points for every completed workout. Redeem points directly for stall discounts & free shakes.",
      },
      {
        icon: "PieChart",
        title: "Daily Nutrition & Macro Tracker",
        desc: "Real-time energy balance tracking (Protein, Carbs, Fats) calibrated with our fresh gym stall menu.",
      },
      {
        icon: "ShoppingBag",
        title: "Supplements Store & Live Tracking",
        desc: "Order certified Whey Protein, Creatine, and Shakers with dual checkout (Cash ₹ or Points ⚡) and Shiprocket tracking.",
      },
      {
        icon: "TrendingUp",
        title: "Weight & Progress Analytics",
        desc: "Visual charts of your body transformation, personal records, and workout consistency streaks.",
      },
    ],
    stats: [
      { label: "AI Coach Support", value: "English + ಕನ್ನಡ" },
      { label: "Workout Reward", value: "+5 ⚡ Points" },
      { label: "Platform", value: "iOS & Android" },
    ],
  },

  team: {
    title: "Meet the team",
    subtitle: "Three students, one goal: better fuel for your training.",
    members: [
      { name: "Sachin Kumar", role: "Managing Partner", photo: "/images/sachinkumar.jpg" }, // TODO
      { name: "Shivanna", role: "Head of Operations", photo: "/images/shivanna.jpg" }, // TODO
      { name: "Uday K S", role: "Head of Culinary", photo: "/images/uday.jpg" }, // TODO
    ],
  },
};

export default siteData;
