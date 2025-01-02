from app.models.emotion import analyze_emotion
from app.models.color_generator import generate_gradient_colors

async def analyze_emotion_and_generate_colors(messages: list) -> dict:
    """
    OpenAI로 감정을 분석하고 Hugging Face로 다중 색상 생성
    """
    try:
        # 1. 감정 분석
        emotion_result = await analyze_emotion(messages)
        emotion = emotion_result["emotion"]

        # 2. 다중 배경색 생성
        colors = generate_gradient_colors(emotion)

        return {"emotion": emotion, "colors": colors}
    except Exception as e:
        raise Exception(f"분석 또는 색상 생성 실패: {str(e)}")
