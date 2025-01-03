# app/models/emotion.py
import openai
import os
from dotenv import load_dotenv
from transformers import pipeline

# .env 파일 로드
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

# KoBERT나 KoELECTRA 기반 감정 분석 추가
korean_sentiment = pipeline(
    "sentiment-analysis",
    model="beomi/KcELECTRA-base-v2022"  # 한국어 감정 분석에 특화된 모델
)

async def analyze_emotion(messages: list) -> dict:
    """
    OpenAI를 사용하여 감정을 분석
    """
    combined_text = "\n".join(messages)
    try:
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
        # OpenAI 응답에서 감정 추출
        emotion = response['choices'][0]['message']['content'].strip()
        return {"emotion": emotion}
    except openai.OpenAIError as e:
        raise Exception(f"Op    enAI API 호출 실패: {str(e)}")

async def analyze_emotion_with_transformer(text: str) -> dict:
    """
    Transformer 모델을 사용한 감정 분석 (OpenAI의 보조 또는 대체용)
    """
    try:
        result = korean_sentiment(text)
        return {"emotion": result[0]["label"]}
    except Exception as e:
        raise Exception(f"감정 분석 실패: {str(e)}")
