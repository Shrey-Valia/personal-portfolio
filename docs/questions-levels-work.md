# Questions for Shrey: Label Factory and Droid Strike Back

Both levels are built and playable (`?level=handshake`, `?level=droid`).
These four questions are about taste and content only. Each has a
recommendation, so nothing is blocked if you skip one.

## 1. Are the three Failure Gallery examples the right failures?

The gallery room (x-hs-3) shows three broken generations. Each has the
prompt it failed and a tag. Your feedback fixes them:

- "a waving hand" → six fingers (*Extra finger*)
- "a sign: Hello world" → "Helo wrold" (*Misspelled*)
- "a red cube" → a blue cube (*Wrong colour*)

These are the standard text-to-image failures. They read instantly, but
they might not be the ones you actually diagnosed.

- **A. Keep all three** (recommended, unless one misrepresents your work).
- B. Swap one or more for failures you saw often, such as miscounted
  objects, wrong left/right placement, style drift, or unsafe content
  that got through. Tell me which ones.

## 2. Is "Fine-tuned on your ratings" a fair claim?

After the DENOISE block (x-hs-2), a second set of noise platforms resolves
as you walk toward it, under a panel that reads *Fine-tuned on your
ratings*. The intended story: you rated outputs, the model was fine-tuned
on those annotations, and the improved model now generates as you go.
You read visuals as claims, so the wording needs to match what happened.

- **A. Keep "Fine-tuned on your ratings"** (recommended if your
  annotations really fed the fine-tune, which is what the bullet says).
- B. Soften it to "Fine-tuned model".
- C. Drop the second set and keep only the DENOISE bridge.

## 3. Should Omi be visible on the hero?

Right now Omi appears as a small "Omi" label inside the voice bubble
(Omi · waveform · "Forward"), in the duck's hint, and in the cards. The
hero sprite is shared by every level, so I didn't touch it.

- **A. Keep it in the bubble only** (recommended: it's readable and changes
  no shared art).
- B. Add a small pendant to the hero, drawn only in this level, on top of
  the shared sprite.
- C. Add the pendant to the shared hero sprite for every level. I'd only
  do this if Omi is part of how you want to be seen everywhere.

## 4. Is the robot's look right?

The rescue robot is original: a boxy orange body on treads, with one
round cyan eye, a status screen showing its current instruction, a foam
cannon, an antenna that lights when it hears you, and a scissor lift. It
doesn't look like R2-D2, BB-8 or WALL-E.

- **A. Keep it orange** (recommended: it reads as rescue gear against the
  dark brick, and its cyan eye matches the little robot on the map's Droid
  landmark).
- B. Safety yellow.
- C. White with red trim, like a fire department.
- D. Match the digital robot from your hackathon demo. Tell me its colours
  and anything distinctive about it.
