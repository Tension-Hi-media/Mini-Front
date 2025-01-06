from fastapi import APIRouter
import requests

router = APIRouter()

@router.get("/api/weather")
async def get_weather():
    
    API_KEY = "64aa169bc755802a193f9691bb884e93"
    BASE_URL = "https://api.openweathermap.org/data/2.5/weather"
    city = "Seoul"
    url = f"{BASE_URL}?q={city}&appid={API_KEY}&units=metric"

    try:
        response = requests.get(url)
        response.raise_for_status()

        data = response.json()
        return {
            "city": city,
            "weather_description": data["weather"][0]["description"],
            "temperature": data["main"]["temp"],
        }
    except requests.exceptions.RequestException as e:
        return {"error": f"Unable to fetch weather data: {str(e)}"}
