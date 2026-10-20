// Integration test against the real service. Skipped unless LIVE=1.
//   LIVE=1 npm test
import { test } from "node:test"
import assert from "node:assert/strict"

const LIVE = process.env.LIVE === "1"
const skip = LIVE ? false : "set LIVE=1 to run the integration test"

import { scanFiles } from "../src/index.js"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

test("scans a real rules file", { skip }, () => {
  const file = join(homedir(), ".config", "opencode", "AGENTS.md")
  if (!file) return
  let content
  try {
    content = readFileSync(file, "utf8")
  } catch {
    return
  }
  const report = scanFiles([{ name: "AGENTS.md", content }])
  assert.equal(typeof report.score, "number")
  assert.ok(report.findings.every((f) => typeof f.severity === "string"))
})
