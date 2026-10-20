/**
 * prompt-injection-guard — find instructions hidden in the places an agent
 * reads automatically.
 *
 * Agents read rules files, tool descriptions and READMEs without a human in
 * the loop. Anything that looks like an instruction ("ignore previous",
 * "send the key to…") or that hides text (zero-width characters, HTML
 * comments, base64 blobs) is a risk. This scans and reports.
 */
export const PATTERNS = [
  { id: "ignore-previous", severity: "critical", re: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)/i, why: "classic instruction override" },
  { id: "disregard-rules", severity: "critical", re: /disregard\s+(the\s+)?(system|previous)\s+(prompt|rules?|instructions?)/i, why: "instruction override" },
  { id: "exfiltrate-secret", severity: "critical", re: /(send|post|upload|exfiltrate|leak)\s+(the\s+)?(api[_ -]?key|secret|token|private key|env)/i, why: "asks for credentials" },
  { id: "hide-in-markdown", severity: "high", re: /<!--[^>]{0,400}?(ignore|system|you\s+must|always|secret|token)/is, why: "instructions hidden in an HTML comment" },
  { id: "invisible-unicode", severity: "high", re: /[\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]/, why: "zero-width or bidi control characters" },
  { id: "fake-system", severity: "high", re: /^\s*(system|assistant)\s*:/im, why: "looks like a role marker" },
  { id: "always-do", severity: "medium", re: /\balways\s+(call|use|send|run|execute)\b/i, why: "imperative injected into prose" },
  { id: "urgent-override", severity: "medium", re: /\b(urgent|important)\s*[:!].{0,80}\b(ignore|must|do not stop)\b/i, why: "pressure framing" },
  { id: "base64-blob", severity: "info", re: /[A-Za-z0-9+/]{120,}={0,2}/, why: "long base64 blob — decode before trusting" },
  { id: "external-post", severity: "medium", re: /curl\s+[^\n]*https?:\/\/[^\s|]+/i, why: "embedded shell command" },
]

/** Scan a string. */
export function scan(text, { where = "text" } = {}) {
  const s = String(text || "")
  const findings = []
  for (const p of PATTERNS) {
    const re = new RegExp(p.re.source, p.re.flags.includes("g") ? p.re.flags : p.re.flags + "g")
    let m
    let count = 0
    let firstIndex = -1
    while ((m = re.exec(s)) !== null) {
      count++
      if (firstIndex < 0) firstIndex = m.index
      if (m.index === re.lastIndex) re.lastIndex++
    }
    if (count) {
      findings.push({
        id: p.id,
        severity: p.severity,
        where,
        count,
        firstIndex,
        excerpt: s.slice(Math.max(0, firstIndex - 30), firstIndex + 70).replace(/\s+/g, " "),
        why: p.why,
      })
    }
  }
  return findings
}

/** Scan a whole file set (rules, tool descriptions, docs). */
export function scanFiles(files) {
  const findings = []
  for (const f of files) {
    findings.push(...scan(f.content, { where: f.name }))
  }
  const bySeverity = { critical: 0, high: 0, medium: 0, info: 0 }
  for (const f of findings) bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1
  const score = Math.max(0, 100 - bySeverity.critical * 30 - bySeverity.high * 12 - bySeverity.medium * 5)
  return { findings, bySeverity, score, verdict: bySeverity.critical ? "unsafe" : bySeverity.high ? "suspicious" : "clean" }
}

/** Suggest a sanitised version: strip comments and invisible characters. */
export function sanitise(text) {
  let s = String(text || "")
  s = s.replace(/<!--[\s\S]*?-->/g, "")
  s = s.replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]/g, "")
  return s
}
