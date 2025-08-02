import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import Editor from "@monaco-editor/react";

// MonacoEditorWrapper for single-file preview
function MonacoEditorWrapper({ value, language, readOnly = true, height = "60vh" }: { value: string; language: string; readOnly?: boolean; height?: string }) {
  return (
    <Editor
      value={value}
      language={language}
      theme="vs-dark"
      options={{ readOnly, minimap: { enabled: false } }}
      height={height}
    />
  );
}


// Example types for steps and files; adjust as needed
type Step = {
  id: string;
  label: string;
  status: "pending" | "success" | "error";
  description?: string;
};
type CodeFile = {
  path: string;
  name: string;
  language: string;
  content: string;
  editable?: boolean;
};

interface CodeChangeViewerProps {
  steps: Step[];
  files: CodeFile[];
  error?: string;
}

export const CodeChangeViewer: React.FC<CodeChangeViewerProps> = ({ steps, files, error }) => {
  const [activeTab, setActiveTab] = useState(files[0]?.path || "");

  return (
    <div className="flex h-full w-full">
      {/* Sidebar: Steps Timeline */}
      <aside className="w-64 bg-muted border-r flex flex-col p-4">
        <h2 className="font-bold mb-4">Change Steps</h2>
        <ol className="space-y-3">
          {steps.map((step) => (
            <li key={step.id} className="flex items-center gap-2">
              <Badge variant={
                step.status === "success"
                  ? "success"
                  : step.status === "error"
                  ? "destructive"
                  : "secondary"
              }>
                {step.status === "success"
                  ? "✓"
                  : step.status === "error"
                  ? "!"
                  : "..."}
              </Badge>
              <span className="font-medium">{step.label}</span>
            </li>
          ))}
        </ol>
      </aside>

      {/* Main: Tabbed Code Viewer */}
      <main className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="flex-row w-full bg-background border-b">
            {files.map((file) => (
              <TabsTrigger key={file.path} value={file.path} className="truncate">
                {file.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {files.map((file) => (
            <TabsContent key={file.path} value={file.path} className="flex-1 h-full">
              <Card className="h-full">
                <MonacoEditorWrapper
                  value={file.content}
                  language={file.language}
                  readOnly={!file.editable}
                  height="60vh"
                />
              </Card>
            </TabsContent>
          ))}
        </Tabs>
        {/* Status/Error Bar */}
        {error && (
          <div className="bg-red-100 text-red-700 border-t border-red-300 p-2 text-sm">
            {error}
          </div>
        )}
      </main>
    </div>
  );
};
