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
  sleet: "url('/images/snow.gif')",
  "thunderstorm with light rain": "url('/images/thunderstorm.gif')",
  "thunderstorm with heavy rain": "url('/images/thunderstorm.gif')",
};

const defaultBackground = "url('/images/defaultBg.jpg')";

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
  const getWeatherDescription = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/weather");
      return response.data.weather_description;
    } catch (error) {
      console.error("Error fetching weather data:", error);
      return null;
    }
  };

  // 날씨 배경 설정
  const handleWeatherBackground = async () => {
    const description = await getWeatherDescription();
    if (description && weatherBackgrounds[description]) {
      // 날씨 오버레이를 먼저 설정
      setWeatherOverlay(weatherBackgrounds[description]);

      // 5초 뒤에는 다시 "none"으로 복귀
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
      return response.data.emotion; // 감정 결과 반환
    } catch (error) {
      console.error("Error analyzing emotion:", error);
      return "기본"; // 기본값 반환
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

  // const extractEmotion = (emotionString) => {
  //   if (!emotionString) return null;
  //   const match = emotionString.match(/^(.*?),/);
  //   return match ? match[1].trim() : null;
  // };
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
    };

    // WebSocket을 통해 메시지 전송
    socket.send(JSON.stringify(userMessage));

    // "날씨" 키워드 확인 및 배경 변경
    if (newMessage.toLowerCase().includes("날씨")) {
      await handleWeatherBackground();
    }

    // REST API로 감정 분석 요청
    const analyzedEmotion = await analyzeEmotion(newMessage);

    // 메시지 상태 업데이트
    setMessages((prev) =>
      prev.map((msg, index) =>
        index === prev.length - 1 ? { ...msg, emotion: analyzedEmotion } : msg
      )
    );

    // API 호출하여 이미지 생성
    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/createimage/",
        {
          emotion: analyzedEmotion,
        }
      );

      const imageUrl = response.data.image;
      setImgSrc(imageUrl);
    } catch (error) {
      console.error("Error creating image:", error);
    }

    setNewMessage(""); // 입력창 초기화
  };

  return (
    <div className="chat-room">
      <div
        className="chat-window"
        style={{
          position: "relative",
          // 감정 기반 배경 (만약 imgSrc가 없으면 아예 none으로)
          backgroundImage: imgSrc ? `url(data:image/png;base64,${imgSrc})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
         {/* 날씨 오버레이를 위한 레이어 */}
         <div
          className="chat-back"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            // weatherOverlay가 "none"이면 투명 배경, 아니면 날씨 배경
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
          {/* 생성된 이미지 표시
        {imgSrc && (
          <img src={`data:image/png;base64,${imgSrc}`} alt="Generated" style={{ width: '100%', height: 'auto' }} />
        )} */}
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
