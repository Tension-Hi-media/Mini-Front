import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./../assets/css/main.css";

const profileImages = {
  기본: {
    user1: "/images/user1_default.jpg",
    user2: "/images/user2_default.jpg",
  },
  화남: "/images/angry.png",
  즐거움: "/images/happy.png",
  슬픔: "/images/sad.png",
  바쁨: "/images/busy.png",
};

const ChatRoom = () => {
  const { username } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [socket, setSocket] = useState(null);

  const getEmotionColor = (emotion) => {
    const emotionColors = {
      즐거움: "#fffccb",
      화남: "#ffc3b1",
      기본: "#dcf8c6",
      슬픔: "#b1daff",
      바쁨: "#D3D3D3",
    };
    return emotionColors[emotion] || emotionColors["기본"];
  };

  // 감정 분석 함수
  const analyzeEmotion = async (text) => {
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/analyze", {
        messages: [text],
      });
      return response.data.emotion; // 감정 결과 반환
    } catch (error) {
      console.error("Error analyzing emotion:", error);
      return "기본"; // 기본값 반환
    }
  };

  useEffect(() => {
    if (!username) {
      console.error("Username is undefined!");
      return;
    }

    const defaultImage =
      profileImages["기본"][username] || "/images/default.jpg";
    setProfileImage(defaultImage);

    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/${username}`);
    setSocket(ws);

    ws.onopen = () => console.log(`WebSocket connected as ${username}`);
    ws.onmessage = (event) => {
      try {
        const receivedMessage = JSON.parse(event.data);

        // 중복 메시지 방지 및 업데이트
        setMessages((prev) => {
          if (
            prev.some(
              (msg) =>
                msg.text === receivedMessage.text &&
                msg.sender === receivedMessage.sender
            )
          ) {
            // 기존 메시지에서 감정을 업데이트
            return prev.map((msg) =>
              msg.text === receivedMessage.text &&
              msg.sender === receivedMessage.sender
                ? { ...msg, emotion: receivedMessage.emotion }
                : msg
            );
          }
          return [...prev, receivedMessage];
        });
      } catch (error) {
        console.error("Invalid JSON:", event.data);
      }
    };
    ws.onerror = (error) => console.error("WebSocket Error:", error);
    ws.onclose = () => console.log("WebSocket connection closed.");

    return () => ws.close();
  }, [username]);
  const extractEmotion = (emotionString) => {
    if (!emotionString) return null;
    const match = emotionString.match(/^(.*?),/);
    return match ? match[1].trim() : null;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const userMessage = {
      sender: username,
      text: newMessage,
      emotion: "분석 중...",
    };

    // WebSocket을 통해 메시지 전송
    socket.send(JSON.stringify(userMessage));

    // REST API로 감정 분석 요청
    const analyzedEmotion = await analyzeEmotion(newMessage);

    // 메시지 상태 업데이트
    setMessages((prev) =>
      prev.map((msg, index) =>
        index === prev.length - 1 ? { ...msg, emotion: analyzedEmotion } : msg
      )
    );

    // 상대방에게도 업데이트된 메시지 전송
    const updatedMessage = { ...userMessage, emotion: analyzedEmotion };
    socket.send(JSON.stringify(updatedMessage));

    setNewMessage(""); // 입력창 초기화
  };

  return (
    <div className="chat-room">
      <div className="chat-window">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message-container ${
              msg.sender === username ? "mine" : "other"
            }`}
          >
            {msg.sender !== username && (
              <img
                src={profileImages["기본"][msg.sender] || "/images/other.jpg"}
                alt={`${msg.sender}의 프로필`}
                className="profile-image"
              />
            )}

            <div
              className="message-bubble"
              style={{
                backgroundColor: getEmotionColor(extractEmotion(msg.emotion)),
              }}
            >
              <div className="message-text">{msg.text}</div>
              {msg.emotion !== "분석 중..." && (
                <div className="message-time">
                  {msg.emotion ? `(${msg.emotion})` : ""}
                </div>
              )}
            </div>

            {msg.sender === username && (
              <img
                src={profileImage}
                alt="내 프로필"
                className="profile-image"
              />
            )}
          </div>
        ))}
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="메시지를 입력하세요..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>전송</button>
      </div>
    </div>
  );
};

export default ChatRoom;
