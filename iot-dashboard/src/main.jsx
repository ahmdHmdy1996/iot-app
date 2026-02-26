import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import "moment/locale/ar";
import moment from "moment";

// Set moment locale to Arabic
moment.locale("ar");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
