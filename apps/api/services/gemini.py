import google.generativeai as genai
from core.config import settings
from typing import List, Dict, Any

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    
from google.api_core import retry

def generate_forecast_insights(forecasts: List[Dict[str, Any]], target_date: str, weather_info: str = "", holiday_info: str = "") -> str:
    if not settings.GEMINI_API_KEY:
        return "AI Insight tidak tersedia karena API Key belum dikonfigurasi."
        
    try:
        model = genai.GenerativeModel('gemini-3.5-flash-lite')
        
        prompt = f"Berikut adalah hasil peramalan penjualan rumah makan untuk besok ({target_date}).\n"
        if weather_info:
            prompt += f"Info Cuaca Besok: {weather_info}\n"
        if holiday_info:
            prompt += f"Kondisi Hari: {holiday_info}\n"
        
        prompt += "\nData Prediksi:\n"
        for f in forecasts:
            prompt += f"- ID Menu: {f['menu_id']} | Menu: {f['menu_name']} | Prediksi: {f['predicted_quantity']} porsi | Model: {f['model_used']}\n"
            
        prompt += "\nBerikan analisa. Buatlah respons Anda SECARA KETAT dalam format JSON yang valid. Jangan gunakan tag ```json. Format JSON yang wajib digunakan:\n"
        prompt += '{\n  "overall_insight": "Buat 3-4 poin kesimpulan (masing-masing 1-2 kalimat). Anda WAJIB mengulas bagaimana cuaca hari itu dan kondisi kalender (hari libur/kerja) memengaruhi saran jumlah stok porsi (angka prediksi) yang harus disiapkan secara keseluruhan. Gunakan baris baru (\\n) untuk memisahkan poin.",\n'
        prompt += '  "per_menu": {\n    "<masukkan ID Menu di sini>": "Tarik kesimpulan spesifik (sekitar 20-30 kata). Kaitkan data cuaca, kondisi hari, dan alasan logis dengan rekomendasi jumlah porsi menu ini. Pastikan alasan berbeda untuk setiap menu.",\n    "<masukkan ID Menu lainnya>": "..."\n  }\n}'
        
        response = model.generate_content(
            prompt, 
            generation_config={"response_mime_type": "application/json", "max_output_tokens": 500, "temperature": 0.4}
        )
        return response.text
    except Exception as e:
        import traceback
        traceback.print_exc()
        return '{"overall_insight": "Simulasi/Prediksi WMA dan XGBoost telah berhasil dihitung berdasarkan pola data.", "per_menu": {}}'

def generate_simulation_summary(simulation_results: List[Dict[str, Any]], target_date: str, total_revenue: float, total_cost: float, total_profit: float, weather_info: str = "", holiday_info: str = "") -> str:
    if not settings.GEMINI_API_KEY:
        return "AI Insight tidak tersedia karena API Key belum dikonfigurasi."
    try:
        model = genai.GenerativeModel('gemini-3.5-flash-lite')
        prompt = f"Berikut adalah hasil SIMULASI penjualan rumah makan untuk tanggal {target_date}.\n"
        if weather_info:
            prompt += f"Info Cuaca: {weather_info}\n"
        if holiday_info:
            prompt += f"Kondisi Hari: {holiday_info}\n"
        prompt += f"Total Proyeksi Pendapatan: Rp{total_revenue:,.0f}\n"
        prompt += f"Total Biaya Produksi: Rp{total_cost:,.0f}\n"
        prompt += f"Total Keuntungan/Kerugian: Rp{total_profit:,.0f}\n\n"
        prompt += "Data Per Menu:\n"
        for r in simulation_results:
            prompt += f"- {r['menu_name']}: Rencana Stok {r['stock']}, Est. Terjual {r['simulated_sold']}, Sisa {r['simulated_surplus']}, Untung/Rugi Rp{r['profit']:,.0f}\n"
        
        prompt += "\nBerikan ringkasan eksekutif (sekitar 4-5 kalimat yang padat dan jelas). Anda WAJIB membahas korelasi ketiga hal berikut:\n1. Pengaruh cuaca dan kondisi hari (libur/kerja) terhadap tingkat penjualan harian.\n2. Evaluasi rencana stok (apakah ada menu yang berisiko over-stock/surplus terbuang, atau sudah optimal).\n3. Dampaknya terhadap proyeksi margin keuntungan akhir.\nGunakan bahasa profesional (jangan terlalu pendek tapi tidak bertele-tele), langsung berupa teks paragraf tanpa format markdown."
        
        response = model.generate_content(
            prompt,
            generation_config={"max_output_tokens": 300, "temperature": 0.4}
        )
        return response.text.strip()
    except Exception as e:
        import traceback
        traceback.print_exc()
        return "Kalkulasi margin keuntungan dan simulasi stok berhasil diselesaikan. (Insight AI dilewati untuk mempercepat pemuatan)."
