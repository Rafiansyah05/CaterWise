Created At: 2026-08-24T16:27:31+08:00
Completed At: 2026-08-24T16:27:31+08:00
File Path: `file:///d:/PROJECT/CaterWise/apps/web/src/app/dashboard/page.tsx`
Total Lines: 244
Total Bytes: 11739
Showing lines 1 to 100
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
1: 'use client';
2: 
3: import { useState, useEffect } from 'react';
4: import { createClient } from '@/utils/supabase/client';
5: import { useRouter } from 'next/navigation';
6: // If recharts is not available, we could install it later or use a basic UI for now.
7: // For now, I'll build a clean UI that fetches from our Python Backend.
8: 
9: interface ForecastItem {
10:   menu_id: string;
11:   menu_name: string;
12:   predicted_quantity: number;
13:   model_used: string;
14:   mae?: number;
15:   mape?: number;
16: }
17: 
18: export default function DashboardPage() {
19:   const supabase = createClient();
20:   const router = useRouter();
21:   
22:   const [loading, setLoading] = useState(true);
23:   const [userName, setUserName] = useState('');
24:   const [restaurantId, setRestaurantId] = useState<string | null>(null);
25:   
26:   // Stats
27:   const [totalMenus, setTotalMenus] = useState(0);
28:   const [totalSales, setTotalSales] = useState(0);
29:   
30:   // AI Forecast Data
31:   const [forecasts, setForecasts] = useState<ForecastItem[]>([]);
32:   const [aiInsight, setAiInsight] = useState<string>('');
33:   const [isForecastLoading, setIsForecastLoading] = useState(false);
34:   const [forecastError, setForecastError] = useState('');
35: 
36:   useEffect(() => {
37:     async function loadDashboard() {
38:       const { data: { session } } = await supabase.auth.getSession();
39:       if (!session) {
40:         router.push('/login');
41:         return;
42:       }
43: 
44:       // Fetch User & Restaurant
45:       const { data: profile } = await supabase
46:         .from('profiles')
47:         .select('full_name')
48:         .eq('id', session.user.id)
49:         .single();
50:         
51:       if (profile) setUserName(profile.full_name || 'Pengguna');
52: 
53:       const { data: restaurant } = await supabase
54:         .from('restaurants')
55:         .select('id')
56:         .eq('owner_id', session.user.id)
57:         .single();
58: 
59:       if (restaurant) {
60:         setRestaurantId(restaurant.id);
61:         
62:         // Fetch basic stats
63:         const { count: menuCount } = await supabase
64:           .from('menus')
65:           .select('*', { count: 'exact', head: true })
66:           .eq('restaurant_id', restaurant.id)
67:           .eq('is_active', true);
68:           
69:         setTotalMenus(menuCount || 0);
70: 
71:         // Fetch total sales (sum)
72:         const { data: salesData } = await supabase
73:           .from('daily_sales')
74:           .select('quantity_sold');
75:           
76:         if (salesData) {
77:           const sum = salesData.reduce((acc, curr) => acc + curr.quantity_sold, 0);
78:           setTotalSales(sum);
79:         }
80:       }
81:       setLoading(false);
82:     }
83:     
84:     loadDashboard();
85:   }, [supabase, router]);
86: 
87:   const generateForecast = async () => {
88:     if (!restaurantId) return;
89:     setIsForecastLoading(true);
90:     setForecastError('');
91:     
92:     try {
93:       // In production, this URL should be read from env vars (e.g. NEXT_PUBLIC_API_URL)
94:       const targetDate = new Date();
95:       targetDate.setDate(targetDate.getDate() + 1); // Predict for tomorrow
96:       const dateStr = targetDate.toISOString().split('T')[0];
97:       
98:       const res = await fetch('http://localhost:8000/forecast', {
99:         method: 'POST',
100:         headers: { 'Content-Type': 'application/json' },
The above content does NOT show the entire file contents. If you need to view any lines of the file which were not shown to complete your task, call this tool again to view those lines.
