# Skills Test Implementation TODO

**Created**: 2026-03-08  
**Source**: AUDIT-2026-03-08.md  
**Total Skills Without Tests**: 36

---

## 🔴 P0 - Critical (This Week)

Skills with active code, zero test coverage:

- [x] **voice-system** - Core voice functionality (src/index.ts) ✅ **COMPLETED 2026-03-08**
- [x] **self-repair** - Auto-repair logic (index.js, package.json) ✅ **COMPLETED 2026-03-08**
- [x] **feishu-evolver-wrapper** - Feishu integration (index.js, package.json) ✅ **COMPLETED 2026-03-08**
- [x] **xiaohongshu-mcp** - Xiaohongshu API (index.js) ✅ **COMPLETED 2026-03-08**
- [x] **pdf2gep** - PDF to GEP conversion (index.js, package.json) ✅ **COMPLETED 2026-03-08**

---

## 🟡 P1 - High (Next Week)

Core infrastructure skills:

- [ ] **research-paper-writer** - Paper generation (index.js, package.json)
- [ ] **orchestrator** - Parallel execution (SKILL.md only - may need implementation)
- [ ] **planning-with-files** - Workflow management (SKILL.md only)
- [ ] **todo-task-planning** - Task execution (SKILL.md only)
- [ ] **clawdbot-backup** - Backup/restore (SKILL.md only)
- [ ] **code-review-quality** - Code review tool (SKILL.md only)
- [ ] **codemapper** - Code analysis (SKILL.md only)

---

## 🟢 P2 - Medium (This Month)

User-facing features:

- [ ] **green-tea-persona** - Persona feature (index.js)
- [ ] **mind-blow** - Creative feature (index.js)
- [ ] **surprise-protocol** - Engagement feature (index.js)
- [ ] **voice-system-python** - Python implementation (src/core.py)
- [ ] **personas** - Persona system (package.json only)

---

## ⚪ P3 - Low (Optional)

Documentation-only skills (tests optional unless implemented):

- [ ] agent-reach
- [ ] anterior-cingulate-memory
- [ ] auto-memory
- [ ] autonomous-agent-patterns
- [ ] autonomous-tasks
- [ ] browserwing
- [ ] exa-plus
- [ ] exa-web-search-free
- [ ] latex-paper-en
- [ ] ml-paper-writing
- [ ] network-automation-framework
- [ ] news-aggregator
- [ ] qwen3-tts
- [ ] tts
- [ ] voice
- [ ] voice-output
- [ ] web-fetch-markdown
- [ ] world-monitor

---

## 📋 Infrastructure Tasks

- [ ] Create SKILL.md for: system-test, voice-test, whisper-local
- [ ] Add package.json to skills with src/ but no package.json
- [ ] Set up test runner (Jest/Vitest) configuration
- [ ] Create test utilities in skills/test-utils/
- [ ] Add test coverage reporting to CI
- [ ] Document test writing guidelines

---

## Progress Tracking

| Priority | Total | Completed | In Progress | Remaining |
|----------|-------|-----------|-------------|-----------|
| P0 | 5 | 5 | 0 | 0 |
| P1 | 7 | 0 | 0 | 7 |
| P2 | 5 | 0 | 0 | 5 |
| P3 | 18 | 0 | 0 | 18 |
| **Total** | **35** | **5** | **0** | **30** |

---

## ✅ P0 Completion Details (2026-03-08)

**Subagent**: top5-skill-tests  
**Total Tests**: 53 tests, 100% pass rate

| Skill | Tests | Key Coverage | Test File |
|-------|-------|--------------|-----------|
| **voice-system** | 5 | Init, events, state, config | `test/index.test.js` |
| **self-repair** | 12 | 8 error patterns, auto-repair, reports | `test/index.test.js` |
| **feishu-evolver-wrapper** | 12 | Lifecycle, events, failures, Feishu cards | `test/index.test.js` |
| **pdf2gep** | 12 | Chunking, GEP assets, batch processing | `test/index.test.js` |
| **xiaohongshu-mcp** | 12 | 8 MCP tools, validation, errors | `test/index.test.js` |

**Test Reports**: See `TEST-REPORT-TOP5.md` for detailed breakdown

---

**Latest Update (2026-03-08)**: Completed all P0 critical skills with comprehensive test coverage.
All tests use mock implementations (no external dependencies), isolated workspaces, and provide clear pass/fail output.

---

## Test Template

Use this template for new test files:

```typescript
// test/index.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
// or use Jest: import { describe, it, expect, beforeEach } from '@jest/globals'

describe('SkillName', () => {
  beforeEach(() => {
    // Setup
  })

  it('should do something', async () => {
    // Test implementation
    expect(true).toBe(true)
  })
})
```

---

**Last Updated**: 2026-03-08 10:01 GMT+8
