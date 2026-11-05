/**
 * Templates for the synthetic demo catalog. Brand names are invented on
 * purpose so that no demo row can be mistaken for a real Amazon listing.
 */

export type Season = "none" | "diwali" | "summer" | "monsoon" | "winter" | "school" | "holi";

export interface DemoTemplate {
  categoryId: string;
  subcategory: string;
  name: string;
  priceMin: number;
  priceMax: number;
  season?: Season;
}

export const DEMO_BRANDS = [
  "Novaline", "Kirana Co.", "Urbanloom", "Sundarya", "Voltix", "Hearthwell",
  "Pebblestone", "Trekora", "Lumina Labs", "Chai & Co.", "Zestify", "Brightdesk",
  "Kalpa", "Monsoonly", "Aarohi", "Fitrack", "Playnest", "Inkwise",
];

export const DEMO_TEMPLATES: DemoTemplate[] = [
  // Electronics
  { categoryId: "electronics", subcategory: "Headphones", name: "Wireless Earbuds with ENC, 40h Playback", priceMin: 899, priceMax: 2499 },
  { categoryId: "electronics", subcategory: "Headphones", name: "Over-Ear Bluetooth Headphones", priceMin: 1499, priceMax: 4999 },
  { categoryId: "electronics", subcategory: "Power Banks", name: "20000mAh Fast-Charge Power Bank", priceMin: 1199, priceMax: 2299 },
  { categoryId: "electronics", subcategory: "Smartwatches", name: "AMOLED Smartwatch with Bluetooth Calling", priceMin: 1299, priceMax: 3999 },
  { categoryId: "electronics", subcategory: "Accessories", name: "65W GaN USB-C Charger", priceMin: 999, priceMax: 2199 },
  { categoryId: "electronics", subcategory: "Accessories", name: "Braided USB-C Cable, 2-Pack", priceMin: 249, priceMax: 599 },
  { categoryId: "electronics", subcategory: "Smart Home", name: "Wi-Fi Smart Plug, 16A", priceMin: 699, priceMax: 1299, season: "diwali" },
  { categoryId: "electronics", subcategory: "Lighting", name: "Decorative LED String Lights, 15m", priceMin: 299, priceMax: 799, season: "diwali" },
  { categoryId: "electronics", subcategory: "Speakers", name: "Portable Waterproof Bluetooth Speaker", priceMin: 1299, priceMax: 3499 },
  { categoryId: "electronics", subcategory: "Computer Accessories", name: "Wireless Keyboard and Mouse Combo", priceMin: 899, priceMax: 1999, season: "school" },
  { categoryId: "electronics", subcategory: "Cameras", name: "1080p Wi-Fi Home Security Camera", priceMin: 1499, priceMax: 2999 },
  { categoryId: "electronics", subcategory: "Fans", name: "Rechargeable Table Fan with Light", priceMin: 1199, priceMax: 2499, season: "summer" },
  { categoryId: "electronics", subcategory: "Mobile Accessories", name: "Magnetic Phone Car Mount", priceMin: 349, priceMax: 899 },
  { categoryId: "electronics", subcategory: "Gaming", name: "Wired Gaming Controller for PC", priceMin: 799, priceMax: 1799 },

  // Home & Kitchen
  { categoryId: "home-kitchen", subcategory: "Cookware", name: "Non-Stick Kadai with Lid, 24cm", priceMin: 899, priceMax: 1899 },
  { categoryId: "home-kitchen", subcategory: "Cookware", name: "Triply Stainless Steel Pressure Cooker, 3L", priceMin: 1999, priceMax: 3499 },
  { categoryId: "home-kitchen", subcategory: "Appliances", name: "Electric Kettle, 1.5L Stainless Steel", priceMin: 699, priceMax: 1499 },
  { categoryId: "home-kitchen", subcategory: "Appliances", name: "Mixer Grinder, 750W, 3 Jars", priceMin: 2499, priceMax: 4999, season: "diwali" },
  { categoryId: "home-kitchen", subcategory: "Storage", name: "Airtight Kitchen Containers, Set of 6", priceMin: 499, priceMax: 1199 },
  { categoryId: "home-kitchen", subcategory: "Water Bottles", name: "Insulated Steel Water Bottle, 1L", priceMin: 499, priceMax: 1099, season: "summer" },
  { categoryId: "home-kitchen", subcategory: "Home Decor", name: "Brass Diya Set for Pooja, 5 pcs", priceMin: 299, priceMax: 999, season: "diwali" },
  { categoryId: "home-kitchen", subcategory: "Home Decor", name: "Handwoven Cotton Cushion Covers, Set of 5", priceMin: 449, priceMax: 999, season: "diwali" },
  { categoryId: "home-kitchen", subcategory: "Bedding", name: "Microfibre Comforter, Double", priceMin: 999, priceMax: 2499, season: "winter" },
  { categoryId: "home-kitchen", subcategory: "Cleaning", name: "Spin Mop with Bucket", priceMin: 899, priceMax: 1799, season: "monsoon" },
  { categoryId: "home-kitchen", subcategory: "Rain Gear", name: "Clothes Drying Stand, Foldable", priceMin: 1199, priceMax: 2499, season: "monsoon" },
  { categoryId: "home-kitchen", subcategory: "Lunch Boxes", name: "Leak-Proof Steel Lunch Box, 3 Tier", priceMin: 499, priceMax: 999, season: "school" },
  { categoryId: "home-kitchen", subcategory: "Appliances", name: "Room Heater, 2000W Oil-Filled", priceMin: 4999, priceMax: 8999, season: "winter" },

  // Fashion
  { categoryId: "fashion", subcategory: "Ethnic Wear", name: "Women's Cotton Kurta Set", priceMin: 699, priceMax: 1799, season: "diwali" },
  { categoryId: "fashion", subcategory: "Ethnic Wear", name: "Men's Silk Blend Kurta Pyjama", priceMin: 899, priceMax: 2199, season: "diwali" },
  { categoryId: "fashion", subcategory: "Footwear", name: "Men's Running Shoes, Lightweight", priceMin: 999, priceMax: 2499 },
  { categoryId: "fashion", subcategory: "Footwear", name: "Women's Waterproof Flip-Flops", priceMin: 249, priceMax: 599, season: "monsoon" },
  { categoryId: "fashion", subcategory: "Watches", name: "Analog Watch with Leather Strap", priceMin: 799, priceMax: 2499 },
  { categoryId: "fashion", subcategory: "Bags", name: "Laptop Backpack, 30L Water-Resistant", priceMin: 799, priceMax: 1999, season: "school" },
  { categoryId: "fashion", subcategory: "Winter Wear", name: "Men's Puffer Jacket", priceMin: 1299, priceMax: 2999, season: "winter" },
  { categoryId: "fashion", subcategory: "Accessories", name: "Polarised Sunglasses, UV400", priceMin: 399, priceMax: 1299, season: "summer" },
  { categoryId: "fashion", subcategory: "Innerwear", name: "Men's Cotton Trunks, Pack of 3", priceMin: 399, priceMax: 799 },
  { categoryId: "fashion", subcategory: "Rain Gear", name: "Unisex Raincoat with Hood", priceMin: 499, priceMax: 1199, season: "monsoon" },
  { categoryId: "fashion", subcategory: "Ethnic Wear", name: "Holi White Cotton Kurta", priceMin: 399, priceMax: 899, season: "holi" },
  { categoryId: "fashion", subcategory: "Jewellery", name: "Oxidised Silver Jhumka Earrings", priceMin: 199, priceMax: 599, season: "diwali" },

  // Beauty & Personal Care
  { categoryId: "beauty", subcategory: "Skin Care", name: "Vitamin C Face Serum, 30ml", priceMin: 399, priceMax: 899 },
  { categoryId: "beauty", subcategory: "Skin Care", name: "SPF 50 Sunscreen Gel, 50g", priceMin: 299, priceMax: 699, season: "summer" },
  { categoryId: "beauty", subcategory: "Skin Care", name: "Ceramide Moisturiser, 100ml", priceMin: 349, priceMax: 799, season: "winter" },
  { categoryId: "beauty", subcategory: "Hair Care", name: "Onion Hair Oil, 250ml", priceMin: 249, priceMax: 499 },
  { categoryId: "beauty", subcategory: "Hair Care", name: "Anti-Frizz Shampoo, 340ml", priceMin: 299, priceMax: 649, season: "monsoon" },
  { categoryId: "beauty", subcategory: "Grooming", name: "Cordless Beard Trimmer, 90 min Runtime", priceMin: 999, priceMax: 2199 },
  { categoryId: "beauty", subcategory: "Fragrance", name: "Long-Lasting Perfume Gift Set", priceMin: 599, priceMax: 1499, season: "diwali" },
  { categoryId: "beauty", subcategory: "Makeup", name: "Matte Liquid Lipstick, Set of 4", priceMin: 399, priceMax: 899 },
  { categoryId: "beauty", subcategory: "Bath", name: "Herbal Gulal Holi Colours, 5 Pack", priceMin: 199, priceMax: 499, season: "holi" },
  { categoryId: "beauty", subcategory: "Personal Care", name: "Electric Toothbrush, 3 Modes", priceMin: 899, priceMax: 1999 },
  { categoryId: "beauty", subcategory: "Skin Care", name: "Lip Balm with SPF, Pack of 3", priceMin: 199, priceMax: 449, season: "winter" },

  // Sports & Fitness
  { categoryId: "sports", subcategory: "Yoga", name: "Anti-Slip Yoga Mat, 6mm", priceMin: 499, priceMax: 1199 },
  { categoryId: "sports", subcategory: "Strength", name: "Adjustable Dumbbell Set, 20kg", priceMin: 1999, priceMax: 4499 },
  { categoryId: "sports", subcategory: "Strength", name: "Resistance Bands, Set of 5", priceMin: 349, priceMax: 899 },
  { categoryId: "sports", subcategory: "Cricket", name: "English Willow Cricket Bat", priceMin: 1999, priceMax: 5999, season: "summer" },
  { categoryId: "sports", subcategory: "Cycling", name: "Bicycle Helmet with LED Light", priceMin: 899, priceMax: 1999 },
  { categoryId: "sports", subcategory: "Badminton", name: "Graphite Badminton Racquet Pair", priceMin: 999, priceMax: 2499, season: "winter" },
  { categoryId: "sports", subcategory: "Fitness Accessories", name: "Skipping Rope with Counter", priceMin: 199, priceMax: 499 },
  { categoryId: "sports", subcategory: "Nutrition Accessories", name: "Protein Shaker Bottle, 700ml", priceMin: 199, priceMax: 449 },
  { categoryId: "sports", subcategory: "Outdoor", name: "Trekking Pole, Anti-Shock", priceMin: 599, priceMax: 1299, season: "winter" },
  { categoryId: "sports", subcategory: "Swimming", name: "Anti-Fog Swimming Goggles", priceMin: 299, priceMax: 799, season: "summer" },
  { categoryId: "sports", subcategory: "Fitness Equipment", name: "Foldable Walking Pad Treadmill", priceMin: 14999, priceMax: 24999 },

  // Toys & Games
  { categoryId: "toys", subcategory: "Building Sets", name: "Magnetic Building Tiles, 60 pcs", priceMin: 1299, priceMax: 2999, season: "diwali" },
  { categoryId: "toys", subcategory: "Board Games", name: "Family Strategy Board Game", priceMin: 599, priceMax: 1499, season: "diwali" },
  { categoryId: "toys", subcategory: "Educational", name: "STEM Robotics Kit for Kids", priceMin: 1499, priceMax: 3499, season: "school" },
  { categoryId: "toys", subcategory: "Remote Control", name: "RC Stunt Car, Rechargeable", priceMin: 999, priceMax: 2199, season: "diwali" },
  { categoryId: "toys", subcategory: "Puzzles", name: "1000-Piece Jigsaw Puzzle, India Landmarks", priceMin: 399, priceMax: 899, season: "winter" },
  { categoryId: "toys", subcategory: "Outdoor Play", name: "Water Gun Pichkari, Large", priceMin: 199, priceMax: 699, season: "holi" },
  { categoryId: "toys", subcategory: "Soft Toys", name: "Plush Teddy Bear, 3ft", priceMin: 699, priceMax: 1499 },
  { categoryId: "toys", subcategory: "Arts & Crafts", name: "Kids Art Set, 150 pcs", priceMin: 499, priceMax: 1199, season: "school" },
  { categoryId: "toys", subcategory: "Card Games", name: "Party Card Game for Adults", priceMin: 299, priceMax: 699 },
  { categoryId: "toys", subcategory: "Ride-Ons", name: "Kids Balance Bike", priceMin: 1999, priceMax: 3999 },

  // Grocery
  { categoryId: "grocery", subcategory: "Dry Fruits", name: "Premium Dry Fruits Gift Box, 500g", priceMin: 699, priceMax: 1499, season: "diwali" },
  { categoryId: "grocery", subcategory: "Tea", name: "Assam CTC Tea, 1kg", priceMin: 399, priceMax: 699, season: "winter" },
  { categoryId: "grocery", subcategory: "Coffee", name: "South Indian Filter Coffee, 500g", priceMin: 349, priceMax: 649 },
  { categoryId: "grocery", subcategory: "Healthy Snacks", name: "Roasted Makhana, Peri Peri, 200g", priceMin: 199, priceMax: 399 },
  { categoryId: "grocery", subcategory: "Sweets", name: "Kaju Katli Gift Pack, 500g", priceMin: 499, priceMax: 999, season: "diwali" },
  { categoryId: "grocery", subcategory: "Staples", name: "Cold-Pressed Groundnut Oil, 1L", priceMin: 299, priceMax: 499 },
  { categoryId: "grocery", subcategory: "Beverages", name: "Instant Nimbu Pani Mix, 500g", priceMin: 149, priceMax: 299, season: "summer" },
  { categoryId: "grocery", subcategory: "Breakfast", name: "High-Protein Muesli, 750g", priceMin: 349, priceMax: 599 },
  { categoryId: "grocery", subcategory: "Spices", name: "Organic Turmeric Powder, 500g", priceMin: 199, priceMax: 349 },
  { categoryId: "grocery", subcategory: "Honey", name: "Raw Forest Honey, 500g", priceMin: 349, priceMax: 699, season: "winter" },

  // Office Products
  { categoryId: "office", subcategory: "Notebooks", name: "A5 Hardbound Notebook, Pack of 4", priceMin: 299, priceMax: 599, season: "school" },
  { categoryId: "office", subcategory: "Pens", name: "Gel Pens, Pack of 20", priceMin: 149, priceMax: 349, season: "school" },
  { categoryId: "office", subcategory: "Desk Accessories", name: "Ergonomic Laptop Stand, Aluminium", priceMin: 899, priceMax: 1999 },
  { categoryId: "office", subcategory: "Furniture", name: "Mesh Office Chair with Lumbar Support", priceMin: 4999, priceMax: 9999 },
  { categoryId: "office", subcategory: "Desk Accessories", name: "Desk Organiser, Bamboo", priceMin: 499, priceMax: 999 },
  { categoryId: "office", subcategory: "Planners", name: "2027 Daily Planner, Undated", priceMin: 399, priceMax: 799, season: "winter" },
  { categoryId: "office", subcategory: "Calculators", name: "Scientific Calculator, 417 Functions", priceMin: 499, priceMax: 1099, season: "school" },
  { categoryId: "office", subcategory: "Printing", name: "A4 Copier Paper, 500 Sheets", priceMin: 299, priceMax: 449 },
  { categoryId: "office", subcategory: "Lighting", name: "LED Desk Lamp with USB Port", priceMin: 699, priceMax: 1499 },

  // Other
  { categoryId: "other", subcategory: "Pet Supplies", name: "Orthopaedic Dog Bed, Medium", priceMin: 999, priceMax: 2499 },
  { categoryId: "other", subcategory: "Pet Supplies", name: "Grain-Free Cat Food, 1.2kg", priceMin: 499, priceMax: 899 },
  { categoryId: "other", subcategory: "Garden", name: "Self-Watering Planters, Set of 3", priceMin: 499, priceMax: 1199, season: "monsoon" },
  { categoryId: "other", subcategory: "Automotive", name: "Tyre Inflator, Portable Digital", priceMin: 1499, priceMax: 2999 },
  { categoryId: "other", subcategory: "Baby", name: "Baby Diaper Pants, Medium, 76 pcs", priceMin: 699, priceMax: 1199 },
  { categoryId: "other", subcategory: "Luggage", name: "Cabin Trolley Bag, 55cm", priceMin: 1999, priceMax: 3999, season: "summer" },
  { categoryId: "other", subcategory: "Health", name: "Digital Thermometer and Pulse Oximeter Kit", priceMin: 899, priceMax: 1599, season: "monsoon" },
  { categoryId: "other", subcategory: "Books", name: "Bestselling Self-Help Paperback", priceMin: 199, priceMax: 499 },
  { categoryId: "other", subcategory: "Pooja Supplies", name: "Rangoli Colour Powder Kit, 10 Shades", priceMin: 199, priceMax: 449, season: "diwali" },
];
