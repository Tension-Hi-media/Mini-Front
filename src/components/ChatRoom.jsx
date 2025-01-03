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
  const [selection, setSelection] = useState("color");
  const [background, setBackground] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  const getEmotionColor = async (emotionString) => {
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/analyze-colors", {
        messages: [emotionString],
      });
      const { colors } = response.data;
      return colors.length > 0 ? colors[0] : "#FFFFFF";
    } catch (error) {
      console.error("Error generating colors from emotion:", error);
      return "#FFFFFF";
    }
  };

  const extractEmotion = (emotionString) => {
    if (!emotionString) return null;
    const match = emotionString.match(/^(.*?),/);
    return match ? match[1].trim() : null;
  };

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

    ws.onmessage = async (event) => {
      try {
        const receivedMessage = JSON.parse(event.data);

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

        if (selection === "color") {
          const color = await getEmotionColor(receivedMessage.text);
          setBackground(color);
        } else if (selection === "image") {
          const imageUrl =
            `url(${profileImages[receivedMessage.emotion] || "/images/default.jpg"})`;
          setBackground(imageUrl);
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => console.error("WebSocket Error:", error);
    ws.onclose = () => console.log("WebSocket connection closed.");

    return () => ws.close();
  }, [username, selection]);

  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const currentTime = new Date();

    const userMessage = {
      sender: username,
      text: newMessage,
      emotion: "분석 중...",
      selection,
      timestamp: currentTime.toISOString(),
    };

    socket.send(JSON.stringify(userMessage));

    const analyzedEmotion = await analyzeEmotion(newMessage);

    setMessages((prev) =>
      prev.map((msg, index) =>
        index === prev.length - 1 ? { ...msg, emotion: analyzedEmotion } : msg
      )
    );

    const updatedMessage = { ...userMessage, emotion: analyzedEmotion };
    socket.send(JSON.stringify(updatedMessage));

    setNewMessage("");
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
              <div className="message-info">
                {msg.emotion !== "분석 중..." && (
                  <span className="message-emotion">
                    {msg.emotion ? `(${msg.emotion})` : ""}
                  </span>
                )}
              </div>
            </div>

            <span className="message-time">
              {msg.timestamp ? formatTime(new Date(msg.timestamp)) : formatTime(new Date())}
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
