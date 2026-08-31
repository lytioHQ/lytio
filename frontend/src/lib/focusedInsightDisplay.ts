/**
 * M2.14.5 Phase1.1 Hotfix 2: customer-visible adapter for focused insight.
 *
 * Converts any AI-shaped focused card (object, JSON string, fenced JSON,
 * nested envelope, or legacy stored shape) into a display structure that the
 * UI can render without exposing internal field names, JSON blocks, or
 * recommendation/insight noise inside the evidence section.
 */

export interface FocusedInsightDisplay {
  headline: string;
  coreFinding: string;
  evidencePoints: string[];
  causeAnalysis: string;
  actionItems: string[];
}

type JsonRecord = Record<string, unknown>;

const CARD_KEYS = ["title", "finding", "evidence", "explanation", "action"] as const;
const ENVELOPE_KEYS = ["focused_insight", "card", "result", "data"] as const;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function deepParse(value: unknown, depth = 4): unknown {
  if (depth <= 0) return value;
  if (typeof value === "string") {
    const parsed = tryParseJson(value.trim());
    return parsed === null ? value : deepParse(parsed, depth - 1);
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepParse(item, depth - 1));
  }
  if (isRecord(value)) {
    const out: JsonRecord = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = deepParse(item, depth - 1);
    }
    return out;
  }
  return value;
}

function findJsonObject(text: string): JsonRecord | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(text.slice(start, i + 1));
          return isRecord(parsed) ? parsed : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function extractJsonObject(value: unknown): JsonRecord | null {
  if (isRecord(value)) return value;
  if (typeof value !== "string") return null;
  const text = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "");
  const parsed = tryParseJson(text);
  if (isRecord(parsed)) return parsed;
  const found = findJsonObject(text);
  if (found) return found;
  const nested = tryParseJson(value.trim());
  if (typeof nested === "string") return extractJsonObject(nested);
  return null;
}

function resolveCard(raw: unknown): JsonRecord | null {
  const parsed = deepParse(raw);
  let card = extractJsonObject(parsed);
  if (!card) return null;

  for (const key of ENVELOPE_KEYS) {
    const nested = extractJsonObject(card[key]);
    if (nested && CARD_KEYS.some((item) => item in nested)) {
      card = nested;
      break;
    }
  }

  const nestedFinding = extractJsonObject(card.finding);
  if (nestedFinding && CARD_KEYS.some((item) => item in nestedFinding)) {
    card = { ...card, ...nestedFinding };
  }

  return card;
}

function textFromValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => textFromValue(item))
      .filter(Boolean)
      .join("；");
  }
  if (isRecord(value)) {
    for (const key of ["content", "text", "title", "name", "value", "description"]) {
      const candidate = textFromValue(value[key]).trim();
      if (candidate) return candidate;
    }
  }
  return "";
}

function cleanSegment(segment: string): string {
  let text = segment
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  text = text.replace(/^[-*•]\s+/, "").replace(/^(?:行动|建议|推荐)\d*\s*[：:]\s*/, "");
  text = text.replace(/^\d+\s*[.、)）]\s*/, "");
  text = text.replace(/^["'“「『]|["'”」』]+$/g, "");
  text = text.replace(/[（(]\s*优先级\s*[：:]\s*(?:high|medium|low|高|中|低)\s*[)）]/gi, "");
  return text.trim();
}

function cleanText(value: unknown): string {
  const parsed = extractJsonObject(value);
  if (parsed) {
    const inner = parsed.title ?? parsed.finding ?? parsed.explanation ?? parsed.evidence ?? "";
    if (inner !== undefined && inner !== null && inner !== "") return cleanText(inner);
  }
  const text = textFromValue(value);
  if (!text.trim()) return "";
  return text
    .replace(/```(?:json)?/gi, "")
    .split("\n")
    .map((line) => cleanSegment(line))
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function tryParseJsonArray(text: string): unknown[] | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("[")) return null;
  const parsed = tryParseJson(trimmed);
  return Array.isArray(parsed) ? parsed : null;
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase().replace(/\s+/g, "");
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function toItemList(value: unknown): string[] {
  const items: string[] = [];
  const collect = (item: unknown) => {
    if (Array.isArray(item)) {
      item.forEach(collect);
      return;
    }
    const text = textFromValue(item);
    if (!text.trim()) return;
    const parsedArray = tryParseJsonArray(text);
    if (parsedArray) {
      parsedArray.forEach(collect);
      return;
    }
    for (const chunk of text.split(/\n+|；+|;+/)) {
      const cleaned = cleanSegment(chunk);
      if (cleaned) items.push(cleaned);
    }
  };
  collect(value);
  return dedupe(items);
}

function splitActions(value: unknown): string[] {
  const actions: string[] = [];
  const collect = (item: unknown) => {
    if (Array.isArray(item)) {
      item.forEach(collect);
      return;
    }
    const text = textFromValue(item);
    if (!text.trim()) return;
    const parsedArray = tryParseJsonArray(text);
    if (parsedArray) {
      parsedArray.forEach(collect);
      return;
    }
    const chunks = text
      .replace(/(?:^|\n)\s*(?:行动|建议|推荐)?\d+\s*[.、)）]/g, "\n")
      .split(/\n+|；+|;+|。+/);
    for (const chunk of chunks) {
      const cleaned = cleanSegment(chunk);
      if (cleaned) actions.push(cleaned);
    }
  };
  collect(value);
  return dedupe(actions);
}

const ACTION_PREFIX_RE =
  /^(?:建议|推荐|应该|需要|应当|可以通过|优先|可考虑|建议采取|补充|优化|加强|提升|降低|减少|增加|调整|重新|完善|建立|推动|推进|执行|实施|上线|拓展|开发|确保|扩大|启动)\s*/;
const ACTION_HINT_RE = /(?:建议|推荐|优先级|priority|行动|措施|方案)\s*[：:]|(?:应该|需要|可以通过)/;
const INSIGHT_PREFIX_RE = /^(?:洞察|风险|原因)\s*[：:]/;

interface ClassifiedEvidence {
  kind: "factual" | "action" | "insight";
  text: string;
}

function classifyEvidence(value: unknown): ClassifiedEvidence {
  const original = cleanSegment(textFromValue(value));
  const stripped = original.replace(/^(?:风险|洞察|建议|推荐|行动|原因){1,2}\s*[：:]\s*/, "");
  if (ACTION_PREFIX_RE.test(stripped) || ACTION_HINT_RE.test(stripped)) {
    return { kind: "action", text: cleanSegment(stripped) };
  }
  if (INSIGHT_PREFIX_RE.test(original)) {
    return { kind: "insight", text: cleanSegment(stripped) };
  }
  return { kind: "factual", text: cleanSegment(stripped || original) };
}

function buildEvidence(value: unknown) {
  const factual: string[] = [];
  const actionCandidates: string[] = [];
  const insightNotes: string[] = [];
  for (const item of toItemList(value)) {
    const classified = classifyEvidence(item);
    if (!classified.text) continue;
    if (classified.kind === "action") actionCandidates.push(classified.text);
    else if (classified.kind === "insight") insightNotes.push(classified.text);
    else factual.push(classified.text);
  }
  return {
    factual: dedupe(factual),
    actionCandidates: dedupe(actionCandidates),
    insightNotes: dedupe(insightNotes),
  };
}

function mergeUnique(...groups: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of groups) {
    for (const item of group) {
      const key = item.toLowerCase().replace(/\s+/g, "");
      if (key && !seen.has(key)) {
        seen.add(key);
        out.push(item);
      }
    }
  }
  return out;
}

export function toFocusedInsightDisplay(raw: unknown): FocusedInsightDisplay {
  const card = resolveCard(raw) ?? {};
  const evidence = buildEvidence(card.evidence);
  const headline = cleanText(card.title ?? card.headline ?? card.topic ?? "");
  const coreFinding = cleanText(card.finding ?? "");
  const explanation = cleanText(card.explanation ?? "");
  const insightNotes = evidence.insightNotes.filter((note) => !explanation.includes(note));
  const causeAnalysis = explanation
    ? [explanation, ...insightNotes].filter(Boolean).join("\n")
    : insightNotes.join("\n");
  const actionItems = mergeUnique(splitActions(card.action), evidence.actionCandidates);

  return {
    headline,
    coreFinding,
    evidencePoints: evidence.factual,
    causeAnalysis,
    actionItems,
  };
}
