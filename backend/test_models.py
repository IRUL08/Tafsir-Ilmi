import sys
sys.path.insert(0, 'backend')
from config import settings
from groq import Groq

client = Groq(api_key=settings.GROQ_API_KEY)
models_to_test = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'allam-2-7b', 'qwen/qwen3.8-27b']

for model in models_to_test:
    try:
        r = client.chat.completions.create(
            messages=[{'role':'user','content':'Reply with this exact JSON only: {"topic":"test","nodes":[],"edges":[]}'}],
            model=model,
            temperature=0.1,
            max_tokens=100,
            timeout=15
        )
        print(f"OK: {model} => {r.choices[0].message.content[:60]}")
    except Exception as e:
        print(f"FAIL: {model} => {str(e)[:100]}")
