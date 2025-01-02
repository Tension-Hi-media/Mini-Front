import React, { useState, useEffect } from "react";
import axios from "axios";
import "./../assets/css/main.css";

const profileImages = {
  기본: "/images/default.jpg",
  화남: "/images/angry.png",
  즐거움: "/images/happy.png",
  슬픔: "/images/sad.png",
  바쁨: "/images/busy.png",
};

const dummyReplies = [
  "네, 알겠습니다!",
  "그건 정말 멋진 일이네요!",
  "조금 더 생각해 볼게요.",
  "좋은 하루 되세요!",
];

const ChatRoom = () => {
  const [messages, setMessages] = useState([]); // 전체 메시지 목록
  const [newMessage, setNewMessage] = useState(""); // 입력된 메시지
  const [profileImage, setProfileImage] = useState(profileImages["기본"]); // 현재 프로필 이미지
  const [loading, setLoading] = useState(false); // 로딩 상태

  // FastAPI 백엔드로 감정 분석 요청
  const analyzeEmotion = async (messagesToAnalyze) => {
    try {
      console.log("Sending data to FastAPI:", { messages: messagesToAnalyze });
      const response = await axios.post("http://127.0.0.1:8000/api/analyze", {
        messages: messagesToAnalyze,
      });
      console.log("Response from FastAPI:", response.data);
      return response.data.emotion;
    } catch (error) {
      console.error("Error from FastAPI:", error);
      throw error;
    }
  };
  
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage = {
      sender: "나",
      text: newMessage,
      emotion: null, // 초기 감정 값 없음
    };

    setMessages((prev) => [...prev, userMessage]); // 메시지 추가

    // 감정 분석 요청
    const emotion = await analyzeEmotion([newMessage]);
    setMessages((prev) =>
      prev.map((msg, index) =>
        index === prev.length - 1 ? { ...msg, emotion } : msg
      )
    );
    setProfileImage(profileImages[emotion] || profileImages["기본"]); // 프로필 이미지 변경

    // 상대방 메시지 추가
    setTimeout(addReply, 2000);
    setNewMessage("");
  };

  const addReply = () => {
    const randomReply =
      dummyReplies[Math.floor(Math.random() * dummyReplies.length)];
    const reply = {
      sender: "상대방",
      text: randomReply,
      emotion: null,
    };

    setMessages((prev) => [...prev, reply]);
  };

  const extractEmotion = (emotionString) => {
    if (!emotionString) return null;
    const match = emotionString.match(/^(.*?),/); 
    return match ? match[1].trim() : null;        
  };

  const getEmotionColor = (emotion) => {
    const emotionColors = {
      "즐거움": "#fffccb", 
      "화남": "#ffc3b1",   
      "기본": "#dcf8c6", 
      "슬픔": "#b1daff",   
      "바쁨": "#D3D3D3" 
    };
    return emotionColors[emotion] || "#dcf8c6"; // 기본 색상
  };

  return (
    <div className="chat-room">
      <div className="chat-window">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message-container ${
              msg.sender === "나" ? "mine" : "other"
            }`}
          >
            {msg.sender !== "나" && (
              <img
                src="/images/other.jpg"
                alt="상대방 프로필"
                className="profile-image"
              />
            )}
            <div className="message-bubble" style={{ backgroundColor: getEmotionColor(extractEmotion(msg.emotion))}}>
              <div className="message-text">{msg.text}</div>
              <div className="message-time">
                {msg.emotion ? `(${msg.emotion})` : "분석 중..."}
              </div>
            </div>
            {msg.sender === "나" && (
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
        <button onClick={sendMessage} disabled={loading}>
          {loading ? "분석 중..." : "전송"}
        </button>
      </div>
    </div>
  );
};

export default ChatRoom;
