import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ChatRoom from "./components/ChatRoom";


function App() {
  return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ChatRoom />} />
        </Routes>
      </BrowserRouter>
  );
}

export default App;
