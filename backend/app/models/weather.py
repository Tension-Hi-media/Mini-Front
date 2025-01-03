from fastapi import APIRouter
import requests

router = APIRouter()

@router.get("/api/weather")
async def get_weather():
    API_KEY = "64aa169bc755802a193f9691bb884e93"
    BASE_URL = "https://api.openweathermap.org/data/2.5/weather"
    city_name = "Seoul"
    url = f"{BASE_URL}?q={city_name}&appid={API_KEY}&units=metric"

    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        return {"weather_description": data["weather"][0]["description"]}
    return {"error": "Unable to fetch weather data"}