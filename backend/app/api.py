from fastapi import FastAPI, APIRouter, HTTPException
from pydantic import BaseModel
from app.models.emotion_and_color import analyze_emotion_and_generate_colors

app = FastAPI()

# 라우터 정의
router = APIRouter()

class MessageRequest(BaseModel):
    messages: list

@router.post("/analyze-colors")
async def analyze_and_generate_colors(request: MessageRequest):
    """
    메시지를 분석하고 배경색을 생성
    """
    if not request.messages or len(request.messages) == 0:
        raise HTTPException(status_code=400, detail="Messages cannot be empty")
    
    try:
        result = await analyze_emotion_and_generate_colors(request.messages)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 라우터 등록
app.include_router(router)
