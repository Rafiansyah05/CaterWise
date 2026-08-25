from pydantic import BaseModel
from typing import List, Dict, Optional, Any

class ForecastRequest(BaseModel):
    restaurant_id: str
    target_date: str # YYYY-MM-DD
    weather_info: Optional[str] = None

class ForecastItem(BaseModel):
    menu_id: str
    menu_name: str
    menu_unit: Optional[str] = "porsi"
    predicted_quantity: float
    model_used: str # "WMA" or "XGBoost"
    ai_justification: Optional[str] = None
    mae: Optional[float] = None
    mape: Optional[float] = None
    model_config = {'protected_namespaces': ()}

class ForecastResponse(BaseModel):
    target_date: str
    forecasts: List[ForecastItem]
    ai_insight: Optional[str] = None
    weather_info: Optional[str] = None
