import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error
from xgboost import XGBRegressor
from core.supabase import supabase
from typing import Tuple, Dict, Any, List
import holidays
import openmeteo_requests
import requests_cache
from retry_requests import retry

# Setup Open-Meteo client
cache_session = requests_cache.CachedSession('.cache', expire_after=3600)
retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
openmeteo = openmeteo_requests.Client(session=retry_session)  # type: ignore

id_holidays = holidays.ID()

# Cache cuaca di memory untuk mempercepat proses (Mencegah N+1 API Calls)
_local_weather_cache: Dict[str, float] = {}

def prefetch_weather(start_date: pd.Timestamp, end_date: pd.Timestamp):
    """Tarik data cuaca sekaligus (bulk) untuk seluruh rentang tanggal."""
    date_range = pd.date_range(start=start_date, end=end_date)
    missing_dates = [d for d in date_range if d.strftime('%Y-%m-%d') not in _local_weather_cache]
    
    if not missing_dates:
        return # Semua data sudah ada di cache
        
    fetch_start = min(missing_dates)
    fetch_end = max(missing_dates)
    
    try:
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": -7.2504, # Surabaya
            "longitude": 112.7688,
            "daily": "weather_code",
            "timezone": "Asia/Jakarta",
            "start_date": fetch_start.strftime('%Y-%m-%d'),
            "end_date": fetch_end.strftime('%Y-%m-%d')
        }
        response = openmeteo.weather_api(url, params=params)
        if response:
            daily = response[0].Daily()
            if daily is not None:
                variables = daily.Variables(0)
                if variables is not None:
                    w_codes = variables.ValuesAsNumpy()
                    
                    curr_date = fetch_start
                    for w in w_codes:
                        d_str = curr_date.strftime('%Y-%m-%d')
                        _local_weather_cache[d_str] = float(w) if not np.isnan(w) else 0.0
                        curr_date += pd.Timedelta(days=1)
    except Exception as e:
        print(f"Bulk Weather API Error: {e}")

def get_weather_code(target_date: pd.Timestamp) -> float:
    date_str = target_date.strftime('%Y-%m-%d')
    if date_str in _local_weather_cache:
        return _local_weather_cache[date_str]
        
    # Fallback jika somehow belum ter-fetch
    try:
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": -7.2504,
            "longitude": 112.7688,
            "daily": "weather_code",
            "timezone": "Asia/Jakarta",
            "start_date": date_str,
            "end_date": date_str
        }
        response = openmeteo.weather_api(url, params=params)
        if response:
            daily = response[0].Daily()
            if daily is not None:
                variables = daily.Variables(0)
                if variables is not None:
                    w_code = variables.ValuesAsNumpy()[0]
                    val = float(w_code) if not np.isnan(w_code) else 0.0
                    _local_weather_cache[date_str] = val
                    return val
    except Exception as e:
        pass
    return 0.0

def get_holiday_multiplier(target_date: pd.Timestamp) -> float:
    date_obj = target_date.date()
    if date_obj in id_holidays:
        holiday_name = id_holidays.get(date_obj).lower()
        if "fitri" in holiday_name or "lebaran" in holiday_name or "adha" in holiday_name:
            return 0.3 # Turun drastis jika libur hari raya besar
        else:
            return 1.15 # Naik sedikit jika libur nasional biasa
            
    if target_date.dayofweek == 6: # Minggu
        return 1.15
        
    return 1.0

def mean_absolute_percentage_error(y_true, y_pred): 
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    # Avoid division by zero
    non_zero_mask = y_true != 0
    if not np.any(non_zero_mask):
        return 0.0
    return np.mean(np.abs((y_true[non_zero_mask] - y_pred[non_zero_mask]) / y_true[non_zero_mask])) * 100

def wma_predict(series: pd.Series, target_date: pd.Timestamp, window: int = 7) -> float:
    if len(series) < window:
        window = len(series)
    if window == 0:
        return 0.0
    weights = np.arange(1, window + 1)
    wma = np.dot(series.iloc[-window:].to_numpy(dtype=float), weights) / weights.sum()
    
    # Adjust prediction based on calendar events for WMA
    multiplier = get_holiday_multiplier(target_date)
    return float(wma) * multiplier

def extract_calendar_features(target_date: pd.Timestamp) -> List[float]:
    # day_of_week (0=Mon, 6=Sun), is_weekend, month, weather_category, is_major_holiday
    date_obj = target_date.date()
    is_major_holiday = 0.0
    if date_obj in id_holidays:
        h_name = id_holidays.get(date_obj).lower()
        if "fitri" in h_name or "adha" in h_name or "lebaran" in h_name:
            is_major_holiday = 1.0
            
    weather_code = get_weather_code(target_date)
    
    return [
        float(target_date.dayofweek),
        1.0 if target_date.dayofweek >= 5 else 0.0,
        float(target_date.month),
        weather_code,
        is_major_holiday
    ]

def prepare_xgboost_data(df: pd.DataFrame, window: int = 7) -> Tuple[pd.DataFrame, pd.Series]:
    # df must have 'quantity_sold' and 'sales_date' sorted by date
    X = []
    y = []
    
    values = df['quantity_sold'].values
    
    for i in range(len(values) - window):
        features = list(values[i:i+window])
        target_date = df['sales_date'].iloc[i+window]
        features.extend(extract_calendar_features(target_date))
        
        X.append(features)
        y.append(values[i+window])
        
    feature_names = [f"lag_{window-j}" for j in range(window)] + ['day_of_week', 'is_weekend', 'month', 'weather_category', 'is_major_holiday']
    return pd.DataFrame(X, columns=pd.Index(feature_names)), pd.Series(y)

def evaluate_models(df: pd.DataFrame, target_ts: pd.Timestamp) -> Dict[str, Any]:
    """
    Evaluates WMA vs XGBoost.
    - Walk-forward validation 5 hari terakhir untuk KEDUA model (MAE/MAPE akurat)
    - XGBoost ditraining SEKALI pada full data untuk prediksi final (efisien)
    """
    if len(df) > 0:
        min_date = df['sales_date'].min()
        max_date = max(df['sales_date'].max(), target_ts)
        prefetch_weather(min_date, max_date)
        
    window = 7
    if len(df) < window + 5:
        qs_series = df['quantity_sold']
        return {
            "model_used": "WMA",
            "prediction": max(0, round(wma_predict(qs_series, target_ts, window))), # type: ignore
            "mae": None,
            "mape": None
        }

    # Train XGBoost sekali pada n-5 data terakhir untuk evaluasi, lalu 1x lagi pada full data
    train_for_cv = df.iloc[:-5]
    X_cv, y_cv = prepare_xgboost_data(train_for_cv, window)
    xgb_cv = XGBRegressor(
        n_estimators=40, max_depth=3, learning_rate=0.08,
        reg_lambda=1.5, subsample=0.8, colsample_bytree=0.8,
        random_state=42, tree_method='hist'
    )
    if len(X_cv) >= 3:
        xgb_cv.fit(X_cv, y_cv)
    
    # Walk-forward validation 5 hari
    wma_preds, xgb_preds, actuals = [], [], []
    train_vals = train_for_cv['quantity_sold'].values.tolist()
    
    for i in range(5, 0, -1):
        idx = len(df) - i
        actual = df.iloc[idx]['quantity_sold']
        cv_date = df['sales_date'].iloc[idx]
        train_slice = df.iloc[:idx]
        
        wma_pred = wma_predict(train_slice['quantity_sold'], cv_date, window) # type: ignore
        wma_preds.append(max(0, wma_pred))
        
        if len(X_cv) >= 3:
            lags = train_slice['quantity_sold'].iloc[-window:].to_numpy(dtype=float).tolist()
            feats = lags + extract_calendar_features(cv_date)
            X_test = pd.DataFrame([feats], columns=X_cv.columns)
            xgb_preds.append(max(0, float(xgb_cv.predict(X_test)[0])))
        else:
            xgb_preds.append(max(0, wma_pred))
        
        actuals.append(actual)

    wma_mae  = mean_absolute_error(actuals, wma_preds)
    xgb_mae  = mean_absolute_error(actuals, xgb_preds)
    wma_mape = mean_absolute_percentage_error(actuals, wma_preds)
    xgb_mape = mean_absolute_percentage_error(actuals, xgb_preds)

    # Final prediction: latih ulang XGBoost pada seluruh data
    X_full, y_full = prepare_xgboost_data(df, window)
    xgb_final = XGBRegressor(
        n_estimators=40, max_depth=3, learning_rate=0.08,
        reg_lambda=1.5, subsample=0.8, colsample_bytree=0.8,
        random_state=42, tree_method='hist'
    )
    xgb_final.fit(X_full, y_full)
    lags_final = df['quantity_sold'].iloc[-window:].to_numpy(dtype=float).tolist()
    X_test_final = pd.DataFrame(
        [lags_final + extract_calendar_features(target_ts)], columns=X_full.columns
    )
    final_xgb = max(0, float(xgb_final.predict(X_test_final)[0]))
    final_wma = max(0, wma_predict(df['quantity_sold'], target_ts, window)) # type: ignore

    if xgb_mae <= wma_mae:
        return {
            "model_used": "XGBoost",
            "prediction": round(final_xgb),
            "mae": round(xgb_mae, 2),
            "mape": round(xgb_mape, 2)
        }
    else:
        return {
            "model_used": "WMA",
            "prediction": round(final_wma),
            "mae": round(wma_mae, 2),
            "mape": round(wma_mape, 2)
        }

def get_forecast_for_restaurant(restaurant_id: str, target_date: str) -> List[Dict[str, Any]]:
    # 1. Fetch active menus for restaurant
    menus_response = supabase.table('menus').select('id, name, unit').eq('restaurant_id', restaurant_id).eq('is_active', True).execute()
    menus = menus_response.data
    
    if not menus:
        return []
        
    forecasts = []
    
    for menu in menus:
        menu_id = menu['id']
        
        # 2. Fetch daily sales for this menu
        # We fetch up to target_date (exclusive)
        sales_response = supabase.table('daily_sales') \
            .select('sales_date, quantity_sold') \
            .eq('menu_id', menu_id) \
            .lt('sales_date', target_date) \
            .order('sales_date') \
            .execute()
            
        sales_data = sales_response.data
        
        if not sales_data or len(sales_data) < 3:
            # Not enough data for any meaningful forecast
            forecasts.append({
                "menu_id": menu_id,
                "menu_name": menu['name'],
                "menu_unit": menu.get('unit', 'porsi'),
                "predicted_quantity": 0,
                "model_used": "None (Insufficient Data)",
                "mae": None,
                "mape": None
            })
            continue
            
        df = pd.DataFrame(sales_data)
        df['sales_date'] = pd.to_datetime(df['sales_date']).dt.normalize()
        df = df.groupby('sales_date')['quantity_sold'].sum().reset_index()
        df = df.set_index('sales_date').asfreq('D', fill_value=0).reset_index()
        
        target_ts = pd.to_datetime(target_date).normalize()
        result = evaluate_models(df, target_ts)
        
        forecasts.append({
            "menu_id": menu_id,
            "menu_name": menu['name'],
            "menu_unit": menu.get('unit', 'porsi'),
            "predicted_quantity": result['prediction'],
            "model_used": result['model_used'],
            "mae": result.get('mae'),
            "mape": result.get('mape')
        })
        
    return forecasts
