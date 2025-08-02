import React from "react";
import { CodeChangeViewer } from "./code-change-viewer";

const demoSteps = [
  { id: "1", label: "Create file", status: "success" as const },
  { id: "2", label: "Edit config", status: "success" as const },
  { id: "3", label: "Update dependencies", status: "pending" as const },
  { id: "4", label: "Run tests", status: "pending" as const },
];

const demoFiles = [
  {
    path: "src/components/HelloWorld.tsx",
    name: "HelloWorld.tsx",
    language: "typescript",
    content: `import React from 'react';\n\nexport function HelloWorld() {\n  return <div>Hello, world!</div>;\n}`,
    editable: false,
  },
  {
    path: "src/config/app.config.js",
    name: "app.config.js",
    language: "javascript",
    content: `module.exports = {\n  appName: 'Demo',\n  version: '1.0.0',\n};`,
    editable: false,
  },
];

export default function CodeChangeViewerDemo() {
  return (
    <div className="h-[80vh] w-full bg-background p-6">
      <CodeChangeViewer steps={demoSteps} files={demoFiles} error={undefined} />
    </div>
  );
}
