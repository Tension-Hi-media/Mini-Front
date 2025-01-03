from .emotion import analyze_emotion
from .color_generator import generate_gradient_colors

def parse_emotion_and_intensity(emotion_with_intensity: str):
    """
    감정과 강도를 분리하며, 불필요한 문자를 제거합니다.
    """
    try:
        # 불필요한 쉼표 제거 및 파싱
        clean_data = emotion_with_intensity.replace(",", "").strip()
        emotion, intensity = clean_data.split()
        return emotion, int(intensity)
    except Exception as e:
        print(f"Error parsing emotion and intensity: {str(e)}")
        return "기본", 5  # 기본값 반환


async def analyze_emotion_and_generate_colors(messages: list) -> dict:
    """
    감정을 분석하고, 그 결과를 기반으로 색상을 생성합니다.
    """
    try:
        # 감정 분석
        emotion_result = await analyze_emotion(messages)
        emotion_with_intensity = emotion_result["emotion_with_intensity"]
        emotion, intensity = parse_emotion_and_intensity(emotion_with_intensity)
        print(f"Parsed Emotion: {emotion}, Intensity: {intensity}")

        # 색상 생성
        colors = generate_gradient_colors(emotion)
        print(f"Generated Colors: {colors}")

        return {"emotion": emotion, "intensity": intensity, "colors": colors}
    except Exception as e:
        print(f"Error: {str(e)}")
        raise Exception("감정 분석 및 색상 생성 실패")

