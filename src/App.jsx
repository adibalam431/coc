// src/App.jsx
import React from "react";
import JsonArrangerViewer from "./components/JsonArrangerViewer.jsx";
import cocData from "./coc.json";

export default function App() {
  return (
    <div style={{ padding: 12 }}>
      <h2>COC JSON Viewer</h2>
      <JsonArrangerViewer initialData={cocData} />
    </div>
  );
}
