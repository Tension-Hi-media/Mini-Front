from fastapi import APIRouter, Query
import requests

router = APIRouter()

@router.get("/api/weather")
async def get_weather(city: str = Query(default="Seoul", description="도시 이름")):
    """
    특정 도시의 날씨 정보를 가져오는 API 엔드포인트
    :param city: 사용자로부터 입력받은 도시 이름 (기본값: Seoul)
    """
    API_KEY = "64aa169bc755802a193f9691bb884e93"
    BASE_URL = "https://api.openweathermap.org/data/2.5/weather"
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
