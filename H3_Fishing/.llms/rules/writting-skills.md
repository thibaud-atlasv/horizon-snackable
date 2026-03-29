# Skill Authoring Reference

## YAML Frontmatter
```yaml
---
name: gerund-form-name        # max 64 chars, lowercase + hyphens, no "anthropic"/"claude"
description: >                # max 1024 chars, third person, non-empty
  Does X and Y. Use when user mentions Z or asks for W.
---
```

## Core Rules

**Be concise.** Assume Claude is smart. Only add context Claude doesn't already have. Challenge every token: does Claude need this? SKILL.md body must stay under 500 lines.

**Naming:** Use gerund form (`processing-pdfs`, `analyzing-spreadsheets`). Avoid vague names (`helper`, `utils`, `tools`).

**Descriptions:** Third person only. Include what + when. Be specific with trigger terms.
- ✓ `"Extracts text from PDFs, fills forms. Use when user mentions PDFs or document extraction."`
- ✗ `"Helps with documents"` / `"I can help you process files"`

**Degrees of freedom:**
- High (text instructions) → multiple valid approaches, context-dependent decisions
- Medium (pseudocode/parameterized scripts) → preferred pattern exists, variation OK
- Low (exact commands) → fragile ops, exact sequence required (e.g., DB migrations)

## File Structure

```
skill-name/
├── SKILL.md          # Overview + entry point (≤500 lines)
├── advanced.md       # Loaded only when needed
├── reference.md      # Loaded only when needed
└── scripts/
    ├── analyze.py    # Executed, not loaded into context
    └── validate.py
```

**Progressive disclosure:** SKILL.md is a table of contents. Reference files are loaded on demand. Scripts are executed without loading content into context.

**Keep references one level deep.** SKILL.md → files only. Never SKILL.md → file → file (Claude may partial-read nested references).

**Reference files >100 lines** must have a table of contents at the top.

**Domain organization example:**
```
reference/
├── finance.md
├── sales.md
└── product.md
```
Point to domain files from SKILL.md so Claude loads only what's relevant.

## MCP Tools
Always use fully qualified names: `ServerName:tool_name`
```markdown
Use BigQuery:bigquery_schema to retrieve schemas.
```

## Dependencies
Always declare explicitly. Never assume packages are installed.
```markdown
Install: `pip install pdfplumber`
```

## Workflows
Use sequential steps with a copyable checklist for complex tasks:
```
- [ ] Step 1: Analyze (run analyze.py)
- [ ] Step 2: Validate (run validate.py)
- [ ] Step 3: Execute (run fill.py)
- [ ] Step 4: Verify output
```

Include feedback loops: run validator → fix errors → repeat. Only proceed when validation passes.

## Scripts
- **Solve, don't punt:** Handle errors in scripts; don't let Claude improvise recovery
- **No magic numbers:** Document why each constant has its value
- **Specify intent:** "Run `analyze.py`" (execute) vs "See `analyze.py`" (read as reference)
- **Use forward slashes** always (`scripts/helper.py`, never `scripts\helper.py`)

## Content Guidelines
- **No time-sensitive info.** Use an `## Old patterns` section for deprecated approaches
- **Consistent terminology.** Pick one term per concept; never mix synonyms
- **Provide one default approach.** Offer an escape hatch for edge cases, not a menu of options

## Common Patterns

**Template pattern** (strict):
```markdown
ALWAYS use this exact structure:
# [Title]
## Summary
## Findings
## Recommendations
```

**Template pattern** (flexible):
```markdown
Default structure — adapt as needed:
# [Title] / ## Summary / ## Findings
```

**Examples pattern:** Provide input/output pairs when output quality depends on style matching.

**Conditional workflow:**
```markdown
Creating new content? → Follow "Creation workflow"
Editing existing? → Follow "Editing workflow"
```

## Evaluation
Build evals before writing extensive docs. Structure:
```json
{
  "skills": ["skill-name"],
  "query": "Task description",
  "files": ["test-files/example.pdf"],
  "expected_behavior": [
    "Reads file using appropriate library",
    "Produces correct output format"
  ]
}
```
Baseline Claude without the skill → write minimal instructions to close gaps → iterate.

## Checklist

**Structure**
- [ ] `name` in gerund form, valid format
- [ ] `description` third-person, specific, includes triggers
- [ ] SKILL.md body ≤500 lines
- [ ] References one level deep only
- [ ] Reference files >100 lines have table of contents
- [ ] No time-sensitive content

**Code & Scripts**
- [ ] All packages declared explicitly
- [ ] Error handling in scripts (no punting to Claude)
- [ ] No magic numbers
- [ ] Forward slashes in all paths
- [ ] Execute vs read intent is explicit
- [ ] Validation/feedback loops for critical ops

**Testing**
- [ ] ≥3 evaluations created
- [ ] Tested across target models (Haiku needs more guidance; Opus less)
- [ ] Tested with real usage scenarios
