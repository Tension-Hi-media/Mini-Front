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
  const [selection, setSelection] = useState("color"); // 초기 선택: 배경색 변경
  const [background, setBackground] = useState(""); // 배경 스타일

  const getEmotionColor = async (emotionString) => {
    try {
      // FastAPI에 POST 요청
      const response = await axios.post("http://127.0.0.1:8000/api/analyze-colors", {
        messages: [emotionString],
      });
      const { emotion, colors } = response.data; // FastAPI 응답 추출
      console.log("Generated Emotion and Colors:", emotion, colors);
  
      // 반환된 첫 번째 색상을 사용
      return colors.length > 0 ? colors[0] : "#FFFFFF";
    } catch (error) {
      console.error("Error generating colors from emotion:", error);
      return "#FFFFFF"; // 기본값 반환
    }
  };
  

  const extractEmotion = (emotionString) => {
    if (!emotionString) return null;
    const match = emotionString.match(/^(.*?),/); // 감정 문자열에서 쉼표로 구분된 첫 번째 값을 추출
    return match ? match[1].trim() : null;
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
    console.log("Rendered Background Style:", {
      backgroundColor: selection === "color" ? background : undefined,
      backgroundImage: selection === "image" ? background : undefined,
    });
  }, [background, selection]); // 상태 변경 시마다 출력

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

    ws.onmessage = async (event) => {
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
            return prev.map((msg) =>
              msg.text === receivedMessage.text &&
              msg.sender === receivedMessage.sender
                ? { ...msg, emotion: receivedMessage.emotion }
                : msg
            );
          }
          return [...prev, receivedMessage];
        });
    
        // 배경 스타일 업데이트
        if (selection === "color") {
          const color = await getEmotionColor(receivedMessage.text);
          console.log("Setting background color:", color);
          setBackground(color); // 배경색 변경
        } else if (selection === "image") {
          const imageUrl =
            `url(${profileImages[receivedMessage.emotion] || "/images/default.jpg"})`;
          console.log("Setting background image:", imageUrl);
          setBackground(imageUrl); // 배경 이미지 변경
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };
    
    ws.onerror = (error) => console.error("WebSocket Error:", error);
    ws.onclose = () => console.log("WebSocket connection closed.");

    return () => ws.close();
  }, [username, selection]); // selection 변경 시 업데이트

  const sendMessage = async () => {
    if (!newMessage.trim() || !socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const userMessage = {
      sender: username,
      text: newMessage,
      emotion: "분석 중...",
      selection, // 선택한 모드 전달
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
    <div
      className="chat-room"
      style={{
        backgroundColor: selection === "color" ? background : undefined,
        backgroundImage: selection === "image" ? background : undefined,
        backgroundSize: selection === "image" ? "cover" : undefined,
        backgroundPosition: selection === "image" ? "center" : undefined,
        transition: "background 0.5s ease",
      }}
    >

      {/* 유저 선택 버튼 */}
      <div className="selection-buttons">
        <button
          className={selection === "color" ? "active" : ""}
          onClick={() => setSelection("color")}
        >
          배경색 변경
        </button>
        <button
          className={selection === "image" ? "active" : ""}
          onClick={() => setSelection("image")}
        >
          배경 이미지 변경
        </button>
      </div>

      <div className="chat-window">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message-container ${msg.sender === username ? "mine" : "other"
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
