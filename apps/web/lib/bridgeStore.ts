import fs from "node:fs";

import type { TimelinePost } from "@/lib/types";

const STORE_FILE_PATH = process.env.AGENT_BRIDGE_STORE_FILE ?? "/tmp/agent_social_bridge_posts.json";
const MAX_STORED_POSTS = 400;

type BridgeFilePayload = {
  posts: TimelinePost[];
};

function readBridgePayload(): BridgeFilePayload {
  try {
    if (!fs.existsSync(STORE_FILE_PATH)) {
      return { posts: [] };
    }

    const raw = fs.readFileSync(STORE_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<BridgeFilePayload>;
    if (!Array.isArray(parsed.posts)) {
      return { posts: [] };
    }

    return { posts: parsed.posts };
  } catch {
    return { posts: [] };
  }
}

function writeBridgePayload(payload: BridgeFilePayload): void {
  fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(payload), "utf8");
}

export function addBridgePost(post: TimelinePost): TimelinePost {
  const payload = readBridgePayload();
  const nextPosts = [post, ...payload.posts].slice(0, MAX_STORED_POSTS);
  writeBridgePayload({ posts: nextPosts });
  return post;
}

export function getBridgePosts(options?: { since?: string }): TimelinePost[] {
  const payload = readBridgePayload();

  if (!options?.since) {
    return payload.posts;
  }

  const sinceMs = Date.parse(options.since);
  if (Number.isNaN(sinceMs)) {
    return payload.posts;
  }

  return payload.posts.filter((post) => Date.parse(post.createdAt) > sinceMs);
}
