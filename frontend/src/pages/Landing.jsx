import React from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import FeatureCard from "../components/FeatureCard.jsx";
import Register from "./Register.jsx";
import Login from "./Login.jsx";

export default function Landing() {
  return (
    <div>
      <Navbar />

      <Hero />

      <section className="features">
        <h2>Everything you need for better meetings</h2>

        <div className="feature-container">
          <FeatureCard
            icon="🎥"
            title="Video Calls"
            description="Connect face-to-face with your team from anywhere."
          />

          <FeatureCard
            icon="💬"
            title="Live Chat"
            description="Chat with your team while you're in the meeting."
          />

          <FeatureCard
            icon="🖥️"
            title="Screen Sharing"
            description="Share your screen and collaborate in real time."
          />
        </div>
      </section>

      {/* <Register /> */}
      {/* <Login /> */}
    </div>
  );
}
