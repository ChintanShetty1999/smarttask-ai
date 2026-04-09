import { AIChatAgent } from "agents/ai-chat-agent";
import { routeAgentRequest } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import { streamText, convertToModelMessages } from "ai";
import { tools } from "./tools";

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

  async onChatMessage(
    onFinish: Parameters<AIChatAgent["onChatMessage"]>[0],
    options?: Parameters<AIChatAgent["onChatMessage"]>[1]
  ) {
    const workersai = createWorkersAI({ binding: this.env.AI });

    // Build a system prompt that includes the user's current tasks
    const taskSummary =
      this.state.tasks.length === 0
        ? "The user has no tasks yet."
        : `Current tasks:\n${this.state.tasks
            .map(
              (t, i) =>
                `${i + 1}. [${t.done ? "✓" : " "}] (${t.priority}) ${t.text}`
            )
            .join("\n")}`;

    const systemPrompt = `You are SmartTask AI, a friendly and helpful productivity assistant.
You help users manage tasks, set priorities, and stay organized.

${taskSummary}

When the user wants to add, complete, remove, or list tasks, use the appropriate tool.
When giving productivity advice, be concise and actionable.
If the user tells you their name, remember it using the setUserName tool.
${this.state.userName ? `The user's name is ${this.state.userName}.` : ""}
Always be encouraging and positive about their progress!`;

    const result = streamText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
      system: systemPrompt,
      messages: await convertToModelMessages(this.messages),
      tools,
      maxSteps: 3,
      onFinish: async (result) => {
        // Persist any tool-call state mutations
        await onFinish(result as any);
      },
      onStepFinish: async (step) => {
        // Process tool results to mutate state
        if (step.toolResults) {
          for (const tr of step.toolResults) {
            this.applyToolResult(tr as any);
          }
        }
      },
    });

    return result.toUIMessageStreamResponse();
  }

  // ── Apply tool side-effects to state ─────────────────────
  private applyToolResult(result: { toolName: string; args: any }) {
    const { toolName, args } = result;

    switch (toolName) {
      case "addTask": {
        const task: Task = {
          id: crypto.randomUUID(),
          text: args.text,
          done: false,
          priority: args.priority ?? "medium",
          createdAt: new Date().toISOString(),
        };
        this.setState({
          ...this.state,
          tasks: [...this.state.tasks, task],
        });
        break;
      }
      case "completeTask": {
        const tasks = this.state.tasks.map((t) =>
          t.text.toLowerCase().includes(args.search.toLowerCase())
            ? { ...t, done: true }
            : t
        );
        this.setState({ ...this.state, tasks });
        break;
      }
      case "removeTask": {
        const tasks = this.state.tasks.filter(
          (t) => !t.text.toLowerCase().includes(args.search.toLowerCase())
        );
        this.setState({ ...this.state, tasks });
        break;
      }
      case "setUserName": {
        this.setState({ ...this.state, userName: args.name });
        break;
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
