from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import ForecastRequest, ForecastResponse, ForecastItem
from services.forecasting import get_forecast_for_restaurant
from services.gemini import generate_forecast_insights

app = FastAPI(title="CaterWise API")

# Allow frontend to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "ok", "message": "CaterWise Backend is running"}

@app.post("/forecast", response_model=ForecastResponse)
def generate_forecast(request: ForecastRequest):
    try:
        from core.supabase import supabase
        import asyncio, concurrent.futures
        
        # 1. Cek Caching di Database
        cached = supabase.table('forecast_history').select('*').eq('restaurant_id', request.restaurant_id).eq('target_date', request.target_date).execute()
        if cached.data and len(cached.data) > 0:
            history = cached.data[0]
            items = []
            for item in history['forecast_data']:
                items.append(ForecastItem(
                    menu_id=item["menu_id"],
                    menu_name=item["menu_name"],
                    menu_unit=item.get("menu_unit", "porsi"),
                    predicted_quantity=item["predicted_quantity"],
                    model_used=item["model_used"],
                    ai_justification=item.get("ai_justification", "Dipilih berdasarkan pola data historis."),
                    mae=item.get("mae"),
                    mape=item.get("mape")
                ))
            return ForecastResponse(
                target_date=request.target_date,
                forecasts=items,
                ai_insight=history['ai_insight']
            )

        # 2. Hitung Prediksi Baru — jalankan ML dan Gemini SECARA PARALEL
        import pandas as pd
        from services.forecasting import id_holidays
        target_ts = pd.to_datetime(request.target_date)
        holiday_info = ""
        if target_ts.date() in id_holidays:
            holiday_info = f"Libur Nasional: {id_holidays.get(target_ts.date())}"
        elif target_ts.dayofweek == 6:
            holiday_info = "Hari Minggu (Akhir Pekan)"
        elif target_ts.dayofweek == 5:
            holiday_info = "Hari Sabtu (Akhir Pekan)"
        else:
            holiday_info = "Hari Kerja Biasa"

        # Jalankan ML forecasting di thread pool (non-blocking)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            # Thread 1: hitung semua prediksi ML
            future_forecast = executor.submit(get_forecast_for_restaurant, request.restaurant_id, request.target_date)
            
            # Tunggu hasil ML (ini yang menentukan prompt Gemini)
            forecast_data = future_forecast.result()
            
            # Thread 2: setelah data prediksi ada, kirim ke Gemini secara terpisah
            future_ai = executor.submit(generate_forecast_insights, forecast_data, request.target_date, request.weather_info or "", holiday_info)
            insight_str = future_ai.result()

        import json
        insight_json = {"overall_insight": "Prediksi berhasil dibuat.", "per_menu": {}}
        try:
            insight_json = json.loads(insight_str)
        except Exception as e:
            print("Failed to parse AI JSON:", e)

        items = []
        for item in forecast_data:
            menu_id_str = str(item['menu_id'])
            per_menu = insight_json.get('per_menu')
            if not isinstance(per_menu, dict):
                per_menu = {}
            justification = per_menu.get(menu_id_str, "Dipilih berdasarkan tren historis.")
            item['ai_justification'] = justification
            
            items.append(ForecastItem(
                menu_id=item["menu_id"],
                menu_name=item["menu_name"],
                menu_unit=item.get("menu_unit", "porsi"),
                predicted_quantity=item["predicted_quantity"],
                model_used=item["model_used"],
                ai_justification=justification,
                mae=item.get("mae"),
                mape=item.get("mape")
            ))
            
        overall_insight_val = insight_json.get('overall_insight', 'Prediksi berhasil dibuat.')
        overall_insight = str(overall_insight_val) if overall_insight_val is not None else 'Prediksi berhasil dibuat.'
        
        # 3. Simpan Ke Database
        supabase.table('forecast_history').upsert({
            'restaurant_id': request.restaurant_id,
            'target_date': request.target_date,
            'ai_insight': overall_insight,
            'forecast_data': forecast_data
        }).execute()
        
        return ForecastResponse(
            target_date=request.target_date,
            forecasts=items,
            ai_insight=overall_insight
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/forecast/{history_id}")
def delete_forecast_history(history_id: str):
    try:
        from core.supabase import supabase
        supabase.table('forecast_history').delete().eq('id', history_id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
