from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.models.emotion_and_color import analyze_emotion_and_generate_colors
from diffusers import StableDiffusionPipeline
import torch
import base64
import io
import os
import numpy as np
import requests
print(torch.cuda.is_available())  # True/False
print(torch.cuda.device_count())  # 몇 개의 GPU가 있는지
print(torch.cuda.get_device_name(0))  # GPU 모델명
router = APIRouter()

device = "cuda" if torch.cuda.is_available() else "cpu"

class MessageRequest(BaseModel):
    messages: list

class ImageRequest(BaseModel):
    emotion: str

@router.post("/analyze")
async def analyze_and_generate_colors(request: MessageRequest):
    """
    메시지를 분석하고 배경색을 생성
    """
    if not request.messages or len(request.messages) == 0:
        raise HTTPException(status_code=400, detail="Messages cannot be empty")

    try:
        # 감정 분석 및 배경색 생성
        result = await analyze_emotion_and_generate_colors(request.messages)
        response = {
            "status": "success",
            "emotion": result.get("emotion", "기본"),
            "colors": result.get("colors", ["#FFFFFF", "#000000", "#CCCCCC"]),
        }
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/createimage/")
async def create_image_from_(request: ImageRequest):
    emotion = request.emotion.split(",")[0].strip()  # ','로 분리하고 앞부분만
    if emotion == '화남':
        emotion = 'angry'
    elif emotion == '슬픔':
        emotion = 'sad'
    elif emotion == '즐거움':
        emotion = 'joyful'
    elif emotion == '바쁨':
        emotion = 'busy'
    elif emotion == '기본':
        return JSONResponse(content={"message": "기본 감정은 이미지 생성이 필요하지 않습니다."})

    # Stable Diffusion 모델 로드 (FP16으로, GPU 사용)
    pipe = StableDiffusionPipeline.from_pretrained(
        "CompVis/stable-diffusion-v1-4",
        revision="fp16",               # 반정밀도 모델 weights
        torch_dtype=torch.float16      # 반정밀도 사용
    ).to(device)

    prompt = f"a background image that implies emotion of {emotion}"
    print(prompt)

    image = pipe(prompt).images[0]

    output_dir = "image"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    image_path = os.path.join(output_dir, f"{emotion}.png")
    image.save(image_path)

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)

    image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    return JSONResponse(content={"image": image_base64})

@router.get("/weather")
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
