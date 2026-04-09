import { useAgentChat } from "agents/ai-react";
import { useAgent } from "agents/react";
import { useState } from "react";
import type { SmartTaskState, Task } from "./server";

function TaskPanel({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) return null;

  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;

  return (
    <div className="task-panel">
      <div className="task-header">
        <h3>📋 Tasks</h3>
        <span className="task-count">
          {done}/{total} done
        </span>
      </div>
      <div className="task-progress">
        <div
          className="task-progress-bar"
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>
      <ul className="task-list">
        {tasks.map((task) => (
          <li key={task.id} className={`task-item ${task.done ? "done" : ""}`}>
            <span className={`priority-dot ${task.priority}`} />
            <span className="task-text">{task.text}</span>
            {task.done && <span className="check">✓</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<SmartTaskState>({
    tasks: [],
    userName: null,
  });

  const agent = useAgent({
    agent: "SmartTaskAgent",
    onStateUpdate: (newState: SmartTaskState) => setState(newState),
  });

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useAgentChat({
      agent,
    });

  return (
    <div className="app">
      <header className="header">
        <h1>⚡ SmartTask AI</h1>
        <p>
          {state.userName
            ? `Hey ${state.userName}! Let's get things done.`
            : "Your AI-powered productivity assistant"}
        </p>
      </header>

      <div className="main-layout">
        <TaskPanel tasks={state.tasks} />

        <div className="chat-container">
          <div className="messages">
            {messages.length === 0 && (
              <div className="welcome">
                <p>👋 Hi! I'm SmartTask AI. I can help you:</p>
                <ul>
                  <li>📝 Add and manage tasks</li>
                  <li>✅ Track your progress</li>
                  <li>💡 Get productivity tips</li>
                  <li>🎯 Prioritize your work</li>
                </ul>
                <p>Try saying: <em>"Add a high priority task to finish the report"</em></p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                <div className="message-bubble">
                  {msg.parts?.map((part, i) => {
                    if (part.type === "text") {
                      return <span key={i}>{part.text}</span>;
                    }
                    if (part.type === "tool-invocation") {
                      return (
                        <span key={i} className="tool-badge">
                          🔧 {part.toolInvocation.toolName}
                        </span>
                      );
                    }
                    return null;
                  }) ?? msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message assistant">
                <div className="message-bubble typing">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="input-bar">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask me to add a task, give a tip, or anything..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
