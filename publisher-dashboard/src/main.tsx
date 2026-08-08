import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./styles/globals.css";

const root = document.getElementById("root");

if (!root) {
  console.error("Root element not found!");
} else {
  try {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  } catch (error) {
    console.error("Failed to render app:", error);
    root.innerHTML = `<div style="color: red; padding: 20px;">Error: ${error instanceof Error ? error.message : "Unknown error"}</div>`;
  }
}
