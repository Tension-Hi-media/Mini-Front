from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import router as api_router  # REST API 라우터
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import List
import json

app = FastAPI()

# CORS 설정 (React와 통신 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React 프론트엔드 주소
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST API 라우터 등록
app.include_router(api_router, prefix="/api")

# WebSocket 연결 관리 클래스
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        json_message = json.dumps(message)
        for connection in self.active_connections:
            await connection.send_text(json_message)


manager = ConnectionManager()

# WebSocket 엔드포인트 정의
@app.websocket("/ws/{username}")
async def websocket_endpoint(websocket: WebSocket, username: str):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)  # 메시지를 JSON으로 파싱
            emotion = message.get("emotion", "기본")  # 감정 키 가져오기
            response_message = {
                "sender": username,
                "text": message["text"],
                "emotion": emotion,
            }
            await manager.broadcast(response_message)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        disconnect_message = {
            "sender": "System",
            "text": f"{username}님이 나갔습니다.",
            "emotion": "기본",
        }
        await manager.broadcast(disconnect_message)

# 기본 경로 정의
@app.get("/")
async def root():
    return {"message": "FastAPI 서버가 정상적으로 실행 중입니다."}
