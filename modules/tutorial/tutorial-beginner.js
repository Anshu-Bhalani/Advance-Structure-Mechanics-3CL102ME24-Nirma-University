/* ==========================================================================
 * tutorial-beginner.js — Beginner tutorial: Beam, Truss & Frame
 *
 * One small 2D structure that uses every basic input of the Beam / Truss /
 * Frame solver: a portal frame (Frame members), a cantilever overhang (Beam
 * member) and a diagonal brace (Truss member), with all three built-in
 * supports, a dead and a live load case, a point load, a UDL and a moment.
 *
 * Units: kN, m, kN/m, kN·m, E in kN/m².
 *
 *     N2 ─────── R1 (Frame) ─────── N3 ═══ O1 (Beam) ═══ N5   y = 4 m
 *     │                 ╲            │
 *     C1 (Frame)         D1 (Truss)  C2 (Frame)
 *     │                    ╲         │
 *     N1 (Fixed)             ╲      N4 (Hinged)              y = 0 m
 *     x = 0                          x = 6 m          x = 9 m   (N5: Roller)
 *
 * The data block is written in the app's saved-model format so the tutorial can
 * compare it with what the learner enters. The moment is deliberately placed at
 * a joint (distance 0), exactly as the Dashboard recommends.
 * ========================================================================== */
(function () {
    "use strict";
    if (!window.StructuralTutorial) return;

    const E = 2e8; // steel, kN/m²  (200 GPa)

    const data = {
        analysisMode: "plane",
        dofSettings: { skipAxial: false, skipMoment: false },
        nodes: [
            { id: "N1", x: 0, y: 0, z: 0 },
            { id: "N2", x: 0, y: 4, z: 0 },
            { id: "N3", x: 6, y: 4, z: 0 },
            { id: "N4", x: 6, y: 0, z: 0 },
            { id: "N5", x: 9, y: 4, z: 0 },
        ],
        elementTemplates: [
            { id: "F1", memberType: "frame", I: 5e-4, E_kN_m2: E, A: 8e-3, alpha: 0, thermalDepth: 0 },
            { id: "B1", memberType: "beam", I: 5e-4, E_kN_m2: E, A: 8e-3, alpha: 0, thermalDepth: 0 },
            { id: "T1", memberType: "truss", I: 0, E_kN_m2: E, A: 4e-3, alpha: 0, thermalDepth: 0 },
        ],
        elements: [
            { id: "C1", templateId: "F1", startNode: "N1", endNode: "N2" },
            { id: "R1", templateId: "F1", startNode: "N2", endNode: "N3" },
            { id: "C2", templateId: "F1", startNode: "N4", endNode: "N3" },
            { id: "O1", templateId: "B1", startNode: "N3", endNode: "N5" },
            { id: "D1", templateId: "T1", startNode: "N1", endNode: "N3" },
        ],
        supportTemplates: [],
        supportAssignments: [
            { id: "SA1", supportId: "FIXED", nodeId: "N1" },
            { id: "SA2", supportId: "HINGED", nodeId: "N4" },
            { id: "SA3", supportId: "ROLLER", nodeId: "N5" },
        ],
        loadCases: [
            { id: "LC1", type: "Dead", description: "Dead load" },
            { id: "LC2", type: "Live", description: "Wind load" },
        ],
        loads: [
            { id: "L1", loadCaseId: "LC1", type: "Element UDL", nodeId: "", elementId: "R1", axisSystem: "Global", angle: 0,
              distance: 0, distanceEnd: 6, Fx: 0, Fy: -20, Fz: 0, FxEnd: 0, FyEnd: -20, FzEnd: 0 },
            { id: "L2", loadCaseId: "LC1", type: "Element Point Load", nodeId: "", elementId: "O1", axisSystem: "Global", angle: 0,
              distance: 1.5, distanceEnd: "", Fx: 0, Fy: -30, Fz: 0, FxEnd: "", FyEnd: "", FzEnd: "" },
            { id: "L3", loadCaseId: "LC2", type: "Element Point Load", nodeId: "", elementId: "C1", axisSystem: "Global", angle: 0,
              distance: 4, distanceEnd: "", Fx: 15, Fy: 0, Fz: 0, FxEnd: "", FyEnd: "", FzEnd: "" },
        ],
        momentCases: [
            { id: "MC1", type: "Dead", description: "Dead moment" },
        ],
        moments: [
            { id: "M1", momentCaseId: "MC1", type: "Element Moment", nodeId: "", elementId: "R1", distance: 0, Mx: 0, My: 0, Mz: 25 },
        ],
    };

    // Text typed into a field when it differs from the plain number (L = member length).
    const inputs = {
        "loads.L1": { loadDistanceEnd: "L" },
        "loads.L2": { loadDistance: "L/2" },
        "loads.L3": { loadDistance: "L" },
    };

    // Extra remark shown under one checklist entry.
    const notes = {
        "elementTemplates.F1": "Columns and the roof beam: rigid joints.",
        "elementTemplates.B1": "The overhang to the right.",
        "elementTemplates.T1": "The diagonal brace. Choose Truss first, then I locks to 0.",
        "elements.D1": "The thin diagonal from N1 to N3.",
        "supportAssignments.SA1": "Left column base: nothing can move or rotate.",
        "supportAssignments.SA2": "Right column base: can rotate, cannot move.",
        "supportAssignments.SA3": "Tip of the overhang: only vertical movement is blocked.",
        "loads.L1": "Negative = downward. 20 kN every metre along the roof beam.",
        "loads.L2": "Type L/2 or press the L/2 chip: halfway along the overhang.",
        "loads.L3": "A sideways wind push at the top of the left column (a = L is its top end).",
        "moments.M1": "Distance 0 puts the moment exactly at joint N2.",
    };

    const figureCaption = "Finished model: blue dots are nodes, grey triangles are supports, red arrows are loads, ↺ is the moment.";

    /* ---- small helpers used by the steps ---- */
    const caseSelectsReady = () => typeof activeLoadCaseId !== "undefined";
    const resultsCard = (id) => {
        const el = document.getElementById(id);
        return el ? el.closest(".card") : null;
    };

    const steps = [
        /* 1 */ {
            id: "welcome", card: true, figure: "model", figureCaption,
            title: "Welcome! Let us build your first structure",
            body: `<p>In about <b>20 minutes</b> you will build and solve this small structure yourself. It is deliberately a mix of everything beginners meet:</p>
                <ul>
                    <li><b>Frame</b> members (rigid joints): the two columns and the roof beam,</li>
                    <li>a <b>Beam</b> member: the overhang on the right,</li>
                    <li>a <b>Truss</b> member: the thin diagonal brace.</li>
                </ul>
                <p>Every model in this program is entered in the same order: <b>Nodes → Elements → Supports → Load cases → Loads → Moment cases → Moments</b>, then you press <b>Run Analysis</b> and read the results.</p>
                <div class="sa-callout info"><b>How this tutorial works.</b> The program highlights what to use next in <span style="color:#b45309;font-weight:800">orange</span> and pre-fills each form for you. You only check the values and press the highlighted button. If you get stuck, press <b>✨ Do it for me</b>. You can leave at any time with ✕.</div>
                <p>Units used throughout: <b>kN, m, kN/m, kN·m</b>.</p>`,
            nextLabel: "Let us start →",
        },
        /* 2 */ {
            id: "create-model", section: "home", createModel: true,
            title: "Create a new model",
            body: `<p>Every project is a <b>model</b>. Press the highlighted <b>＋ New Model</b> button.</p>
                <p>A small window opens. The name and type are already filled in for you: keep <b>Beam / Truss / Frame</b> selected and press <b>Create Model</b>.</p>
                <p><small>The structure type is fixed once a model is created. Anything you were working on is saved automatically first.</small></p>`,
            hint: "Press ＋ New Model, then Create Model.",
            doneNote: "Your model exists. Press Next.",
            isDone: (S) => S.modelCreated,
            targets: (S) => {
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
            id: "workspace", section: "dashboard",
            title: "Your workspace",
            body: `<ul>
                    <li><b>Left menu:</b> one tab for each part of the input. Work from top to bottom.</li>
                    <li><b>Live diagram</b> (top of the page): your structure is drawn here and updates as you add things. It is the best way to spot mistakes early.</li>
                    <li><b>Top bar:</b> model name, <b>Export</b> and <b>Save Model</b>.</li>
                </ul>`,
            targets: [{ sel: ".sidebar .nav-buttons", style: "strong" }, { sel: "#liveModelDiagramCard", style: "soft" }],
        },
        /* 4 */ {
            id: "nodes", nav: "nodes", task: { kind: "nodes" },
            title: "Step 1 · Nodes: the joints",
            body: `<p>A <b>node</b> is a point where members meet or where a support sits. Its position is given in metres from the origin: <b>X to the right, Y upward</b>.</p>
                <p>The form below is pre-filled with <b>N1</b>. Press <b>Create Node</b>, then do the same for the other four; the next values appear automatically.</p>`,
            hint: "Press the highlighted Create Node button. Repeat until all five are ticked.",
            doneNote: "All five nodes exist. Look at the live diagram: they appear as blue dots. Press Next.",
        },
        /* 5 */ {
            id: "templates", nav: "elements", task: { kind: "elementTemplates" },
            title: "Step 2a · Element templates: what the members are made of",
            body: `<p>A <b>template</b> stores the material and section properties once, so many members can share it.</p>
                <ul>
                    <li><b>Frame</b>: rigid joints; carries axial force, shear and bending.</li>
                    <li><b>Beam</b>: loaded across its length (bending and shear).</li>
                    <li><b>Truss</b>: a pin-ended bar that carries <i>only</i> axial force. Its I is always 0.</li>
                </ul>
                <p><b>E</b> = stiffness of the material (steel ≈ 2×10⁸ kN/m²), <b>I</b> = bending stiffness of the section, <b>A</b> = cross-section area. Type <code>2e8</code> for 2×10⁸.</p>
                <details><summary>Why 2e8, 5e-4, 8e-3?</summary>Very large and very small numbers are typed with <code>e</code>: <code>2e8</code> = 200 000 000 and <code>5e-4</code> = 0.0005. On a phone use the small <b>e</b> button under the field.</details>`,
            hint: "Press Create Element Template for F1, B1 and T1 (the type is already chosen for you).",
            doneNote: "Three templates are ready. Press Next.",
        },
        /* 6 */ {
            id: "elements", section: "elements", task: { kind: "elements" },
            title: "Step 2b · Elements: connect the nodes",
            body: `<p>An <b>element</b> is a template placed between a <b>start node</b> and an <b>end node</b>. The direction matters: distances along a member (for loads) are measured <b>from the start node</b>.</p>
                <p>Press <b>Assign Element</b> for each of the five members.</p>`,
            hint: "Press the highlighted Assign Element button five times.",
            doneNote: "The structure is drawn in the live diagram: two columns, a roof beam, an overhang and a diagonal. Press Next.",
            targets: [{ sel: "#elementAssignmentForm", style: "soft" }, { sel: "#elementSubmitBtn", style: "strong" }, { sel: "#liveModelDiagramCard", style: "soft" }],
        },
        /* 7 */ {
            id: "supports-info", nav: "supports",
            title: "Step 3a · The three built-in supports",
            body: `<p>Supports hold the structure up. Three are ready to use:</p>
                <ul>
                    <li><b>Fixed</b>: cannot move or rotate (like a column cast into a foundation).</li>
                    <li><b>Hinged</b>: cannot move, but can rotate freely.</li>
                    <li><b>Roller</b>: only blocks vertical movement; it can slide sideways and rotate.</li>
                </ul>
                <p>Press <b>Next</b>. On the next step you place them on nodes.</p>`,
            targets: [{ sel: "#supports .card:first-child .grid-3", style: "strong" }],
        },
        /* 8 */ {
            id: "supports", section: "supports", task: { kind: "supportAssignments" },
            title: "Step 3b · Assign supports to nodes",
            body: `<p>Choose a support and a node, then press <b>Assign Support</b>. Leave the “prescribed movement” boxes at 0 (they are for settlement problems).</p>
                <p>Only one support can be assigned to a node.</p>`,
            hint: "Press the highlighted Assign Support button three times.",
            doneNote: "Supports appear as symbols in the live diagram. Press Next.",
            targets: [{ sel: "#supportAssignmentForm", style: "soft" }, { sel: "#supportAssignmentSubmitBtn", style: "strong" }, { sel: "#liveModelDiagramCard", style: "soft" }],
        },
        /* 9 */ {
            id: "load-cases", nav: "loadCases", task: { kind: "loadCases" },
            title: "Step 4 · Load cases",
            body: `<p>A <b>load case</b> is a named group of loads that act together, such as <i>Dead</i> (weights) or <i>Live</i> (people, wind).</p>
                <p>The analysis runs <b>one load case at a time</b>, so you can later compare how the structure reacts to each. Create <b>LC1</b> and <b>LC2</b>.</p>`,
            hint: "Press Create Load Case twice.",
            doneNote: "Two load cases exist. Press Next.",
        },
        /* 10 */ {
            id: "loads", nav: "loads", task: { kind: "loads" },
            title: "Step 5 · Loads",
            body: `<p>Loads are attached to a <b>load case</b> and to an <b>element</b>:</p>
                <ul>
                    <li><b>Point load</b>: a single force (kN) at distance <b>a</b> from the start node. <code>0</code> = start node, <code>L</code> = end node, <code>L/2</code> = middle.</li>
                    <li><b>UDL</b>: a force spread over a length (kN/m), from <b>a</b> to <b>b</b>.</li>
                </ul>
                <p><b>Signs (Global axes):</b> +X to the right, +Y upward. So a <b>downward</b> load is <b>negative Fy</b>.</p>`,
            hint: "Press Create Load for L1, L2 and L3. Watch the red arrows appear in the live diagram.",
            doneNote: "Loads are drawn as red arrows. Press Next.",
            targets: [{ sel: "#loadForm", style: "soft" }, { sel: "#loadSubmitBtn", style: "strong" }, { sel: "#liveModelDiagramCard", style: "soft" }],
        },
        /* 11 */ {
            id: "moment-cases", nav: "momentCases", task: { kind: "momentCases" },
            title: "Step 6 · Moment cases",
            body: `<p>Moments (twisting forces that make a member turn) have their own cases, just like loads.</p>
                <div class="sa-callout"><b>Good to know:</b> a run always needs <b>one load case and one moment case</b> selected. A moment case may be empty, but it must exist.</div>`,
            hint: "Press Create Moment Case.",
            doneNote: "Press Next.",
        },
        /* 12 */ {
            id: "moments", nav: "moments", task: { kind: "moments" },
            title: "Step 7 · Moments",
            body: `<p>A moment is placed on an element at distance <b>a</b>. The sign convention: <b>positive = anticlockwise ↺</b>.</p>
                <p>Distance <code>0</code> (or <code>L</code>) places the moment exactly at a joint. Here it acts at joint N2, the top of the left column.</p>`,
            hint: "Press Create Moment.",
            doneNote: "A purple ↺ marks the moment in the live diagram. Press Next.",
            targets: [{ sel: "#momentForm", style: "soft" }, { sel: "#momentSubmitBtn", style: "strong" }, { sel: "#liveModelDiagramCard", style: "soft" }],
        },
        /* 13 */ {
            id: "check", nav: "dashboard",
            title: "Check your input",
            body: `<p>The Dashboard counts what is in the model. You should see <b>5 nodes, 5 elements, 3 supports, 3 loads, 1 moment</b>.</p>
                <p>If a number is wrong, open that tab and fix the entry with the ✎ button in its table. Always check the live diagram too.</p>`,
            targets: [{ sel: "#dashboard .stat-grid", style: "strong" }],
        },
        /* 14 */ {
            id: "cases", nav: "results", analyse: true,
            title: "Step 8 · Choose what to analyse",
            body: `<p>Open the two lists and choose <b>LC1</b> as the <b>Active Load Case</b> and <b>MC1</b> as the <b>Active Moment Case</b>. Only loads and moments of the chosen cases are used.</p>
                <p>Leave the two “Neglect” checkboxes unticked.</p>`,
            hint: "Choose LC1 and MC1 in the highlighted lists.",
            doneNote: "Cases selected. Press Next.",
            isDone: () => caseSelectsReady() && activeLoadCaseId === "LC1" && activeMomentCaseId === "MC1",
            targets: [{ sel: "#activeLoadCaseSelect", style: "strong" }, { sel: "#activeMomentCaseSelect", style: "strong" }],
            auto: () => {
                const lc = document.getElementById("activeLoadCaseSelect");
                const mc = document.getElementById("activeMomentCaseSelect");
                if (!lc || !mc) return "The Results tab is not ready.";
                lc.value = "LC1"; mc.value = "MC1";
                lc.dispatchEvent(new Event("change", { bubbles: true }));
                mc.dispatchEvent(new Event("change", { bubbles: true }));
                return "";
            },
        },
        /* 15 */ {
            id: "run", section: "results",
            title: "Run the analysis",
            body: `<p>Press <b>Run Analysis</b>. The stiffness method is solved right in your browser, which takes a moment. A message may confirm that it finished: press OK.</p>`,
            hint: "Press the highlighted Run Analysis button. If a red banner reports a problem, re-check your inputs.",
            doneNote: "Analysis finished. The results are below. Press Next.",
            latch: true,
            isDone: () => analysisState.status === "valid" && activeLoadCaseId === "LC1",
            targets: [{ sel: "#results .card-header .btn-primary", style: "strong" }],
            auto: () => { if (typeof runAnalysis === "function") runAnalysis(); return ""; },
        },
        /* 16 */ {
            id: "summary", section: "results",
            title: "Reading the results: summary and equilibrium",
            body: `<p><b>Analysis Summary</b> shows the largest displacement, reaction, axial force, shear and bending moment.</p>
                <p><b>Global Equilibrium Check</b> proves the answer is sensible: the applied loads and the support reactions must cancel out. A green ✓ means they do.</p>
                <div class="sa-callout good"><b>Check it by hand:</b> total downward load = 20 kN/m × 6 m + 30 kN = <b>150 kN</b>, so the vertical reactions at the three supports must add up to 150 kN. You can see them in <i>Reaction Diagram</i> below.</div>`,
            targets: [{ sel: ".analysis-summary-card", style: "strong" }, { sel: ".equilibrium-card", style: "strong" }],
        },
        /* 17 */ {
            id: "diagrams", section: "results",
            title: "Look at the diagrams",
            body: `<p>The <b>Analysis Diagrams</b> card draws what happens inside the members:</p>
                <ul>
                    <li><b>AFD</b>: axial force (push or pull along the member),</li>
                    <li><b>SFD</b>: shear force,</li>
                    <li><b>BMD</b>: bending moment,</li>
                    <li><b>Displacement</b>: the deflected shape (exaggerated).</li>
                </ul>
                <p>Open the list in the highlighted card and choose <b>BMD</b>. Try the others too, then press Next.</p>`,
            hint: "Choose BMD in the list of the highlighted card.",
            doneNote: "That is the bending moment diagram. Press Next.",
            latch: true,
            isDone: () => { const s = document.getElementById("resultsDiagramMode"); return !!s && s.value === "bmd"; },
            targets: () => [{ el: resultsCard("resultsDiagramMode"), style: "strong" }],
            auto: () => {
                const s = document.getElementById("resultsDiagramMode");
                if (s) { s.value = "bmd"; s.dispatchEvent(new Event("change", { bubbles: true })); }
                return "";
            },
        },
        /* 18 */ {
            id: "calc-steps", section: "results",
            title: "See the full working",
            body: `<p>This program shows <b>every stage</b> of the stiffness method. Click the tabs <b>1 to 8</b> in the highlighted menu to see: degrees of freedom, member properties, stiffness matrices, the global matrix, boundary conditions, displacements, reactions and the final tables.</p>
                <p><b>📄 Export PDF</b> next to it saves the whole solution as a report.</p>`,
            targets: [{ sel: "#results .results-detail-menu", style: "strong" }],
        },
        /* 19 */ {
            id: "second-case", section: "results",
            title: "Try the other load case",
            body: `<p>Change <b>Active Load Case</b> to <b>LC2</b> (the wind load), then press <b>Run Analysis</b> again.</p>
                <p>Notice that the moment you change anything, the banner turns red: <i>results are outdated</i>. Always re-run after a change.</p>`,
            hint: "Choose LC2, then press Run Analysis.",
            doneNote: "Compare the diagrams with the first run: wind bends the columns much more. Press Next.",
            latch: true,
            isDone: () => analysisState.status === "valid" && activeLoadCaseId === "LC2",
            targets: [{ sel: "#activeLoadCaseSelect", style: "strong" }, { sel: "#results .card-header .btn-primary", style: "strong" }],
            auto: () => {
                const lc = document.getElementById("activeLoadCaseSelect");
                if (lc) { lc.value = "LC2"; lc.dispatchEvent(new Event("change", { bubbles: true })); }
                if (typeof runAnalysis === "function") runAnalysis();
                return "";
            },
        },
        /* 20 */ {
            id: "save", section: "results",
            title: "Save your model",
            body: `<p>Press <b>Save Model</b> in the top bar. Your model is stored in this browser and appears on the Home screen. <b>Export</b> saves a file you can share or back up.</p>`,
            hint: "Press the highlighted Save Model button.",
            doneNote: "Saved. Press Next.",
            latch: true,
            isDone: () => !!currentModelLibraryId,
            targets: [{ sel: ".topbar .top-actions .btn-primary", style: "strong" }],
            auto: () => { if (typeof saveCurrentModelToLibrary === "function") saveCurrentModelToLibrary(true); return ""; },
        },
        /* 21 */ {
            id: "finish", card: true,
            title: "🎉 Well done! You solved your first structure",
            body: `<p>You have now used every tab of the program:</p>
                <ul>
                    <li><b>Define:</b> Nodes, Element templates and Elements, Supports,</li>
                    <li><b>Load:</b> Load cases, Loads, Moment cases, Moments,</li>
                    <li><b>Solve:</b> Run Analysis, then read the summary, equilibrium and diagrams.</li>
                </ul>
                <p><b>What next?</b> Press <b>Home → ＋ New Model</b> and enter your own structure. For floor grids and bridge decks, take the <b>Grid tutorial</b>. You can reopen the tutorials any time with the <b>?</b> button.</p>`,
            nextLabel: "Finish ✓",
        },
    ];

    window.StructuralTutorial.register({
        id: "beginner",
        shortTitle: "Beginner",
        title: "Beginner tutorial: Beam, Truss & Frame",
        summary: "Build and solve a complete structure from scratch, and learn what every tab is for.",
        learn: [
            "The 7 inputs of every model, in the right order",
            "Frame, Beam and Truss members; Fixed, Hinged and Roller supports",
            "Point loads, UDLs and moments, with their signs",
            "Running the analysis and reading reactions and diagrams",
        ],
        duration: "≈ 20 min",
        mode: "plane",
        modelName: "Tutorial - Beam, Truss & Frame",
        analyseStepId: "cases",
        data: data,
        inputs: inputs,
        notes: notes,
        steps: steps,
    });
})();
