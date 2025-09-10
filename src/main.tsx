import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";        // 네가 만든 App.tsx 경로 유지
import "./index.css";               // Tailwind

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
