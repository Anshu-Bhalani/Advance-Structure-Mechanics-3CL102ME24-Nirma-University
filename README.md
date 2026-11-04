# Structural Analysis – modular project

Open `index.html` in a browser (works from file:// — no build step, no server needed).

```
index.html                      ← only HTML file; links all CSS + JS
assets/
  css/main.css                  ← common styles
  js/main.js                    ← common JS (shell markup, state, helpers, persistence, navigation, bootstrap)
  vendor/                       ← jsPDF + svg2pdf + embedded fonts (vector PDF export)
modules/
  home/ dashboard/ nodes/ elements/ supports/ load-case/ load/ moment-case/ moment/   (*.js, + *.css where needed)
  tutorial/                     ← interactive tutorials: tutorial.js (engine), tutorial-beginner.js, tutorial-grid.js, tutorial.css
  results/
    results.js / results.css    ← Results frame, summary, equilibrium, orchestration, PDF export
    step-1 … step-8/            ← one folder per calculation part (step-8 = final result tables)
    diagrams/                   ← part 9: all diagrams (live model, reactions, AFD/SFD/BMD/displacement, DoF, full-screen)
```
Page markup lives inside each module's `.js` and is injected by `mountModuleHTML()` (defined in `main.js`), so `index.html` stays a pure link file. Script order in `index.html` matters.


## Offline use (hosted site)

When the GitHub Pages site is first opened while online, its Service Worker caches the application shell, local JavaScript/CSS modules, PDF libraries, and manifest/icon. Wait for the **Offline ready** status before disconnecting. Afterward, reopen the hosted site on the same browser/device to use the cached app without a network connection.

This requires the hosted HTTPS site; browsers do not allow Service Worker registration from `file://`. Model data continues to be stored locally by the app's existing browser-storage logic. Clearing site data can remove both saved models and offline cache. Publishing updates requires internet access.


## Interactive tutorials

Two hands-on tutorials teach the software by building a real model with the learner. They start from the **Home** screen cards, the floating **?** button, the sidebar **Tutorials** button, and a one-time welcome prompt on the first visit.

| Tutorial | Model built | File |
|---|---|---|
| Beginner: Beam, Truss & Frame | Portal frame (Frame members) + overhang (Beam) + diagonal brace (Truss), Fixed / Hinged / Roller supports, 2 load cases, point loads, UDL, moment | `modules/tutorial/tutorial-beginner.js` |
| Grid | T-shaped grid, Fixed + Roller supports, UDL, point load, torsion | `modules/tutorial/tutorial-grid.js` |

How it works: a coach panel explains each step, a highlight ring marks the next control, and every form is pre-filled with the tutorial values. A checklist shows which items exist. **Do it for me** submits the app's own forms (so normal validation always runs), and **Build the whole model for me** jumps to the analysis. The answer key (`data`) in each tutorial file uses the saved-model format, so the engine compares what the learner entered with it.

To add or change a tutorial, edit the `data` (model), `inputs` (text typed into fields, e.g. `L/2`), `notes` and `steps` of its file. Step options: `nav` (tab to open first), `task` (collection to fill), `isDone`, `targets`, `auto`, `card`. Keep both tutorial models solvable: after changing one, run it and check that the equilibrium check passes (`tests/tutorial.test.cjs` checks the model references).
