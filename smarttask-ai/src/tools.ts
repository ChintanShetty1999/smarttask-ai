import { tool } from "ai";
import { z } from "zod";

export const tools = {
  addTask: tool({
    description: "Add a new task to the user's task list",
    parameters: z.object({
      text: z.string().describe("The task description"),
      priority: z
        .enum(["low", "medium", "high"])
        .default("medium")
        .describe("Task priority level"),
    }),
    execute: async ({ text, priority }) => {
      return { success: true, message: `Added task: "${text}" with ${priority} priority` };
    },
  }),

  completeTask: tool({
    description: "Mark a task as complete by searching for matching text",
    parameters: z.object({
      search: z.string().describe("Text to search for in task descriptions"),
    }),
    execute: async ({ search }) => {
      return { success: true, message: `Marked task matching "${search}" as complete` };
    },
  }),

  removeTask: tool({
    description: "Remove a task from the list by searching for matching text",
    parameters: z.object({
      search: z.string().describe("Text to search for in task descriptions"),
    }),
    execute: async ({ search }) => {
      return { success: true, message: `Removed task matching "${search}"` };
    },
  }),

  listTasks: tool({
    description: "List all current tasks with their status and priority",
    parameters: z.object({}),
    execute: async () => {
      return { success: true, message: "Listed all tasks" };
    },
  }),

  setUserName: tool({
    description: "Remember the user's name for personalized interactions",
    parameters: z.object({
      name: z.string().describe("The user's name"),
    }),
    execute: async ({ name }) => {
      return { success: true, message: `Remembered name: ${name}` };
    },
  }),

  getProductivityTip: tool({
    description: "Get a productivity tip based on the user's current task load",
    parameters: z.object({
      context: z.string().optional().describe("Additional context about what the user needs help with"),
    }),
    execute: async ({ context }) => {
      const tips = [
        "Try the Pomodoro technique: 25 minutes of focused work followed by a 5-minute break.",
        "Tackle your highest-priority task first thing — eat the frog!",
        "Break large tasks into smaller, actionable steps.",
        "Set a specific time block for each task to avoid procrastination.",
        "Review and update your task list at the end of each day.",
        "Use the 2-minute rule: if it takes less than 2 minutes, do it now.",
      ];
      const tip = tips[Math.floor(Math.random() * tips.length)];
      return { success: true, tip, context };
    },
  }),
};
