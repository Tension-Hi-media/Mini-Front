import openai
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

async def analyze_emotion(messages: list) -> dict:
    """
    OpenAI를 사용하여 감정을 분석
    """
    combined_text = "\n".join(messages)
    try:
        # OpenAI ChatCompletion 사용
        response = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert in emotion analysis. Your task is to determine the most relevant emotion from the given text."},
                {"role": "user", "content": f"""
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
        # 감정 및 강도 추출
        emotion_with_intensity = response['choices'][0]['message']['content'].strip()
        return {"emotion_with_intensity": emotion_with_intensity}
    except openai.OpenAIError as e:
        raise Exception(f"OpenAI API 호출 실패: {str(e)}")
