# Description Style Guide

This guide is for the main item description shown in the tooltip or item panel. It is based on the strongest existing entries in `data/length.yaml`, which already capture much of the tone this project wants.

## Goal

Each description should read like a concise museum plaque:

- immediately intelligible to an average curious reader
- compact enough to scan quickly
- rich enough to teach one or two real ideas
- vivid enough to make the number feel situated on the scale

The main description is **not** the place for derivation notes, conversion details, or source bookkeeping. That belongs in the metadata section below.

Every finished description should earn its place on the page. If a sentence feels true but unsurprising, it probably needs to be sharper, more specific, or cut.

## Target Length

- Aim for **2 to 4 sentences**
- Usually stay around **55 to 110 words**
- Use a 1-sentence description only when the item is already extremely familiar and the scale placement is self-evident

## Core Structure

Most strong descriptions should do three jobs:

1. **Anchor the item on the scale**
   - Say what is being measured in a way that feels concrete.
   - Prefer the scale-relevant aspect, not a generic encyclopedia definition.

2. **Add one interesting fact, mechanism, or implication**
   - This is the “museum plaque” sentence.
   - Good options:
     - why the value matters
     - what physical process sets it
     - what makes the item surprising
     - a distinctive fact that helps it stick in memory
     - a concrete number or comparison that changes how the reader sees the item

3. **Situate it relative to nearby scales**
   - Help the reader understand why this item belongs here.
   - Compare it to a nearby item, a human experience, or an important threshold.
   - Prefer a comparison that is not already obvious from the plot alone.

## Tone

- Clear, calm, and slightly vivid
- Curious rather than theatrical
- Precise without sounding textbook-heavy
- Willing to introduce technical vocabulary, but only if the term is either:
  - commonly known, or
  - immediately explained in context

## Links

Descriptions may include markdown links when they make the text more useful without cluttering it.

Use links sparingly and intentionally:

- link the first mention of a genuinely important technical term, historical episode, or named effect
- prefer links that help a curious reader go one layer deeper
- do **not** link the item itself when the source link already points to that page
- do not turn the description into a cluster of blue text
- usually **0 to 2 links** is enough for one description
- if a technical term is doing real explanatory work, a link is often better than a longer parenthetical aside

Good link targets:

- named scientific puzzles or paradoxes
- specific physical mechanisms
- historically important experiments or missions
- specialist jargon that a general reader may not know

Bad link targets:

- extremely common words
- the same page already used as the item's main source link
- every noun in the sentence
- generic “more info” phrasing

## What To Emulate From `length`

The stronger `length` descriptions usually do at least one of these well:

- connect the value to a physical limit or mechanism
- point out a counterintuitive fact
- relate the item to something nearby on the scale
- explain why the number is historically, biologically, or physically important

Examples of patterns worth reusing:

- “This scale emerges from a balance between two competing effects.”
- “This value marks the point where one kind of behavior gives way to another.”
- “It is surprising because intuition suggests X, but the actual reason is Y.”
- “Compared with nearby items, this sits here because of Z.”

## What To Avoid

- Over-explaining familiar objects
  - Example: most readers do not need a full definition of a virus, kettle, or lightning bolt.
- Writing a mini textbook
  - Keep one strong idea, not five mediocre ones.
- Generic filler
  - Avoid lines like “This is important in many areas of science.”
- Tautologies dressed up as insight
  - Example: “the number is enormous because the object is enormous”
- Repeating what the scale already makes obvious
  - Avoid phrasing like “Here the quantity refers to...” in the main note.
- Smuggling metadata into the prose
  - Source figures, assumptions, formulas, and conversion notes should live below the main description.

## Preferred Description Patterns

### Familiar object, unfamiliar scale

Use the object as the anchor, then explain why its scale placement matters.

Template:

> `[Item] sits here because [the relevant feature]. [Interesting implication or surprising fact]. [Short comparison or scale-situating sentence].`

### Unfamiliar object, familiar consequence

Keep the object introduction short and spend the rest on why the reader should care.

Template:

> `[Item] is a [brief identifier]. [The measured quantity matters because...]. [Comparison or implication that makes the scale intuitive].`

### Derived or aggregate quantity

Make the aggregate feel real, not just computed.

Template:

> `[Item] represents [what is being accumulated or derived]. [Why that total is interesting or revealing]. [A comparison that gives the total perspective].`

### Counterintuitive placement

Use the surprise as the hook.

Template:

> `At first this seems like it should be [different expectation]. It lands here because [actual reason]. [Short situating or consequence sentence].`

## Jargon Rule

Use jargon only when it earns its place.

Good:

- “van der Waals radius,” followed by what that means physically
- “color confinement,” followed by a plain-language image
- “muonic hydrogen,” followed by why it mattered

Bad:

- stacking several specialist terms without giving the reader a handle on them

Better:

- if the jargon is useful but non-obvious, either explain it briefly or link it
- if a sentence names a concept like a puzzle, law, or effect, consider linking that term directly

Example:

- good: `[proton-radius puzzle](https://en.wikipedia.org/wiki/Proton_radius_puzzle)`
- good: `[wave function](https://en.wikipedia.org/wiki/Wave_function)`
- weak: `advanced quantum thing`

## Comparisons

Comparisons are often the most useful part of the description. Prefer comparisons that:

- are near the same scale
- teach why the ordering makes sense
- help the reader build intuition for the dimension

Good comparison types:

- nearby items on the same scale
- human-sized or everyday references
- threshold behavior
- natural vs engineered example
- “smaller than X, larger than Y” when that contrast actually clarifies the scale

## Interesting Facts

An interesting fact should support scale intuition, not distract from it.

Good interesting facts:

- explain why the value is unusually large, small, stable, or variable
- connect to a biological, physical, or historical consequence
- help the item stand out from neighbors

Avoid trivia that is memorable but unrelated to the measured quantity.

Whenever possible, prefer **specific** facts over generic gestures.

Better:

- “ordinary hydrogen measurements clustered near $0.88\\,\\mathrm{fm}$ while muonic hydrogen gave about $0.84\\,\\mathrm{fm}$”
- “the Moon's entire surface is only a bit larger than Africa's”
- “the horizon is about $46$ billion light-years away, so the [cosmic microwave background](https://en.wikipedia.org/wiki/Cosmic_microwave_background) is part of the same observable shell”

Weaker:

- “different methods briefly disagreed”
- “the object is very large”

## Mathematics and Metadata

The main description should usually avoid equations unless the equation itself is the memorable fact.

Keep these in the metadata section below the description:

- source-side figure
- derivation formula
- assumptions
- conversion notes
- qualifiers

If math is shown in metadata, prefer clean LaTeX formatting.

In the main description, use numbers when they sharpen the point. Do not avoid numbers just to keep the prose smooth. A short, well-chosen numeric contrast is often more informative than a vague sentence.

## Editing Checklist

Before accepting a description, check:

- Does the first sentence anchor the item quickly?
- Is there at least one genuinely interesting idea?
- Does the description help explain why the item sits at this point on the scale?
- Is at least one sentence more specific than what a reader could guess from the item name alone?
- Is it concise?
- Would an average reader learn something without being slowed down?
- Are formulas and source notes kept out of the main prose?

## Example Of The Desired Balance

Strong:

> `A proton is tiny even by subatomic standards, but its charge radius is still large enough to matter experimentally. The [proton-radius puzzle](https://en.wikipedia.org/wiki/Proton_radius_puzzle) emerged when ordinary-hydrogen measurements clustered near $0.88\\,\\mathrm{fm}$ while muonic hydrogen pointed closer to $0.84\\,\\mathrm{fm}$, a gap large enough to unsettle precision tests of quantum electrodynamics. It sits at a scale where particles are better understood through [wave functions](https://en.wikipedia.org/wiki/Wave_function) and fluctuating internal charge distributions than as simple hard spheres.`

Weak:

> `A proton is a subatomic particle found in the nucleus of an atom. It is very small and important in chemistry and physics. Scientists have measured its radius using several methods.`

The strong version teaches scale, consequence, and context. The weak one mostly gives generic definition.
