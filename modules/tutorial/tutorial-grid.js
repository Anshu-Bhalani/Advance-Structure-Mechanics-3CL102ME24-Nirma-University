/* ==========================================================================
 * tutorial-grid.js — Grid tutorial
 *
 * A small T-shaped grid (grillage): a main beam along X (B1 + B2) with a stub
 * beam B3 sticking out along Y. Loading the stub makes it bend AND twist the
 * main beam, which is exactly what a Grid analysis is for.
 *
 * Units: kN, m, kN/m, kN·m. E in kN/m², G in GPa (as in the Grid form).
 *
 *                    N4 (4, 3)   free end
 *                    │ B3
 *   N1 ──── B1 ──── N2 ──── B2 ──── N3
 *  (0,0)           (4,0)           (8,0)
 *  Fixed                           Roller
 *
 * Torsion and the point load are placed at a joint (distance L), as the
 * Dashboard recommends.
 * ========================================================================== */
(function () {
    "use strict";
    if (!window.StructuralTutorial) return;

    const data = {
        analysisMode: "grid",
        dofSettings: { skipAxial: false, skipMoment: false },
        nodes: [
            { id: "N1", x: 0, y: 0, z: 0 },
            { id: "N2", x: 4, y: 0, z: 0 },
            { id: "N3", x: 8, y: 0, z: 0 },
            { id: "N4", x: 4, y: 3, z: 0 },
        ],
        elementTemplates: [
            { id: "G1", I: 5e-4, E_kN_m2: 2e8, G_GPa: 80, J: 4e-4 },
        ],
        elements: [
            { id: "B1", templateId: "G1", startNode: "N1", endNode: "N2" },
            { id: "B2", templateId: "G1", startNode: "N2", endNode: "N3" },
            { id: "B3", templateId: "G1", startNode: "N2", endNode: "N4" },
        ],
        supportTemplates: [],
        supportAssignments: [
            { id: "SA1", supportId: "FIXED", nodeId: "N1" },
            { id: "SA2", supportId: "ROLLER", nodeId: "N3" },
        ],
        loadCases: [
            { id: "LC1", type: "Dead", description: "Dead Load" },
        ],
        loads: [
            { id: "L1", loadCaseId: "LC1", type: "Element UDL", nodeId: "", elementId: "B2", axisSystem: "Global", angle: 0,
              distance: 0, distanceEnd: 4, Fx: 0, Fy: 0, Fz: -10, FxEnd: 0, FyEnd: 0, FzEnd: -10 },
            { id: "L2", loadCaseId: "LC1", type: "Element Point Load", nodeId: "", elementId: "B3", axisSystem: "Global", angle: 0,
              distance: 3, distanceEnd: "", Fx: 0, Fy: 0, Fz: -20, FxEnd: "", FyEnd: "", FzEnd: "" },
        ],
        momentCases: [
            { id: "TC1", type: "Dead", description: "Dead Torsion" },
        ],
        moments: [
            { id: "T1", momentCaseId: "TC1", type: "Element Moment", nodeId: "", elementId: "B3", distance: 3, Mx: 0, My: 15, Mz: 0 },
        ],
    };

    const inputs = {
        "loads.L1": { loadDistanceEnd: "L" },
        "loads.L2": { loadDistance: "L" },
        "moments.T1": { momentDistance: "L" },
    };

    const notes = {
        "elementTemplates.G1": "Note the units: E in kN/m², but G in GPa.",
        "elements.B3": "The stub that sticks out along +Y.",
        "supportAssignments.SA1": "Left end of the main beam: nothing can move or turn.",
        "supportAssignments.SA2": "Right end: only vertical movement is blocked.",
        "loads.L1": "Negative Fz = downward. 10 kN every metre along B2.",
        "loads.L2": "a = L is the free end N4 of the stub.",
        "moments.T1": "My = + means the arrow points up (+ up, − down).",
    };

    const figureCaption = "Finished grid seen from above: filled red circles are downward loads, grey triangles are supports, ↑ is the torsion.";

    const resultsCard = (id) => {
        const el = document.getElementById(id);
        return el ? el.closest(".card") : null;
    };

    const steps = [
        /* 1 */ {
            id: "welcome", card: true, figure: "model", figureCaption,
            title: "Welcome to the Grid tutorial",
            body: `<p>A <b>grid</b> (grillage) is a flat framework of beams that lies in a horizontal plane and is loaded <b>downward, at right angles to that plane</b>: think of a floor grid or a bridge deck.</p>
                <p>Because the beams are rigidly connected, a load on one beam does two jobs on its neighbours: it <b>bends</b> them and it <b>twists</b> them (<b>torsion</b>). That is why a grid needs two extra properties, <b>G</b> and <b>J</b>.</p>
                <p>You will build the T-shaped grid above: a main beam with a stub beam sticking out sideways. Loading the stub twists the main beam.</p>
                <div class="sa-callout info"><b>First time here?</b> Do the <b>Beginner tutorial</b> first. This one assumes you know the tabs and concentrates on what is different in a grid. Orange highlights show what to use next and every form is pre-filled. Use <b>✨ Do it for me</b> any time.</div>`,
            nextLabel: "Let us start →",
        },
        /* 2 */ {
            id: "create-model", section: "home", createModel: true,
            title: "Create a new Grid model",
            body: `<p>Press the highlighted <b>＋ New Model</b> button. In the window, the name is filled in and <b>Grid</b> is already selected. Press <b>Create Model</b>.</p>
                <p><small>The type cannot be changed afterwards, which is why you choose it first.</small></p>`,
            hint: "Press ＋ New Model, then Create Model.",
            doneNote: "Your Grid model exists. Press Next.",
            isDone: (S) => S.modelCreated,
            targets: () => {
                const dialog = document.getElementById("newModelModal");
                if (dialog && !dialog.hidden) {
                    return [{ sel: "#newModelModal .model-create-dialog", style: "soft" },
                            { sel: "#newModelModal .model-create-actions .btn-primary", style: "strong" }];
                }
                return [{ sel: "#home .home-standalone-actions .btn-primary", style: "strong" }];
            },
            auto: (S) => {
                if (typeof createNewModelRecord === "function") createNewModelRecord(S.modelName, S.def.mode);
                return "";
            },
        },
        /* 3 */ {
            id: "grid-words", section: "dashboard",
            title: "Same workspace, grid words",
            body: `<p>The badge in the top bar now says <b>Grid Model</b>. Some names change:</p>
                <ul>
                    <li><b>Moments</b> become <b>Torsions</b> (tabs Torsion Cases and Torsions).</li>
                    <li>Loads have only one component, <b>Fz</b>, at right angles to the grid.</li>
                    <li>Supports restrain vertical movement <b>ΔZ</b> and the two rotations <b>θX, θY</b>.</li>
                    <li>Node <b>Z is ignored</b>: the grid lies flat in the XY plane.</li>
                </ul>`,
            targets: [{ sel: "#currentModelTypeBadge", style: "strong" }, { sel: ".sidebar .nav-buttons", style: "soft" }],
        },
        /* 4 */ {
            id: "nodes", nav: "nodes", task: { kind: "nodes" },
            title: "Step 1 · Nodes",
            body: `<p>Same as before, but only <b>X and Y</b> matter. Seen from above, X points right and Y points up the page.</p>
                <p>Press <b>Create Node</b> for each of the four nodes.</p>`,
            hint: "Press the highlighted Create Node button four times.",
            doneNote: "Four nodes. They appear as blue dots in the live diagram. Press Next.",
        },
        /* 5 */ {
            id: "template", nav: "elements", task: { kind: "elementTemplates" },
            title: "Step 2a · Element template for a grid",
            body: `<p>A grid beam needs four numbers:</p>
                <ul>
                    <li><b>E</b>: material stiffness for bending (kN/m²),</li>
                    <li><b>I</b>: bending stiffness of the section (m⁴),</li>
                    <li><b>G</b>: material stiffness for twisting, the shear modulus. <b>Entered in GPa</b>,</li>
                    <li><b>J</b>: torsional constant, how well the section resists twisting (m⁴).</li>
                </ul>
                <div class="sa-callout"><b>Watch the units:</b> E is in kN/m² but G is in GPa (steel: E ≈ 2×10⁸ kN/m², G ≈ 80 GPa).</div>`,
            hint: "Press Create Element Template.",
            doneNote: "One template is enough here: all beams share the same section. Press Next.",
        },
        /* 6 */ {
            id: "elements", section: "elements", task: { kind: "elements" },
            title: "Step 2b · Elements",
            body: `<p>Connect the nodes. B1 and B2 form the main beam along X; B3 is the stub going from N2 up to N4.</p>`,
            hint: "Press Assign Element three times.",
            doneNote: "A T-shape in the live diagram. Press Next.",
            targets: [{ sel: "#elementAssignmentForm", style: "soft" }, { sel: "#elementSubmitBtn", style: "strong" }, { sel: "#liveModelDiagramCard", style: "soft" }],
        },
        /* 7 */ {
            id: "supports-info", nav: "supports",
            title: "Step 3a · Supports in a grid",
            body: `<p>The three built-in supports work on the vertical movement and the two rotations:</p>
                <ul>
                    <li><b>Fixed</b>: ΔZ, θX and θY all blocked: nothing moves or turns.</li>
                    <li><b>Roller</b> and <b>Hinged</b>: only ΔZ is blocked; both rotations stay free. In a grid they behave the same.</li>
                </ul>`,
            targets: [{ sel: "#supports .card:first-child .grid-3", style: "strong" }],
        },
        /* 8 */ {
            id: "supports", section: "supports", task: { kind: "supportAssignments" },
            title: "Step 3b · Assign the supports",
            body: `<p>Fixed at N1 and a Roller at N3. N4, the end of the stub, is left free, so a load there must travel through the stub into the main beam.</p>`,
            hint: "Press Assign Support twice.",
            doneNote: "Press Next.",
            targets: [{ sel: "#supportAssignmentForm", style: "soft" }, { sel: "#supportAssignmentSubmitBtn", style: "strong" }, { sel: "#liveModelDiagramCard", style: "soft" }],
        },
        /* 9 */ {
            id: "load-cases", nav: "loadCases", task: { kind: "loadCases" },
            title: "Step 4 · Load case",
            body: `<p>Load cases work exactly as in the Beginner tutorial: a named group of loads, analysed one at a time. One Dead case is enough here.</p>`,
            hint: "Press Create Load Case.",
            doneNote: "Press Next.",
        },
        /* 10 */ {
            id: "loads", nav: "loads", task: { kind: "loads" },
            title: "Step 5 · Loads (Fz only)",
            body: `<p>Only the vertical component <b>Fz</b> exists. <b>Positive = up (out of the page), negative = down (into the page)</b>, so gravity is negative.</p>
                <ul>
                    <li><b>L1</b>: a UDL of −10 kN/m over the whole of B2.</li>
                    <li><b>L2</b>: a −20 kN point load at the free end of the stub (distance <code>L</code>).</li>
                </ul>`,
            hint: "Press Create Load twice. Downward loads show as filled red circles.",
            doneNote: "Press Next.",
            targets: [{ sel: "#loadForm", style: "soft" }, { sel: "#loadSubmitBtn", style: "strong" }, { sel: "#liveModelDiagramCard", style: "soft" }],
        },
        /* 11 */ {
            id: "torsion-cases", nav: "momentCases", task: { kind: "momentCases" },
            title: "Step 6 · Torsion case",
            body: `<p>In a grid, the twisting moments you apply are called <b>torsions</b>, and they also come in cases. A run needs one load case and one torsion case selected, even if the torsion case is empty.</p>`,
            hint: "Press Create Torsion Case.",
            doneNote: "Press Next.",
        },
        /* 12 */ {
            id: "torsions", nav: "moments", task: { kind: "moments" },
            title: "Step 7 · Torsion",
            body: `<p>Two components are available. They are moment arrows (right-hand rule):</p>
                <ul>
                    <li><b>Mx</b>: arrow along X, <b>+ right, − left</b>,</li>
                    <li><b>My</b>: arrow along Y, <b>+ up, − down</b> (viewed from above).</li>
                </ul>
                <p>Here a torque <b>My = +15 kN·m</b> acts at the free end of the stub B3.</p>`,
            hint: "Press Create Torsion.",
            doneNote: "A purple arrow marks it. Press Next.",
            targets: [{ sel: "#momentForm", style: "soft" }, { sel: "#momentSubmitBtn", style: "strong" }, { sel: "#liveModelDiagramCard", style: "soft" }],
        },
        /* 13 */ {
            id: "cases", nav: "results",
            title: "Step 8 · Choose what to analyse",
            body: `<p>Choose <b>LC1</b> as Active Load Case and <b>TC1</b> as Active Moment Case (the torsion case).</p>`,
            hint: "Choose LC1 and TC1 in the highlighted lists.",
            doneNote: "Press Next.",
            isDone: () => typeof activeLoadCaseId !== "undefined" && activeLoadCaseId === "LC1" && activeMomentCaseId === "TC1",
            targets: [{ sel: "#activeLoadCaseSelect", style: "strong" }, { sel: "#activeMomentCaseSelect", style: "strong" }],
            auto: () => {
                const lc = document.getElementById("activeLoadCaseSelect");
                const mc = document.getElementById("activeMomentCaseSelect");
                if (!lc || !mc) return "The Results tab is not ready.";
                lc.value = "LC1"; mc.value = "TC1";
                lc.dispatchEvent(new Event("change", { bubbles: true }));
                mc.dispatchEvent(new Event("change", { bubbles: true }));
                return "";
            },
        },
        /* 14 */ {
            id: "run", section: "results",
            title: "Run the analysis",
            body: `<p>Press <b>Run Analysis</b>. A message confirms when the grid solver has finished: press OK in it.</p>`,
            hint: "Press the highlighted Run Analysis button.",
            doneNote: "Analysis finished. Press Next.",
            latch: true,
            isDone: () => analysisState.status === "valid" && activeLoadCaseId === "LC1",
            targets: [{ sel: "#results .card-header .btn-primary", style: "strong" }],
            auto: () => { if (typeof runAnalysis === "function") runAnalysis(); return ""; },
        },
        /* 15 */ {
            id: "summary", section: "results",
            title: "Reading grid results",
            body: `<p>The headings now use grid wording: reactions are <b>Mx, My and Fz</b>, and the equilibrium check balances <b>ΣMx, ΣMy and ΣFz</b>.</p>
                <div class="sa-callout good"><b>Check it by hand:</b> total downward load = 10 kN/m × 4 m + 20 kN = <b>60 kN</b>. The vertical reactions (Fz) at N1 and N3 must add up to 60 kN.</div>`,
            targets: [{ sel: ".analysis-summary-card", style: "strong" }, { sel: ".equilibrium-card", style: "strong" }],
        },
        /* 16 */ {
            id: "diagrams", section: "results",
            title: "Look at the diagrams",
            body: `<p>The list in <b>Analysis Diagrams</b> offers <b>Torsion (Mx)</b>, <b>Vertical Shear (Fz)</b>, <b>Torsion (My)</b> and <b>Displacement</b>. Choose <b>Vertical Shear (Fz)</b> and compare it with the torsion diagrams: the main beam carries twisting that comes from the stub.</p>`,
            hint: "Choose Vertical Shear (Fz) in the highlighted card.",
            doneNote: "Try the other diagrams too. Press Next.",
            latch: true,
            isDone: () => { const s = document.getElementById("resultsDiagramMode"); return !!s && s.value === "sfd"; },
            targets: () => [{ el: resultsCard("resultsDiagramMode"), style: "strong" }],
            auto: () => {
                const s = document.getElementById("resultsDiagramMode");
                if (s) { s.value = "sfd"; s.dispatchEvent(new Event("change", { bubbles: true })); }
                return "";
            },
        },
        /* 17 */ {
            id: "save", section: "results",
            title: "Save your model",
            body: `<p>Press <b>Save Model</b> in the top bar to keep this grid on the Home screen.</p>`,
            hint: "Press the highlighted Save Model button.",
            doneNote: "Saved. Press Next.",
            latch: true,
            isDone: () => !!currentModelLibraryId,
            targets: [{ sel: ".topbar .top-actions .btn-primary", style: "strong" }],
            auto: () => { if (typeof saveCurrentModelToLibrary === "function") saveCurrentModelToLibrary(true); return ""; },
        },
        /* 18 */ {
            id: "finish", card: true,
            title: "🎉 Great! You solved a grid",
            body: `<p>You have learned what is different in a Grid model: <b>G and J</b> in the template, supports that act on <b>ΔZ, θX, θY</b>, loads that are only <b>Fz</b>, and <b>torsions</b> instead of moments.</p>
                <p>Press <b>Home → ＋ New Model</b> to start your own grid. You can reopen the tutorials any time with the <b>?</b> button.</p>`,
            nextLabel: "Finish ✓",
        },
    ];

    window.StructuralTutorial.register({
        id: "grid",
        shortTitle: "Grid",
        title: "Grid tutorial",
        summary: "Build a T-shaped grid and see how a load on one beam bends and twists the others.",
        learn: [
            "What is different in a Grid model (G, J, Fz, torsion)",
            "Grid supports: Fixed, Roller and Hinged",
            "Reading torsion, shear and displacement results",
        ],
        duration: "≈ 12 min",
        mode: "grid",
        modelName: "Tutorial - Grid",
        analyseStepId: "cases",
        data: data,
        inputs: inputs,
        notes: notes,
        steps: steps,
    });
})();
