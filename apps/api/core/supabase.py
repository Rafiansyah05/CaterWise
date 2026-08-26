from supabase import create_client, Client
from core.config import settings

def get_supabase_client() -> Client:
    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    return create_client(settings.SUPABASE_URL, key)

supabase = get_supabase_client()
