import React from "react";
import ReactDOM from "react-dom/client";
import { DashboardPage } from "./app/dashboard/DashboardPage";
import "./styles/daos-theme.css";
import "./styles/glass.css";
import "./styles/dashboard.css";
import "./styles/runtime.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <DashboardPage />
  </React.StrictMode>,
);
