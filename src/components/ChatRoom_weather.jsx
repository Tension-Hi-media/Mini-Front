import React, { useState } from "react";
import axios from "axios";
import "./../assets/css/main.css";

const profileImages = {
  기본: "/images/default.jpg",
  화남: "/images/angry.png",
  즐거움: "/images/happy.png",
  슬픔: "/images/sad.png",
  바쁨: "/images/busy.png",
};

const weatherBackgrounds = {
  "clear sky": "url('/images/clear.gif')",
  "few clouds": "url('/images/cloudy.gif')",
  "scattered clouds": "url('/images/cloudy.gif')",
  "broken clouds": "url('/images/cloudy.gif')",
  "overcast clouds": "url('/images/cloudy.gif')",
  "light rain": "url('/images/rain.gif')",
  "moderate rain": "url('/images/rain.gif')",
  "heavy intensity rain": "url('/images/rain.gif')",
  "shower rain": "url('/images/rain.gif')",
  "light snow": "url('/images/snow.gif')",
  "heavy snow": "url('/images/snow.gif')",
  "sleet": "url('/images/snow.gif')",
  "thunderstorm with light rain": "url('/images/thunderstorm.gif')",
  "thunderstorm with heavy rain": "url('/images/thunderstorm.gif')",
};

const defaultBackground = "url('/images/defaultBg.jpg')";

const analyzeEmotion = async (messagesToAnalyze) => {
  try {
    const response = await axios.post("http://127.0.0.1:8000/api/analyze", {
      messages: messagesToAnalyze,
    });
    return response.data.emotion;
  } catch (error) {
    console.error("Error from FastAPI:", error);
    return "기본"; // 기본 상태로 반환 ddd
  }
};

const ChatRoom = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [profileImage, setProfileImage] = useState(profileImages["기본"]);
  const [background, setBackground] = useState(defaultBackground);

  const getWeatherDescription = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/weather");
      return response.data.weather_description; // 백엔드에서 weather_description 반환
    } catch (error) {
      console.error("Error fetching weather data:", error);
      return null;
    }
  };

  const handleWeatherBackground = async () => {
    const description = await getWeatherDescription();
    if (description && weatherBackgrounds[description]) {
      setBackground(weatherBackgrounds[description]);
      setTimeout(() => setBackground(defaultBackground), 10000); // 10초 후 기본 배경 복원
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage = {
      sender: "나",
      text: newMessage,
      emotion: null,
    };

    setMessages((prev) => [...prev, userMessage]);

    // 메시지에 "날씨" 키워드 포함 여부 확인
    if (newMessage.toLowerCase().includes("날씨")) {
      await handleWeatherBackground();
    }

    const emotion = await analyzeEmotion([newMessage]);
    setMessages((prev) =>
      prev.map((msg, index) =>
        index === prev.length - 1 ? { ...msg, emotion } : msg
      )
    );
    setProfileImage(profileImages[emotion] || profileImages["기본"]);
    setNewMessage("");
  };

  return (
    <div className="chat-room">
      <div
        className="chat-window"
        style={{
          backgroundImage: background,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message-container ${
              msg.sender === "나" ? "mine" : "other"
            }`}
          >
            <div className="message-bubble">
              <div className="message-text">{msg.text}</div>
              <div className="message-time">
                {msg.emotion ? `(${msg.emotion})` : "분석 중..."}
              </div>
            </div>
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
