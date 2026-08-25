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
        model = genai.GenerativeModel('gemini-flash-lite-latest')
        
        prompt = f"Berikut adalah hasil peramalan penjualan rumah makan untuk besok ({target_date}).\n"
        if weather_info:
            prompt += f"Info Cuaca Besok: {weather_info}\n"
        if holiday_info:
            prompt += f"Kondisi Hari: {holiday_info}\n"
        
        prompt += "\nData Prediksi:\n"
        for f in forecasts:
            prompt += f"- ID Menu: {f['menu_id']} | Menu: {f['menu_name']} | Prediksi: {f['predicted_quantity']} porsi | Model: {f['model_used']}\n"
            
        prompt += "\nBerikan analisa. Buatlah respons Anda SECARA KETAT dalam format JSON yang valid. Jangan gunakan tag ```json. Format JSON yang wajib digunakan:\n"
        prompt += '{\n  "overall_insight": "Buat 3-4 poin kesimpulan singkat mengenai pengaruh data cuaca dan kondisi hari terhadap prediksi penjualan. Gunakan baris baru (\\n) untuk setiap poin. Jangan menambahkan informasi eksternal.",\n'
        prompt += '  "per_menu": {\n    "<masukkan ID Menu di sini>": "Tarik kesimpulan logis (1-2 kalimat, 15-20 kata) berdasarkan data yang DIBERIKAN DI ATAS saja. Kaitkan data cuaca dan hari libur dengan menu ini. Pastikan alasan berbeda untuk setiap menu.",\n    "<masukkan ID Menu lainnya>": "..."\n  }\n}'
        
        # predicate=lambda e: False   TIDAK PERNAH retry dalam kondisi apapun
        no_retry = retry.Retry(predicate=lambda e: False)
        response = model.generate_content(
            prompt, 
            generation_config={"response_mime_type": "application/json"},
            request_options={"timeout": 60.0, "retry": no_retry}
        )
        return response.text
    except Exception as e:
        import traceback
        traceback.print_exc()
        return '{"overall_insight": "Gagal mengambil insight AI.", "per_menu": {}}'

def generate_simulation_summary(simulation_results: List[Dict[str, Any]], target_date: str, total_revenue: float, total_cost: float, total_profit: float, weather_info: str = "", holiday_info: str = "") -> str:
    if not settings.GEMINI_API_KEY:
        return "AI Insight tidak tersedia karena API Key belum dikonfigurasi."
    try:
        model = genai.GenerativeModel('gemini-flash-lite-latest')
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
            prompt += f"- {r['menu_name']}: Stok {r['stock']}, Terjual {r['simulated_sold']}, Sisa {r['simulated_surplus']}, Untung/Rugi Rp{r['profit']:,.0f}\n"
        
        prompt += "\nBerikan ringkasan eksekutif (3-4 kalimat) mengenai hasil simulasi ini. Harap singgung pengaruh cuaca/kondisi hari jika relevan. Beritahu apakah rencana produksi ini berisiko rugi/buang-buang stok atau sudah optimal. Gunakan bahasa profesional dan ringkas tanpa format markdown."
        
        no_retry = retry.Retry(predicate=lambda e: False)
        response = model.generate_content(
            prompt,
            request_options={"timeout": 60.0, "retry": no_retry}
        )
        return response.text.strip()
    except Exception as e:
        import traceback
        traceback.print_exc()
        return "Gagal membuat summary simulasi."
