// Realistic mock data for VoxAI Kirana — no lorem ipsum, real TN context

export const shop = {
  name: "Sri Lakshmi Stores",
  owner: "Murugan Pillai",
  locality: "Anna Nagar, Madurai",
  aiNumber: "+91 73580 21190",
  whatsappNumber: "+91 98430 55621",
  plan: "Growth",
};

export const products = [
  { id: "P001", name: "Ponni Rice", brand: "Aachi", unit: "kg", price: 58, stock: 480, category: "Rice & Grains", lowStock: false },
  { id: "P002", name: "Sugar", brand: "Local", unit: "kg", price: 44, stock: 12, category: "Sugar & Salt", lowStock: true },
  { id: "P003", name: "Sunflower Oil", brand: "Gold Winner", unit: "litre", price: 152, stock: 60, category: "Oils", lowStock: false },
  { id: "P004", name: "Toor Dal", brand: "Tata Sampann", unit: "kg", price: 138, stock: 35, category: "Pulses", lowStock: false },
  { id: "P005", name: "Idli Rice", brand: "Aachi", unit: "kg", price: 52, stock: 8, category: "Rice & Grains", lowStock: true },
  { id: "P006", name: "Salt", brand: "Tata", unit: "packet", price: 22, stock: 200, category: "Sugar & Salt", lowStock: false },
  { id: "P007", name: "Maggi Noodles", brand: "Nestle", unit: "box(12)", price: 144, stock: 18, category: "Instant Foods", lowStock: false },
  { id: "P008", name: "Red Chilli Powder", brand: "Aachi", unit: "kg", price: 220, stock: 25, category: "Masala", lowStock: false },
  { id: "P009", name: "Toilet Soap", brand: "Santoor", unit: "dozen", price: 312, stock: 14, category: "Personal Care", lowStock: false },
  { id: "P010", name: "Tea Powder", brand: "Red Label", unit: "kg", price: 410, stock: 22, category: "Beverages", lowStock: false },
];

export const customers = [
  { id: "C001", name: "Kavitha Ramesh", phone: "+91 98421 33012", type: "Retail", locality: "K.K. Nagar, Madurai", ltv: 18420, khata: 0 },
  { id: "C002", name: "Selvam Traders", phone: "+91 94432 87711", type: "Wholesale", locality: "Simmakkal, Madurai", ltv: 142300, khata: 8600 },
  { id: "C003", name: "Priya Anand", phone: "+91 90031 22456", type: "Retail", locality: "Anna Nagar, Madurai", ltv: 6210, khata: 450 },
  { id: "C004", name: "Murugan Stores (Sub-dealer)", phone: "+91 96297 70044", type: "Wholesale", locality: "Tallakulam, Madurai", ltv: 261800, khata: 22400 },
  { id: "C005", name: "Lakshmi Narayanan", phone: "+91 89034 51290", type: "Retail", locality: "Goripalayam, Madurai", ltv: 3120, khata: 0 },
];

export const orders = [
  { id: "ORD-10231", customer: "Kavitha Ramesh", phone: "+91 98421 33012", items: [{n:"Ponni Rice",q:"5 kg",p:290},{n:"Sunflower Oil",q:"2 litre",p:304},{n:"Toor Dal",q:"1 kg",p:138}], total: 732, status: "Confirmed", source: "AI Call", time: "10:42 AM", delivery: "Delivery" },
  { id: "ORD-10230", customer: "Selvam Traders", phone: "+91 94432 87711", items: [{n:"Ponni Rice",q:"50 kg",p:2900},{n:"Sugar",q:"20 kg",p:880}], total: 3780, status: "Packing", source: "AI Call", time: "10:15 AM", delivery: "Pickup" },
  { id: "ORD-10229", customer: "Priya Anand", phone: "+91 90031 22456", items: [{n:"Maggi Noodles",q:"1 box",p:144},{n:"Tea Powder",q:"0.5 kg",p:205}], total: 349, status: "Out for Delivery", source: "WhatsApp", time: "9:58 AM", delivery: "Delivery" },
  { id: "ORD-10228", customer: "Lakshmi Narayanan", phone: "+91 89034 51290", items: [{n:"Idli Rice",q:"3 kg",p:156},{n:"Salt",q:"2 packet",p:44}], total: 200, status: "Delivered", source: "AI Call", time: "9:20 AM", delivery: "Delivery" },
  { id: "ORD-10227", customer: "Murugan Stores (Sub-dealer)", phone: "+91 96297 70044", items: [{n:"Red Chilli Powder",q:"10 kg",p:2200},{n:"Toilet Soap",q:"5 dozen",p:1560}], total: 3760, status: "Placed", source: "AI Call", time: "8:55 AM", delivery: "Pickup" },
];

export const deliveryBoys = [
  { id: "D01", name: "Karthik S", phone: "+91 90474 11220", status: "On Delivery", todayOrders: 6 },
  { id: "D02", name: "Suresh Babu", phone: "+91 87543 99012", status: "Available", todayOrders: 4 },
];

export const analytics = {
  revenueTrend: [
    { day: "Mon", value: 18400 }, { day: "Tue", value: 21200 }, { day: "Wed", value: 19800 },
    { day: "Thu", value: 24600 }, { day: "Fri", value: 28900 }, { day: "Sat", value: 35200 }, { day: "Sun", value: 31100 },
  ],
  sourceBreakdown: [
    { name: "AI Call", value: 62 }, { name: "WhatsApp", value: 28 }, { name: "Manual", value: 10 },
  ],
  topProducts: [
    { name: "Ponni Rice", qty: 820 }, { name: "Sunflower Oil", qty: 410 }, { name: "Sugar", qty: 380 },
    { name: "Toor Dal", qty: 290 }, { name: "Salt", qty: 260 },
  ],
  callSuccessRate: 78,
  avgOrderValue: 642,
  repeatRate: 54,
};
