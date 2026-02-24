import fs from "node:fs";

import { normalizeArenaCadenceSeconds } from "@/lib/arenaConfig";
import type { ArenaAgent, ArenaMessage } from "@/lib/types";

const ARENA_STORE_FILE = process.env.AGENT_ARENA_STORE_FILE ?? "/tmp/agent_social_arena.json";
const MAX_ARENA_MESSAGES = 800;
const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F]/g;

type ArenaStorePayload = {
  agents: ArenaAgent[];
  messages: ArenaMessage[];
};

const EMPTY_STORE: ArenaStorePayload = {
  agents: [],
  messages: []
};

function isArenaAgent(value: ArenaAgent | null): value is ArenaAgent {
  return value !== null;
}

function isArenaMessage(value: ArenaMessage | null): value is ArenaMessage {
  return value !== null;
}

function asCleanText(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.replace(CONTROL_CHARS_REGEX, "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeGoal(value: unknown): ArenaAgent["goal"] {
  if (value === "discover" || value === "engage" || value === "broadcast") {
    return value;
  }
  return "engage";
}

function normalizeTone(value: unknown): ArenaAgent["tone"] {
  if (value === "neutral" || value === "friendly" || value === "technical") {
    return value;
  }
  return "neutral";
}

function asIsoDate(value: unknown): string {
  if (typeof value !== "string") {
    return new Date().toISOString();
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return new Date().toISOString();
  }
  return new Date(parsed).toISOString();
}

function normalizeArenaAgent(value: unknown): ArenaAgent | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Partial<ArenaAgent>;
  const id = asCleanText(raw.id, "");
  if (!id) {
    return null;
  }

  const goal = normalizeGoal(raw.goal);

  return {
    id,
    name: asCleanText(raw.name, "@arena_agent"),
    topic: asCleanText(raw.topic, "general"),
    goal,
    tone: normalizeTone(raw.tone),
    cadenceSeconds: normalizeArenaCadenceSeconds(raw.cadenceSeconds, goal),
    enabled: raw.enabled !== false,
    createdAt: asIsoDate(raw.createdAt)
  };
}

function normalizeArenaMessage(value: unknown): ArenaMessage | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Partial<ArenaMessage>;
  const id = asCleanText(raw.id, "");
  if (!id) {
    return null;
  }

  const sentiment = raw.sentiment === "positive" || raw.sentiment === "negative" ? raw.sentiment : "neutral";
  const score = typeof raw.engagementScore === "number" && Number.isFinite(raw.engagementScore) ? raw.engagementScore : 55;

  return {
    id,
    agentId: asCleanText(raw.agentId, "unknown_agent"),
    agentName: asCleanText(raw.agentName, "@arena_agent"),
    text: asCleanText(raw.text, "(empty)"),
    topic: asCleanText(raw.topic, "general"),
    sentiment,
    engagementScore: Math.max(0, Math.min(100, Math.round(score))),
    createdAt: asIsoDate(raw.createdAt),
    replyToMessageId: raw.replyToMessageId ? asCleanText(raw.replyToMessageId, "") : undefined
  };
}

function readStore(): ArenaStorePayload {
  try {
    if (!fs.existsSync(ARENA_STORE_FILE)) {
      return EMPTY_STORE;
    }

    const raw = fs.readFileSync(ARENA_STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<ArenaStorePayload>;
    const agents = Array.isArray(parsed.agents) ? parsed.agents.map(normalizeArenaAgent).filter(isArenaAgent) : [];
    const messages = Array.isArray(parsed.messages) ? parsed.messages.map(normalizeArenaMessage).filter(isArenaMessage) : [];

    return {
      agents,
      messages: messages.slice(0, MAX_ARENA_MESSAGES)
    };
  } catch {
    return EMPTY_STORE;
  }
}

function writeStore(payload: ArenaStorePayload): void {
  fs.writeFileSync(ARENA_STORE_FILE, JSON.stringify(payload), "utf8");
}

export function listArenaAgents(): ArenaAgent[] {
  return readStore().agents;
}

export function listArenaMessages(options?: { since?: string; limit?: number }): ArenaMessage[] {
  const messages = readStore().messages;
  const limit =
    typeof options?.limit === "number" && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(500, Math.round(options.limit)))
      : undefined;

  if (!options?.since) {
    return limit ? messages.slice(0, limit) : messages;
  }

  const sinceMs = Date.parse(options.since);
  if (Number.isNaN(sinceMs)) {
    return limit ? messages.slice(0, limit) : messages;
  }

  const filtered = messages.filter((message) => Date.parse(message.createdAt) > sinceMs);
  return limit ? filtered.slice(0, limit) : filtered;
}

export function getArenaMessageCount(): number {
  return readStore().messages.length;
}

export function addArenaAgent(agent: ArenaAgent): ArenaAgent {
  const store = readStore();
  store.agents = [agent, ...store.agents.filter((existing) => existing.id !== agent.id)];
  writeStore(store);
  return agent;
}

export function seedArenaAgents(agents: ArenaAgent[]): ArenaAgent[] {
  const store = readStore();

  const byId = new Map<string, ArenaAgent>();
  for (const agent of store.agents) {
    byId.set(agent.id, agent);
  }

  for (const agent of agents) {
    const existing = byId.get(agent.id);
    byId.set(agent.id, existing ? { ...existing, ...agent } : agent);
  }

  store.agents = Array.from(byId.values());
  writeStore(store);

  return store.agents;
}

export function appendArenaMessages(messages: ArenaMessage[]): ArenaMessage[] {
  if (messages.length === 0) {
    return [];
  }

  const store = readStore();
  const next = [...messages, ...store.messages].slice(0, MAX_ARENA_MESSAGES);
  store.messages = next;
  writeStore(store);
  return messages;
}
