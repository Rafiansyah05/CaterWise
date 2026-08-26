from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
import os

ENV_FILE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "..", ".env")

class Settings(BaseSettings):
    PROJECT_NAME: str = "CaterWise API"
    
    SUPABASE_URL: str = Field(validation_alias="NEXT_PUBLIC_SUPABASE_URL")
    SUPABASE_ANON_KEY: str = Field(validation_alias="NEXT_PUBLIC_SUPABASE_ANON_KEY", default="")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="")
    
    GEMINI_API_KEY: Optional[str] = None

    class Config:
        env_file = ENV_FILE_PATH
        extra = "ignore"

settings = Settings()

