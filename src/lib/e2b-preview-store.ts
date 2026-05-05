import type { Sandbox } from "e2b";

export type PreviewSandboxEntry = {
  sandbox: Sandbox;
  previewUrl: string;
  userId: string;
};

/** In-memory sandbox handles per preview session (not durable across serverless instances). */
export const previewSandboxes = new Map<string, PreviewSandboxEntry>();
