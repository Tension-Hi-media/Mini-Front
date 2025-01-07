from transformers import pipeline
import re

# Hugging Face 모델 로드
color_generator = pipeline(
    "text2text-generation",
    model="t5-small"
)

def generate_gradient_colors(emotion: str) -> list:
    """
    감정을 기반으로 3가지 HEX 색상을 생성합니다.
    """
    try:
        # 간결한 프롬프트 사용
        prompt = f"List 3 valid HEX color codes for the emotion: {emotion}."
        print(f"Prompt: {prompt}")

        # Hugging Face 모델 호출
        response = color_generator(prompt, max_length=30, num_return_sequences=1)
        generated_text = response[0]["generated_text"]
        print(f"Generated text: {generated_text}")

        # 쉼표로 색상 분리
        colors = [color.strip() for color in generated_text.split(",")]

        # 유효한 HEX 색상만 필터링
        valid_colors = [
            color for color in colors if re.match(r"^#([0-9a-fA-F]{6})$", color)
        ]

        # 유효한 색상이 없을 경우 기본값 반환
        if not valid_colors:
            print("No valid HEX colors found, returning default colors.")
            return ["#FFFFFF", "#000000", "#CCCCCC"]

        return valid_colors
    except Exception as e:
        print(f"Error generating colors: {str(e)}")
        return ["#FFFFFF", "#000000", "#CCCCCC"]

