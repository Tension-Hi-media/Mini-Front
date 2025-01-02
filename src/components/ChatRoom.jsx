import React, { useState, useEffect } from "react";
import axios from "axios";
import "./../assets/css/main.css";
// 감정 결과에 따른 이미지 맵핑
const profileImages = {
  기본: "/images/default.jpg", // 내 기본 프로필 이미지
  화남: "/images/angry.png",
  즐거움: "/images/happy.png",
  슬픔: "/images/sad.png",
  바쁨: "/images/busy.png",
};

// 상대방 더미 응답
const dummyReplies = [
  "네, 알겠습니다!",
  "그건 정말 멋진 일이네요!",
  "조금 더 생각해 볼게요.",
  "좋은 하루 되세요!",
];

const ChatRoom = () => {
  const [messages, setMessages] = useState([]); // 전체 메시지 목록
  const [pendingMessages, setPendingMessages] = useState([]); // 분석 대기 메시지 목록
  const [newMessage, setNewMessage] = useState(""); // 입력된 메시지
  const [profileImage, setProfileImage] = useState(profileImages["기본"]); // 현재 프로필 이미지
  const [loading, setLoading] = useState(false); // 로딩 상태
  const analysisInterval = 10; // 분석 간격 (초)
  const maxPendingMessages = 5; // 최대 메시지 누적 개수

  // OpenAI API 호출
  const analyzeEmotion = async (messagesToAnalyze) => {
    setLoading(true);
    try {
      const combinedText = messagesToAnalyze.map((msg) => msg.text).join("\n");
      const response = await axios.post(
        "https://api.openai.com/v1/completions",
        {
          model: "text-davinci-003",
          prompt: `다음 메시지의 감정을 "기본, 화남, 즐거움, 슬픔, 바쁨" 중 하나로 분석해주세요:\n${combinedText}`,
          max_tokens: 10,
        },
        {
          headers: {
            Authorization: `Bearer YOUR_OPENAI_API_KEY`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = response.data.choices[0].text.trim();
      return result;
    } catch (error) {
      console.error("감정 분석 실패:", error);
      return "기본"; // 기본 값 반환
    } finally {
      setLoading(false);
    }
  };

  // 메시지 전송
  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const userMessage = {
      sender: "나",
      text: newMessage,
      emotion: null, // 초기 감정 값 없음
    };

    setMessages((prev) => [...prev, userMessage]); // 전체 메시지 추가
    setPendingMessages((prev) => [...prev, userMessage]); // 분석 대기 메시지 추가
    setNewMessage("");

    // 일정 시간 후에 상대방 메시지 추가
    setTimeout(addReply, 2000); // 2초 후 상대방 메시지 추가
  };

  // 상대방 메시지 추가
  const addReply = () => {
    const randomReply = dummyReplies[Math.floor(Math.random() * dummyReplies.length)];
    const reply = {
      sender: "상대방",
      text: randomReply,
      emotion: null,
    };

    setMessages((prev) => [...prev, reply]); // 전체 메시지 추가
    setPendingMessages((prev) => [...prev, reply]); // 분석 대기 메시지 추가
  };

  // 조건 만족 시 분석 실행
  const triggerAnalysis = async () => {
    if (pendingMessages.length === 0) return;

    const emotion = await analyzeEmotion(pendingMessages); // 감정 분석 실행
    setProfileImage(profileImages[emotion] || profileImages["기본"]); // 프로필 이미지 변경

    // 모든 누적 메시지의 감정 업데이트
    setMessages((prev) =>
      prev.map((msg) =>
        pendingMessages.includes(msg) ? { ...msg, emotion } : msg
      )
    );

    setPendingMessages([]); // 대기 메시지 초기화
  };

  // 일정 시간마다 분석 실행
  useEffect(() => {
    const interval = setInterval(() => {
      triggerAnalysis(); // 타이머에 따라 분석 실행
    }, analysisInterval * 1000);

    return () => clearInterval(interval);
  }, [pendingMessages]);

  // 메시지 수가 조건을 만족하면 분석 실행
  useEffect(() => {
    if (pendingMessages.length >= maxPendingMessages) {
      triggerAnalysis();
    }
  }, [pendingMessages]);

  return (
    <div className="chat-room">
      <div className="chat-window">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message-container ${msg.sender === "나" ? "mine" : "other"}`}
          >
            {msg.sender !== "나" && (
              <img src="/images/other.jpg" alt="상대방 프로필" className="profile-image" />
            )}
            <div className="message-bubble">
              <div className="message-text">{msg.text}</div>
              <div className="message-time">
                {msg.emotion ? `(${msg.emotion})` : "분석 중..."}
              </div>
            </div>
            {msg.sender === "나" && (
              <img src={profileImage} alt="내 프로필" className="profile-image" />
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