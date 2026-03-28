/**
 * lib/llm.ts  – LLM provider abstraction (Anthropic + OpenAI)
 * All calls are server-side only. API keys never reach the client.
 */
import type { AIModel, Message, Attachment } from "@/types";

interface LLMMsg {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}
type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "image_url"; image_url: { url: string } };

const SSE = (obj: object) => `data: ${JSON.stringify(obj)}\n\n`;

export async function streamLLM(opts: {
  model: AIModel;
  messages: LLMMsg[];
  system?: string;
  maxTokens?: number;
}): Promise<ReadableStream<Uint8Array>> {
  if (opts.model.startsWith("claude")) return anthropicStream(opts);
  return openaiStream(opts);
}

export function toApiMessages(dbMessages: Message[]): LLMMsg[] {
  return dbMessages
    .filter(m => m.role !== "system")
    .map(m => {
      const atts = (m.attachments ?? []) as Attachment[];
      const imageAtts = atts.filter(a => a.type === "image" && a.data);
      const docAtts = atts.filter(a => a.type === "document" && a.data);
      const hasBlocks = imageAtts.length > 0 || docAtts.length > 0;

      if (!hasBlocks) {
        // Plain text message — fall back to file names if content is empty
        const content = m.content || atts.map(a => `[File: ${a.name}]`).join(" ");
        return { role: m.role as "user" | "assistant", content };
      }

      const blocks: ContentBlock[] = [];
      // Build text part: user message text + inline doc contents
      const docText = docAtts.map(a => `[File: ${a.name}]\n${a.data}`).join("\n\n");
      const fullText = [m.content, docText].filter(Boolean).join("\n\n")
        || atts.filter(a => !a.data).map(a => `[File: ${a.name}]`).join(" ");
      if (fullText) blocks.push({ type: "text", text: fullText });
      for (const img of imageAtts) {
        blocks.push({ type: "image", source: { type: "base64", media_type: img.mimeType, data: img.data! } });
      }
      return { role: m.role as "user" | "assistant", content: blocks };
    })
    .filter(m => {
      if (typeof m.content === "string") return m.content.length > 0;
      return (m.content as ContentBlock[]).length > 0;
    });
}

async function anthropicStream(opts: Parameters<typeof streamLLM>[0]): Promise<ReadableStream<Uint8Array>> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 4096,
      system: opts.system ?? "You are a helpful AI assistant.",
      messages: opts.messages,
      stream: true,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  return wrapStream(res.body!, (line) => {
    if (!line.startsWith("data: ")) return null;
    const d = JSON.parse(line.slice(6));
    if (d.type === "content_block_delta" && d.delta?.type === "text_delta") return d.delta.text;
    return null;
  });
}

async function openaiStream(opts: Parameters<typeof streamLLM>[0]): Promise<ReadableStream<Uint8Array>> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");

  const messages = [
    { role: "system", content: opts.system ?? "You are a helpful AI assistant." },
    ...opts.messages,
  ];

  // OpenAI doesn't support Anthropic-style image blocks; convert
  const converted = messages.map(m => {
    if (!Array.isArray(m.content)) return m;
    const content = (m.content as ContentBlock[]).map(b => {
      if (b.type === "image") return { type: "image_url", image_url: { url: `data:${b.source.media_type};base64,${b.source.data}` } };
      return b;
    });
    return { ...m, content };
  });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: opts.model, messages: converted, stream: true, max_tokens: opts.maxTokens ?? 4096 }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  return wrapStream(res.body!, (line) => {
    if (!line.startsWith("data: ")) return null;
    const raw = line.slice(6).trim();
    if (raw === "[DONE]") return null;
    const d = JSON.parse(raw);
    return d.choices?.[0]?.delta?.content ?? null;
  });
}

function wrapStream(body: ReadableStream<Uint8Array>, extract: (line: string) => string | null): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let buf = "";
  return new ReadableStream({
    async start(ctrl) {
      const reader = body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { ctrl.enqueue(enc.encode(SSE({ type: "done" }))); ctrl.close(); break; }
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            try {
              const text = extract(line);
              if (text) ctrl.enqueue(enc.encode(SSE({ type: "text", content: text })));
            } catch { /* skip malformed */ }
          }
        }
      } catch (e) {
        ctrl.enqueue(enc.encode(SSE({ type: "error", error: String(e) })));
        ctrl.close();
      }
    },
  });
}

export async function generateTitle(firstMessage: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!key) return firstMessage.slice(0, 60);
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 20, messages: [{ role: "user", content: `Generate a 3-5 word chat title for: "${firstMessage.slice(0, 200)}". Reply with only the title.` }] }),
      });
      const d = await res.json();
      return d.content?.[0]?.text?.trim() ?? firstMessage.slice(0, 60);
    }
  } catch { /* fallback */ }
  return firstMessage.slice(0, 60);
}
