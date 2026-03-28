---
name: game-planning
summary: Always use this when planning a new game from scratch.
include: as_needed
---

# Game Planning Skill

When building a new game, always consider the following to be sure you don't miss anything.

### The Extraction Flow

**1. Start with the existing game**

Use \`Docs/PROJECT_SUMMARY.md\` (already loaded) to understand what's already built.

**2. Find Reference Game**

Don't ask "what kind of game?" - use concrete options. **Internally, always have a reference game for each option** (guides your design thinking), but you don't need to surface it to the user.

If it's unclear what reference game would be good, provide some suggestions to the user.

### Planning a New Game

Commit fully to building the new game.

- Use your reference game to identify ALL systems that genre needs - **not just the primary mechanic**
- Think holistically: What happens **between** instances of the core mechanic? What makes the world feel complete?
- Build a full roadmap with milestones covering the complete feature set

**Ask yourself (inner to outer):**
- **Camera/locomotion:** Does this genre require a different camera, input, and/or movement model than the current game? If yes, that's the first inner loop to nail — its own milestone before other mechanics.
- **Core loop:** What's the minute-to-minute gameplay?
- **Support systems:** What resources/pickups exist in the world? What weapon variety?
- **Meta-systems:** What character/class choices affect playstyle? What customization?
- **Progression:** How does the player grow over time?
- **Downtime:** What happens when NOT doing the primary activity?
- **Infrastructure:** What makes the world feel alive and reactive?

When unclear, **look at your reference game** - what features does it have that you haven't listed yet?

### Milestone Ordering

Order milestones from inner to outer loops:

1. **Inner loops** (core mechanics, minute-to-minute) - Build first
   - If the genre changes camera or locomotion, that is the **first** inner loop — build it as its own milestone before combat or other mechanics. Do basic controls and locomotion with camera first.
   - Then combat, primary interactions, scoring

2. **Outer loops** (wrapper systems) - Build after inner loops work
   - Progression, economy, meta-systems
   - Systems that give context/meaning to the inner loop

3. **Polish** (final touches) - Build last
   - Audio/music changes

Don't half-build - plan for EVERY major system the genre expects, including menus.

### Presenting the Plan and Starting Work

Once the game is clear, **commit and go** — present the plan and start building in the same turn. Do NOT ask the user to confirm the roadmap or approve the First Playable. You are the design expert; the user chose the game, you own the plan.

**⚠️ CRITICAL: Your \`response_to_user\` MUST contain the milestone overview.** The user needs to see the plan before work starts rolling in. A response like "Starting work!" with no milestones is UNACCEPTABLE — the user has no idea what's coming.

**Your single response must include:**

1. **All milestones together** (ordered from inner → outer → polish) — MS1 gets detail (3-4 bullets), MS2+ get titles and emoji only (one line each). Keep this as one unbroken block so the user sees the full roadmap.
2. **"Starting on [first step] now"** — Transition to what you're building right now

**In the same turn, you must also:**

1. Save the full milestone plan to \`Docs/TASK_BOARD.yaml\` (all milestones with details, not just MS1)
2. Call \`delegation\` with the MS1 plan to start work immediately

No approval gate. The user can redirect at any time ("skip items, go straight to the race loop" or "actually make it a beat-em-up instead"), but you don't wait for them to say "go."

**Example response:**

> 🏎️ Racing Transformation
>
> I'll turn this into a kart racer. Here's the plan:
>
> ## Milestone 1: Core Driving 🚗
> - Swap to a vehicle controller with steering and acceleration
> - Track-following camera behind the kart
> - Disable conflicting systems from the current game
>
> ## Milestone 2: Track & Items 🛤️
> ## Milestone 3: Race Loop 🏁
> ## Milestone 4: Polish & Menu 🎨
>
> Starting on the core driving now! When you hit play, you'll see a whole new kart racer!

### Saving to Task Board

Save ALL proposed milestones and details to the task board — not just milestone names. The planning work you did thinking through each milestone shouldn't be thrown away. This happens in the same turn as presenting the plan and starting delegation.

### Before Starting Work

1. Use \`Docs/PROJECT_SUMMARY.md\` (already loaded) - understand existing systems and reusable components
2. Identify what to disable vs reuse vs build
3. **Include the reference game in delegation requests** - the delegation agent will pair context_agent research tasks with implementer tasks so each mechanic gets researched before it's built

### Disabling Old Systems

When transforming, identify which existing systems conflict with the new genre and need to be disabled. Check \`Docs/PROJECT_SUMMARY.md\` and the project's config files for available system toggles.

**Rules:**
- **Disabling goes in its own dedicated scripting task.** When telling delegation which systems to disable, list them as a separate task. Place this before the first build task.
- **NEVER put a feedback point after only disabling.** The first feedback point must come after the new game is working.

Existing controllers and cameras may already support the target genre — mention that agents should check for and reuse, copy and change, or extend what's already built.

---

## First Playable

ONLY insert a feedback point when you're done with a full vertical slice of the game. This includes ALL THREE kinds of tasks - Inner Loop, Outer Loop, and a basic level of polish (UI and VFX feedback especially).
