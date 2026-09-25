import React from "react";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  return (
    <nav className="navbar">
      <h2 onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
        Huddle AI
      </h2>

      <div>
        <button onClick={() => navigate("/login")}>Login</button>
        <button onClick={() => navigate("/register")}>Get Started</button>
      </div>
    </nav>
  );
}
