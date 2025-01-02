import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import ChatRoom from "./components/ChatRoom";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/:username" element={<ChatRoom />} />
      </Routes>
    </Router>
  );
}

export default App;
