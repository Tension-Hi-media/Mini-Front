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

# WebSocket 연결 관리
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

# WebSocket 엔드포인트
@app.websocket("/ws/{username}")
async def websocket_endpoint(websocket: WebSocket, username: str):
    try:
        await manager.connect(websocket)
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            emotion = message.get("emotion", "기본")
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

# 기본 경로
@app.get("/")
async def root():
    return {"message": "FastAPI 서버가 정상적으로 실행 중입니다."}
