from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import openai
import io
import os
import numpy as np
import torch
import base64
from diffusers import StableDiffusionPipeline
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

# 디바이스 설정
device = "cuda" if torch.cuda.is_available() else "cpu"

router = APIRouter()

class MessageRequest(BaseModel):
    messages: list
class ImageRequest(BaseModel):
    emotion: str

@router.post("/analyze")
async def analyze_emotion(request: MessageRequest):
    if not request.messages or len(request.messages) == 0:
        raise HTTPException(status_code=400, detail="Messages cannot be empty")

    try:
        combined_text = "\n".join(request.messages)

        # ChatCompletion 사용
        response = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert in emotion analysis. Your task is to determine the most relevant emotion from the given text."},
                {"role": "user", "content":f"""
                ### Task:
                - Emotion Analysis with Intensity

                ### Instructions:
                1. Analyze the given text and return one of the following five emotions:
                - 기본
                - 화남
                - 즐거움
                - 슬픔
                - 바쁨
                2. The intensity of the emotion as a number between 0 and 10, where 0 means no emotion and 10 means very intense emotion.

                ### Rule:
                - Based on the context of the text, select the most appropriate single emotion.
                - Your response must be one of the five emotions above, written in 한국어.
                - If the input text does not convey any recognizable emotion, respond with '기본'.
                - Do not include any additional explanation, only respond with the emotion and intensity.
                

                ### Input:
                {combined_text}
                """}
            ]
        )
        
        # 응답에서 감정 추출
        emotion = response['choices'][0]['message']['content'].strip()
        return {"emotion": emotion}
    except openai.OpenAIError as e:  # 올바른 예외 처리
        raise HTTPException(status_code=500, detail=f"OpenAI API 호출 실패: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"내부 서버 오류 발생: {str(e)}")


@router.post("/createimage/")
async def create_image_from_(emotion: ImageRequest):

    # 파이프라인 로드
    pipe = StableDiffusionPipeline.from_pretrained("CompVis/stable-diffusion-v1-4")
    pipe.to(device)

    # 텍스트 프롬프트로 이미지 생성
    prompt = f"a backgroud image that implies emotion of {emotion}"
    image = pipe(prompt).images[0]
    
    # 이미지를 메모리 버퍼에 저장
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)

    # Base64 인코딩
    image_base64 = base64.b64encode(buffer.read()).decode('utf-8')

    # 클라이언트에 이미지 데이터 반환
    return JSONResponse(content={"image": image_base64})
