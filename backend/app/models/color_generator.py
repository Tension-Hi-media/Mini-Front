from transformers import pipeline

# Hugging Face 모델 로드
color_generator = pipeline(
    "text2text-generation",
    model="t5-small"  # Hugging Face에서 사용할 T5 모델
)
print(color_generator("Generate 3 HEX colors for happiness"))
def generate_gradient_colors(emotion: str) -> list:
    """
    감정을 기반으로 3가지 HEX 색상을 생성 (알록달록 배경용)
    """
    try:
        prompt = f"Generate 3 HEX color codes for the emotion: {emotion}. Separate each color with a comma."
        response = color_generator(prompt, max_length=20)
        colors = response[0]["generated_text"].strip().split(",")  # 쉼표로 색상 분리

        # 유효한 HEX 색상만 필터링
        valid_colors = [color.strip() for color in colors if color.startswith("#") and len(color.strip()) == 7]

        # 유효한 색상이 없을 경우 기본값 반환
        return valid_colors if valid_colors else ["#FFFFFF", "#000000", "#CCCCCC"]
    except Exception as e:
        raise Exception(f"배경색 생성 실패: {str(e)}")

