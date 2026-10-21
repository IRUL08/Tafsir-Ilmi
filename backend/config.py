import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables dari folder backend/ (path absolut)
_ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

class Settings:
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    
    @property
    def is_supabase_configured(self) -> bool:
        return bool(self.SUPABASE_URL and self.SUPABASE_KEY and "masukkan" not in self.SUPABASE_URL)

settings = Settings()

# Inisialisasi Supabase Client (hanya jika konfigurasi ada)
supabase: Client | None = None
if settings.is_supabase_configured:
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
