from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import openai
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

router = APIRouter()

class MessageRequest(BaseModel):
    messages: list

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
                {"role": "system", "content": "당신은 감정을 분석하는 전문가입니다."},
                {"role": "user", "content": f'다음 메시지의 감정을 "기본, 화남, 즐거움, 슬픔, 바쁨" 중 하나로 분석해주세요:\n{combined_text}'}
            ]
        )
        
        # 응답에서 감정 추출
        emotion = response['choices'][0]['message']['content'].strip()
        return {"emotion": emotion}
    except openai.OpenAIError as e:  # 올바른 예외 처리
        raise HTTPException(status_code=500, detail=f"OpenAI API 호출 실패: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"내부 서버 오류 발생: {str(e)}")
