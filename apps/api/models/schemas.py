from pydantic import BaseModel
from typing import List, Dict, Optional, Any

class ForecastRequest(BaseModel):
    restaurant_id: str
    target_date: str
    weather_info: Optional[str] = None

class ForecastItem(BaseModel):
    menu_id: str
    menu_name: str
    menu_unit: Optional[str] = "porsi"
    predicted_quantity: float
    model_used: str
    ai_justification: Optional[str] = None
    mae: Optional[float] = None
    mape: Optional[float] = None
    model_config = {'protected_namespaces': ()}

class ForecastResponse(BaseModel):
    target_date: str
    forecasts: List[ForecastItem]
    ai_insight: Optional[str] = None
    weather_info: Optional[str] = None
class SimulationInputItem(BaseModel):
    menu_id: str
    menu_name: str
    stock: int
    price: float
    hpp: float

class SimulationRequest(BaseModel):
    restaurant_id: str
    target_date: str
    weather_info: Optional[str] = None
    inputs: List[SimulationInputItem]

class SimulationResultItem(BaseModel):
    menu_id: str
    menu_name: str
    stock: int
    estimated_demand: int
    simulated_sold: int
    simulated_surplus: int
    revenue: float
    cost: float
    profit: float

class SimulationResponse(BaseModel):
    target_date: str
    results: List[SimulationResultItem]
    total_revenue: float
    total_cost: float
    total_profit: float
    ai_summary: str
