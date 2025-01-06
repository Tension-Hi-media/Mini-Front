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
  const [imgSrc, setImgSrc] = useState("");
  const [currentTime, setCurrentTime] = useState("");

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

  const sendMessage = async () => {
    if (!newMessage.trim() || !socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    const currentTime = new Date();

    // Create initial message
    const userMessage = {
      sender: username,
      text: newMessage,
      emotion: "분석 중...",
      timestamp: currentTime.toISOString(),
    };

    // Immediately send the initial message
    socket.send(JSON.stringify(userMessage));
    
    // Clear input right away
    setNewMessage("");

    // Start emotion analysis and image generation in parallel
    Promise.all([
      // Emotion analysis
      (async () => {
        try {
          const analyzedEmotion = await analyzeEmotion(newMessage);
          
          // Update message with analyzed emotion
          const updatedMessage = {
            ...userMessage,
            emotion: analyzedEmotion,
          };
          
          // Send updated message with emotion
          socket.send(JSON.stringify(updatedMessage));
          
          // Update local messages state
          setMessages((prev) =>
            prev.map((msg) =>
              msg.text === userMessage.text && msg.sender === username
                ? { ...msg, emotion: analyzedEmotion }
                : msg
            )
          );

          return analyzedEmotion;
        } catch (error) {
          console.error("Error analyzing emotion:", error);
          return "기본";
        }
      })(),
      
      // Image generation (starts in parallel)
      (async (emotion) => {
        try {
          const response = await axios.post(
            "http://127.0.0.1:8000/api/createimage/",
            {
              emotion: emotion,
            }
          );
          
          const imageUrl = response.data.image;
          setImgSrc(imageUrl);
        } catch (error) {
          console.error("Error creating image:", error);
        }
      })()
    ]).catch(error => {
      console.error("Error in parallel operations:", error);
    });
  };

  return (
    <div className="chat-room">
      <div
        className="chat-window"
        style={{
          backgroundImage:
            imgSrc != "" ? `url(data:image/png;base64,${imgSrc})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
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