from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.api import router as api_router
import json
from typing import List

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# REST API 라우터 등록
app.include_router(api_router, prefix="/api")

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

@app.websocket("/ws/{username}")
async def websocket_endpoint(websocket: WebSocket, username: str):
    try:
        await manager.connect(websocket)
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # 클라이언트에서 보내는 모든 필드를 확인
            # (text, emotion, imgSrc, etc.)

            text = message.get("text", "")
            emotion = message.get("emotion", "기본")
            img_src = message.get("imgSrc", "")  # <-- 변경점

            response_message = {
                "sender": username,
                "text": text,
                "emotion": emotion,
                "imgSrc": img_src,              # <-- 변경점
            }
            
            # 모든 연결에 브로드캐스트
            await manager.broadcast(response_message)

    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/")
async def root():
    return {"message": "FastAPI 서버가 정상적으로 실행 중입니다."}
