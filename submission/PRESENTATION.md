# Project Presentation

Final SIH 2026 presentation for **JanSetu — Jharkhand Societal Innovation Portal**
(Problem Statement **26043**).

## Presentation files

- **PDF (submit this one):** [BilluSena_SIH2026_Presentation.pdf](./BilluSena_SIH2026_Presentation.pdf)
- **PPTX (editable source):** [BilluSena_SIH2026_Presentation.pptx](./BilluSena_SIH2026_Presentation.pptx)

The SIH portal accepts PDF; the PPTX is kept alongside it so the deck stays
editable. Both files are in this folder, so no external hosting link is needed.

## Deck structure

Six slides, following the official SIH template:

1. Title page
2. Idea title / proposed solution
3. Technical approach
4. Feasibility and viability
5. Impact and benefits
6. Research and references

## Regenerating the deck

The PPTX is generated, not hand-edited. To rebuild it after changing the
generator:

```sh
python artifacts/ppt/build_jansetu_sih_deck.py
```

It writes `submission/BilluSena_SIH2026_Presentation.pptx`. Export a fresh PDF
from that file before submitting.

## Before submission

- [ ] Fill the Team ID on slide 1 with the value registered on the SIH portal.
      Do not guess it. Team Name is BilluSena.
- [ ] Confirm the Problem Statement title and theme match the portal wording
      exactly.
- [ ] Re-export the PDF after any slide edit, so both files agree.
- [ ] Open both links above while logged out and confirm they resolve.
