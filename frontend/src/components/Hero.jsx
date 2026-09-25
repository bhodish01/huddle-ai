import React from "react";
import { useNavigate } from "react-router-dom";

export default function Hero() {
  const navigate = useNavigate();
  return (
    <section className="hero">
      <div className="hero-content">
        <h1> Meetings that feel simple & connected. </h1>
        <p>Join your team, talk, share and collaborate from anywhere. </p>

        <button onClick={() => navigate("/register")}>Get Started</button>
      </div>

      <div className="hero-visual">
        <div className="video-box">🎥</div>
      </div>
    </section>
  );
}
