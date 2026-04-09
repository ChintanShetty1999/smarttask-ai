import { AIChatAgent } from "agents/ai-chat-agent";
import { routeAgentRequest } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import { generateText, createUIMessageStream, createUIMessageStreamResponse, convertToModelMessages } from "ai";

// ── State shape ──────────────────────────────────────────────
export interface Task {
  id: string;
  text: string;
  done: boolean;
  priority: "low" | "medium" | "high";
  createdAt: string;
}

export interface SmartTaskState {
  tasks: Task[];
  userName: string | null;
}

const INITIAL_STATE: SmartTaskState = {
  tasks: [],
  userName: null,
};

// ── Agent ────────────────────────────────────────────────────
export class SmartTaskAgent extends AIChatAgent<Env, SmartTaskState> {
  initialState = INITIAL_STATE;

  onError(e: unknown) {
    console.error("SmartTaskAgent.onError:", String(e));
    return e;
  }

  async onChatMessage() {
    try {
      const workersai = createWorkersAI({ binding: this.env.AI });
      const modelMessages = await convertToModelMessages(this.messages);

      // Get the latest user message to detect task intents server-side
      const lastUserMsg = [...this.messages].reverse().find(m => m.role === "user");
      const userText = lastUserMsg?.parts
        ?.filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join(" ") ?? "";

      // Apply task actions from user message directly (no LLM tools needed)
      this.detectAndApplyTaskAction(userText);

      const taskSummary =
        this.state.tasks.length === 0
          ? "The user has no tasks yet."
          : `Current tasks:\n${this.state.tasks
              .map((t, i) => `${i + 1}. [${t.done ? "✓" : " "}] (${t.priority}) ${t.text}`)
              .join("\n")}`;

      const systemPrompt = `You are SmartTask AI, a friendly and conversational AI productivity assistant.
You help users manage tasks and stay productive.

${taskSummary}

${this.state.userName ? `The user's name is ${this.state.userName}.` : ""}

When users greet you, greet them back warmly.
When users ask to add, complete, or remove tasks, confirm that you've done it and encourage them.
When users ask for productivity tips, give a short helpful tip.
Keep all replies concise and positive.`;

      // Call LLM for a natural language response (no tools — avoids the model
      // becoming overly strict about task input format)
      const result = await generateText({
        model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
        system: systemPrompt,
        messages: modelMessages,
      });

      const responseText = result.text ?? "I'm here to help! What would you like to do?";

      // Stream the text reply back so AIChatAgent saves it and sends it to client
      const stream = createUIMessageStream({
        execute: ({ writer }) => {
          const id = crypto.randomUUID();
          writer.write({ type: "text-start", id } as any);
          writer.write({ type: "text-delta", id, delta: responseText } as any);
          writer.write({ type: "text-end", id } as any);
        },
      });

      return createUIMessageStreamResponse({ stream });
    } catch (err) {
      console.error("onChatMessage THREW:", String(err));
      throw err;
    }
  }

  // ── Detect task actions from user message text ───────────────
  private detectAndApplyTaskAction(text: string) {
    const lower = text.toLowerCase();

    // Name detection: "my name is X" / "I'm X" / "call me X"
    const nameMatch = text.match(/(?:my name is|i(?:'m| am)|call me)\s+([A-Z][a-z]+)/i);
    if (nameMatch) {
      this.setState({ ...this.state, userName: nameMatch[1] });
      return;
    }

    // Add task: "add [priority] task [text]" / "add task [text]"
    const addMatch = text.match(/add\s+(?:a\s+)?(?:(high|medium|low)\s+priority\s+)?(?:task\s+(?:to\s+)?|todo\s+)?(.+)/i);
    if (addMatch && lower.includes("add")) {
      const priority = (addMatch[1]?.toLowerCase() ?? "medium") as Task["priority"];
      const taskText = addMatch[2].trim().replace(/^(to\s+)?/i, "").trim();
      if (taskText.length > 2) {
        const task: Task = {
          id: crypto.randomUUID(),
          text: taskText,
          done: false,
          priority,
          createdAt: new Date().toISOString(),
        };
        this.setState({ ...this.state, tasks: [...this.state.tasks, task] });
      }
      return;
    }

    // Complete task: "complete/done/finish [text]"
    if (lower.match(/\b(complete|done|finish|mark.*done|finished)\b/)) {
      const search = text.replace(/\b(complete|done|finish|mark|as|finished|task)\b/gi, "").trim();
      if (search.length > 1) {
        const tasks = this.state.tasks.map(t =>
          t.text.toLowerCase().includes(search.toLowerCase()) ? { ...t, done: true } : t
        );
        this.setState({ ...this.state, tasks });
      }
      return;
    }

    // Remove task: "remove/delete [text]"
    if (lower.match(/\b(remove|delete)\b/)) {
      const search = text.replace(/\b(remove|delete|task)\b/gi, "").trim();
      if (search.length > 1) {
        const tasks = this.state.tasks.filter(
          t => !t.text.toLowerCase().includes(search.toLowerCase())
        );
        this.setState({ ...this.state, tasks });
      }
    }
  }
}

export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routeAgentRequest(request, env)) ??
      env.ASSETS.fetch(request)
    );
  },
} satisfies ExportedHandler<Env>;
