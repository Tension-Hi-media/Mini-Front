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
print(torch.cuda.is_available())
def check_gpu():
    # GPU 사용 가능 여부
    can_use_gpu = torch.cuda.is_available()
    if can_use_gpu:
        print("GPU 사용 가능: cuda 디바이스를 사용할 수 있습니다.")
    else:
        print("GPU 사용 불가: CPU만 사용 가능합니다.")

check_gpu()

router = APIRouter()

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
    emotion = request.emotion.split(",")[0].strip()

    # 감정에 따라 영어로 변환
    if emotion == '화남':
        emotion = 'upset'
    elif emotion == '슬픔':
        emotion = 'sad'
    elif emotion == '즐거움':
        emotion = 'joyful'
    elif emotion == '바쁨':
        emotion = 'busy'
    elif emotion == '기본':
        return JSONResponse(content={"message": "기본 감정은 이미지 생성이 필요하지 않습니다."})
    
    # GPU 사용 여부 설정
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    # Stable Diffusion 모델 로드 (FP16, GPU 사용)
    #  - 만약 "variant='fp16'" 버전이 존재하지 않는 모델이면 `revision='fp16', torch_dtype=torch.float16` 방식으로도 시도 가능
    pipe = StableDiffusionPipeline.from_pretrained(
        "CompVis/stable-diffusion-v1-4",
        revision="fp16",           # FP16 가중치
        torch_dtype=torch.float16  # 반정밀도 사용
    ).to(device)

    # 텍스트 프롬프트로 이미지 생성
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
        return {
            "weather_description": data["weather"][0]["description"],
            "temperature": data["main"]["temp"],
        }
    return {"error": "Unable to fetch weather data"}
