import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./../assets/css/main.css";

const profileImages = {
  기본: {
    user1: "/images/user1_default.jpg",
    user2: "/images/user2_default.png",
  },
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
  smoke: "url('/images/cloudy.gif')",
  haze: "url('/images/cloudy.gif')",
  fog: "url('/images/cloudy.gif')",
  "light rain": "url('/images/rain.gif')",
  "moderate rain": "url('/images/rain.gif')",
  "heavy intensity rain": "url('/images/rain.gif')",
  "shower rain": "url('/images/rain.gif')",
  "light snow": "url('/images/snow.gif')",
  "heavy snow": "url('/images/snow.gif')",
  sleet: "url('/images/snow.gif')",
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
  smoke: "스모그",
  haze: "안개",
  fog: "안개",
  "light rain": "비",
  "moderate rain": "비",
  "heavy intensity rain": "폭우",
  "shower rain": "소나기",
  "light snow": "눈",
  "heavy snow": "눈",
  sleet: "진눈깨비",
  "thunderstorm with light rain": "천둥번개",
  "thunderstorm with heavy rain": "천둥번개",
};

const ChatRoom = () => {
  const { username } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [socket, setSocket] = useState(null);

  // 감정 기반 배경 (Base64 이미지)
  const [imgSrc, setImgSrc] = useState("");
  // 현재 시각
  const [currentTime, setCurrentTime] = useState("");

  // 날씨 오버레이 배경
  const [weatherOverlay, setWeatherOverlay] = useState("none");
  // **상단에 표시할 날씨 정보**
  const [weatherInfo, setWeatherInfo] = useState("");

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

  // 날씨 데이터 가져오기
  const getWeatherData = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/weather");
      return response.data; 
      // 예: { weather_description: "light rain", temperature: 23.4 }
    } catch (error) {
      console.error("Error fetching weather data:", error);
      return null;
    }
  };

  // 날씨 배경 설정
const handleWeatherBackground = async () => {
    const data = await getWeatherData();
    if (!data || data.error) {
      console.error("Cannot fetch weather data or got an error");
      return;
    }

    // 날씨 설명(영문)
    const description = data.weather_description || "";
    // 온도
    const temp = Math.round(data.temperature || 0);

    // 한글 변환
    const krDesc = weatherTranslations[description] || description;
    // 상단 표시용
    setWeatherInfo(`현재 날씨: ${krDesc}, 온도: ${temp}°C`);

    // **일정 시간 후에 사라지도록**
    setTimeout(() => {
      setWeatherInfo("");
    }, 5000); // 5초 뒤에 초기화

    // 날씨 배경(오버레이)도 5초간 표시
    if (weatherBackgrounds[description]) {
      setWeatherOverlay(weatherBackgrounds[description]);
      setTimeout(() => {
        setWeatherOverlay("none");
      }, 5000);
    }
  };

  // 감정 분석 함수
  const analyzeEmotion = async (text) => {
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/analyze", {
        messages: [text],
      });
      return response.data.emotion;
    } catch (error) {
      console.error("Error analyzing emotion:", error);
      return "기본";
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        `${now.getHours().toString().padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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

        // [변경] 만약 배경 이미지가 포함돼 있다면, setImgSrc 호출
        if (receivedMessage.imgSrc) {
          setImgSrc(receivedMessage.imgSrc);
        }
        // 중복 메시지 방지 및 업데이트
        setMessages((prev) => {
          // 만약 텍스트+감정만으로 중복 파악하는 로직이라면
          // (여기에 id를 쓰면 더 좋음)
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

  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // 메시지 보낼 때
  const sendMessage = async () => {
    if (!newMessage.trim() || !socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const currentTime = new Date();
    const userMessage = {
      sender: username,
      text: newMessage,
      emotion: "분석 중...",
      timestamp: currentTime.toISOString(),
      // [변경] 초기엔 imgSrc 없음
      imgSrc: "",
    };

    // (1) WebSocket으로 임시 메시지 전송: 상대방에게 “분석 중...” 표시
    socket.send(JSON.stringify(userMessage));

    // (2) "날씨" 키워드 확인
    if (newMessage.toLowerCase().includes("날씨")) {
      await handleWeatherBackground();
    }
    
    // 입력창 초기화
    setNewMessage("");

    // (3) 감정 분석
    const analyzedEmotion = await analyzeEmotion(newMessage);
    
    // (4) 이미지 생성
    let generatedImg = "";
    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/createimage/",
        {
          emotion: analyzedEmotion,
        }
      );
      generatedImg = response.data.image;
    } catch (error) {
      console.error("Error creating image:", error);
    }

    // [변경] 최종 메시지(감정, imgSrc 업데이트)
    const finalMessage = {
      ...userMessage, // sender, text 등
      emotion: analyzedEmotion,
      imgSrc: generatedImg, // 여기서 서버로부터 받은 Base64 이미지
    };

    // (5) 최종 메시지를 WebSocket으로 전송해, 상대방에게도 최종 감정 & 배경이미지 전달
    socket.send(JSON.stringify(finalMessage));

    // 내 화면에 직접 적용
    if (generatedImg) {
      setImgSrc(generatedImg);
    }
  };

  return (
    <div className="chat-room">
      <div className="chat-header">
        {/* 날씨 정보가 있으면 표시 (5초 지나면 사라짐) */}
        {weatherInfo && (
          <div className="weather-info" style={{ marginTop: "10px" }}>
            {weatherInfo}
          </div>
        )}
      </div>
      <div
        className="chat-window"
        style={{
          position: "relative",
          backgroundImage: imgSrc
            ? `url(data:image/png;base64,${imgSrc})`
            : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          className="chat-back"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: weatherOverlay,
            opacity: 0.8,
            zIndex: 1,
          }}
        ></div>
        <div className="chat-content">
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
                  backgroundColor: getEmotionColor(msg.emotion),
                }}
              >
                <div className="message-text">{msg.text}</div>
                {msg.emotion !== "분석 중..." && (
                  <div className="message-time">
                    {msg.emotion ? `(${msg.emotion})` : ""}
                  </div>
                )}
              </div>
              <span className="message-time">
                {msg.timestamp
                  ? formatTime(new Date(msg.timestamp))
                  : formatTime(new Date())}
              </span>
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
