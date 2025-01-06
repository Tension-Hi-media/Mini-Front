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
  "few clouds": "url('/images/clear.gif')",
  "scattered clouds": "url('/images/clear.gif')",
  "broken clouds": "url('/images/clear.gif')",
  "overcast clouds": "url('/images/cloudy.gif')",
  "smoke": "url('/images/cloudy.gif')",
  "haze": "url('/images/cloudy.gif')",
  "fog": "url('/images/cloudy.gif')",
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

// 날씨 번역 테이블
const weatherTranslations = {
  "clear sky": "맑음",
  "few clouds": "약간 흐림",
  "scattered clouds": "흐림",
  "broken clouds": "흐림",
  "overcast clouds": "흐림",
  "smoke": "스모그",
  "haze": "안개",
  "fog": "안개",
  "light rain": "비",
  "moderate rain": "비",
  "heavy intensity rain": "폭우",
  "shower rain": "소나기",
  "light snow": "눈",
  "heavy snow": "눈",
  "sleet": "진눈깨비",
  "thunderstorm with light rain": "천둥번개",
  "thunderstorm with heavy rain": "천둥번개",
};

const analyzeEmotion = async (messagesToAnalyze) => {
  try {
    const response = await axios.post("http://127.0.0.1:8000/api/analyze", {
      messages: messagesToAnalyze,
    });
    return response.data.emotion;
  } catch (error) {
    console.error("Error from FastAPI:", error);
    return "기본"; // 기본 상태로 반환
  }
};

const ChatRoom = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [profileImage, setProfileImage] = useState(profileImages["기본"]);
  const [background, setBackground] = useState(defaultBackground);

  const getWeatherDescription = async (cityName) => {
    try {
      const response = await axios.get(
        `http://127.0.0.1:8000/api/weather?city=${cityName}`
      );

      if (response.data.error) {
        console.error("Error from API:", response.data.error);
        return null;
      }

      return {
        description: response.data.weather_description,
        temp: response.data.temperature,
        city: response.data.city,
      };
    } catch (error) {
      console.error("Error fetching weather data:", error);
      return null;
    }
  };

  const handleWeatherBackground = async (description) => {
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
      const cityName =
        newMessage.split("날씨")[0].trim() || "서울"; // 도시명 추출, 기본값 서울
      const weatherData = await getWeatherDescription(cityName);

      if (weatherData) {
        const { description, temp, city } = weatherData;
        const translatedDescription =
          weatherTranslations[description] || description; // 한글 번역 적용
        const weatherResponse = {
          sender: "시스템",
          text: `현재 ${city}의 날씨는 ${translatedDescription}이며, 온도는 ${temp}°C입니다.`,
          emotion: null,
        };

        setMessages((prev) => [...prev, weatherResponse]);
        await handleWeatherBackground(description); // 배경 처리
      } else {
        const errorResponse = {
          sender: "시스템",
          text: "날씨 정보를 가져올 수 없습니다. 다시 시도해 주세요.",
          emotion: null,
        };

        setMessages((prev) => [...prev, errorResponse]);
      }
    } else {
      const emotion = await analyzeEmotion([newMessage]);
      setMessages((prev) =>
        prev.map((msg, index) =>
          index === prev.length - 1 ? { ...msg, emotion } : msg
        )
      );
      setProfileImage(profileImages[emotion] || profileImages["기본"]);
    }

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
