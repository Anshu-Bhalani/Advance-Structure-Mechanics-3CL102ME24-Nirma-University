/* ==========================================================================
 * main.js — global / common JavaScript
 * Shared by every page module: app configuration, application state, generic
 * helpers, unit system, input validation, matrix utilities, persistence
 * (save / load / export / import), sidebar navigation, sortable-table drag,
 * common select/delete helpers, refreshAll() and the application bootstrap.
 * 
 * Load order (see index.html): vendor/jspdf + svg2pdf + pdf-fonts -> main.js -> page modules
 * (home ... moment) -> results core -> results steps 1-8 -> diagrams.
 * ========================================================================== */

/* Injects a module's markup into the page.
 * target   : CSS selector (or Element) the markup is attached to
 * position : insertAdjacentHTML position ("beforeend", "afterbegin", "afterend", ...)
 * html     : markup string
 * Every page module / results part calls this once when its script loads. */
function mountModuleHTML(target, position, html) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) {
        console.error("[mountModuleHTML] mount point not found:", target);
        return null;
    }
    el.insertAdjacentHTML(position, html);
    return el;
}

/* ---- Application shell (loading overlay, sidebar, top bar, page container) ---- */
document.body.insertAdjacentHTML("afterbegin", `
<div id="analysisLoadingOverlay" class="analysis-loading-overlay" aria-hidden="true">
    <div class="analysis-loading-card">
        <div class="analysis-loading-spinner"></div>
        <div class="analysis-loading-title">Preparing Structural Analysis</div>
        <div class="analysis-loading-text" id="analysisLoadingText">
            Loading nodes, elements, loads, moments and calculation data…
        </div>
    </div>
</div>



<div class="app home-mode">

    <!-- SIDEBAR -->
    <aside class="sidebar">
        <div class="brand">
            <img class="brand-logo" src="assets/images/nirma-shield-transparent.webp" alt="Nirma University emblem">
            <h1>Structure Analysis</h1>
            <p>Input Model Builder</p>
            <p class="brand-course-label">Advance Structure Mechanics (3CL102ME24)</p>
        </div>
        <div class="nav-title">Model Input</div>
        <div class="nav-buttons">
            <button class="nav-btn active" data-section="home"><span class="nav-icon">⌂</span>Home</button>
            <button class="nav-btn" data-section="dashboard"><span class="nav-icon">⌂</span>Dashboard</button>
            <button class="nav-btn" data-section="nodes"><span class="nav-icon">●</span>Nodes</button>
            <button class="nav-btn" data-section="elements"><span class="nav-icon">━</span>Elements</button>
            <button class="nav-btn" data-section="supports"><span class="nav-icon">⚓</span>Supports</button>
            <button class="nav-btn" data-section="loadCases"><span class="nav-icon">▣</span>Load Cases</button>
            <button class="nav-btn" data-section="loads"><span class="nav-icon">↓</span>Loads</button>
            <button class="nav-btn" data-section="momentCases"><span class="nav-icon">↻</span>Moment Cases</button>
            <button class="nav-btn" data-section="moments"><span class="nav-icon">↺</span>Moments</button>
            <button class="nav-btn" data-section="results"><span class="nav-icon">📊</span>Results</button>
            <button class="nav-btn" data-section="about"><span class="nav-icon">ⓘ</span>About the Project</button>
        </div>
        <div class="sidebar-bottom">
            <button class="sidebar-btn" onclick="exportModel()">Export JSON</button>
            <button class="sidebar-btn" onclick="document.getElementById('jsonImport').click()">Import JSON</button>
            <input type="file" id="jsonImport" accept=".json" style="display:none" onchange="importModel(event)">
            <button class="sidebar-btn" onclick="clearModel()">Clear Model</button>
        </div>
    </aside>

    <!-- MAIN -->
    <main class="main">

        <header class="topbar">
            <div class="page-title">
                <h2 id="pageTitle">Model Home</h2>
                <p id="pageSubtitle">Manage your structural analysis models.</p>
            </div>
            <div class="top-actions">
                <button id="topbarHomeButton" type="button" class="btn btn-secondary" onclick="goHome()">⌂ Home</button>
                <span id="currentModelTypeBadge" class="badge badge-blue model-type-indicator" role="status" aria-label="Current model type" title="Model type is selected when creating a model and cannot be changed afterward">Beam / Truss / Frame Model</span>
                <input id="modelName" class="model-name-input" type="text" maxlength="120" placeholder="Model Name" aria-label="Model Name" value="Structural Model" oninput="saveModelNamePreference()">
                <button class="btn btn-secondary" onclick="exportModel()">Export</button>
                <button class="btn btn-primary" onclick="saveModel()">Save Model</button>
            </div>
        </header>

        <div class="container">
            <section id="about" class="section about-section">
                <div class="about-hero">
                    <img src="assets/images/nirma-university.webp" alt="Nirma University Institute of Technology logo" class="about-logo">
                    <p class="about-eyebrow">PROJECT INFORMATION</p>
                    <h2>About Structure Analysis</h2>
                    <p class="about-intro">An educational tool designed to help students build structural models and explore the stiffness method through interactive calculations and diagrams.</p>
                </div>
                <div class="about-grid">
                    <article class="about-card">
                        <span class="about-card-icon">✦</span>
                        <h3>Developed by</h3>
                        <p class="about-primary">Anshu Bhalani</p>
                        <p class="about-secondary">Project creator and developer</p>
                    </article>
                    <article class="about-card">
                        <span class="about-card-icon">⌂</span>
                        <h3>Institution</h3>
                        <p class="about-primary">Nirma University</p>
                        <p class="about-secondary">Institute of Technology</p>
                    </article>
                    <article class="about-card">
                        <span class="about-card-icon">◎</span>
                        <h3>Faculty Guidance</h3>
                        <p class="about-primary">Dr. Digesh Joshi</p>
                        <p class="about-primary">Dr. Paresh Patel</p>
                        <p class="about-secondary">Faculty members</p>
                    </article>
                    <article class="about-card">
                        <span class="about-card-icon">⌂</span>
                        <h3>Academic Details</h3>
                        <p class="about-primary">Civil Engineering Department</p>
                        <p class="about-secondary">Course: Advance Structure Mechanism</p>
                        <p class="about-secondary">Course Code: 3CL102ME24</p>
                    </article>
                </div>

            </section>
        </div>
    </main>
</div>

<div id="newModelModal" class="model-create-modal" hidden aria-hidden="true">
    <div class="model-create-backdrop" onclick="closeNewModelDialog()" aria-hidden="true"></div>
    <form class="model-create-dialog" role="dialog" aria-modal="true" aria-labelledby="newModelDialogTitle" onsubmit="createNewModelFromDialog(event)">
        <div class="model-create-heading">
            <h2 id="newModelDialogTitle">Create New Structural Model</h2>
            <p>Choose the structure type now. It will remain fixed for this model.</p>
        </div>
        <label class="model-create-field" for="newModelNameInput">Model name</label>
        <input id="newModelNameInput" class="model-name-input model-create-name" type="text" maxlength="120" autocomplete="off" placeholder="Model name">
        <fieldset class="model-type-options">
            <legend>Structure type</legend>
            <label class="model-type-option">
                <input type="radio" name="newModelAnalysisMode" value="plane" checked>
                <span><strong>Beam / Truss / Frame</strong><small>Standard 2D structural analysis</small></span>
            </label>
            <label class="model-type-option">
                <input type="radio" name="newModelAnalysisMode" value="grid">
                <span><strong>Grid</strong><small>Grid bending and torsional analysis</small></span>
            </label>
        </fieldset>
        <p id="newModelValidationMessage" class="model-create-error" role="alert" hidden></p>
        <div class="model-create-actions">
            <button type="button" class="btn btn-secondary" onclick="closeNewModelDialog()">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Model</button>
        </div>
    </form>
</div>
`);

// ==========================================================================
// 1. APP CONFIGURATION
// Application-wide constants: default values, diagram/rendering constants,
// persistence keys, and UI copy. Nothing in here performs calculations —
// it is pure static configuration consumed by the engines/controllers below.
// ==========================================================================
const AppConfig = {
    // Built-in plane-frame support templates. Always available; cannot be
    // deleted. Custom supports remain fully editable through the form.
    builtInSupportTemplates: [
        {
            id: "FIXED",
            description: "Fixed Support",
            type: "fixed",
            builtIn: true,
            restraints: { RFx: true, RFy: true, RFz: true, RMx: true, RMy: true, RMz: true },
            displacement: { dx: 0, dy: 0, dz: 0, tx: 0, ty: 0, tz: 0 },
        },
        {
            id: "ROLLER",
            description: "Roller Support",
            type: "roller",
            builtIn: true,
            restraints: { RFx: false, RFy: true, RFz: false, RMx: false, RMy: false, RMz: false },
            displacement: { dx: 0, dy: 0, dz: 0, tx: 0, ty: 0, tz: 0 },
        },
        {
            id: "HINGED",
            description: "Hinged Support",
            type: "hinged",
            builtIn: true,
            restraints: { RFx: true, RFy: true, RFz: false, RMx: false, RMy: false, RMz: false },
            displacement: { dx: 0, dy: 0, dz: 0, tx: 0, ty: 0, tz: 0 },
        },
    ],

    // Only these input-model keys are persisted to localStorage / export.
    // Solver-derived analysis state is never saved.
    persistedModelKeys: [
        "nodes",
        "elementTemplates",
        "elements",
        "supportTemplates",
        "supportAssignments",
        "loadCases",
        "loads",
        "momentCases",
        "moments",
    ],

    // Shared-baseline diagram scaling constants (see calculateAutoFit /
    // drawDiagramSVG): the same physical length always maps to the same
    // pixel length across the Structure Model, Reactions, AFD, SFD, BMD and
    // Displacement diagrams, keeping the whole visual system proportional.
    sharedDiagramBaselinePx: 200,
    modelDiagramBaselinePx: 200,

    // Page title/subtitle text shown in the topbar for each sidebar section.
    sectionTitles: {
        home: ["Model Home", "Manage multiple saved structural analysis models."],
        dashboard: ["Model Dashboard", "Define the structural analysis input model."],
        nodes: ["Nodes", "Define global node coordinates."],
        elements: ["Elements", "Define reusable element properties and node connectivity."],
        supports: ["Supports", "Define reusable support conditions."],
        loadCases: ["Load Cases", "Define reusable force load cases."],
        loads: ["Loads", "Define nodal and element force inputs."],
        momentCases: ["Moment Cases", "Define reusable moment cases."],
        moments: ["Moments", "Define nodal and element moment inputs."],
        results: ["Analysis Results", "Stiffness Method output."],
        about: ["About the Project", "Project creator, institution and faculty information."],
    },
};

// ==========================================================================
// 2. APPLICATION STATE
// ==========================================================================
const model = {
    nodes: [],
    elementTemplates: [],
    elements: [],
    supportTemplates: [],
    supportAssignments: [],
    loadCases: [],
    loads: [],
    momentCases: [],
    moments: [],
    dofSettings: { skipAxial: false, skipMoment: false },
    analysisMode: "plane",
};

// Named model library. Each saved model stores only the true input model,
// never solver-derived analysis state.
// Storage can be disabled by privacy settings, sandboxing, or browser policy.
// Keep the application usable in-memory if accessing localStorage throws.
function safeStorageGetItem(key) {
    try { return window.localStorage.getItem(key); }
    catch (error) { return null; }
}
function safeStorageSetItem(key, value) {
    try { window.localStorage.setItem(key, String(value)); return true; }
    catch (error) { console.warn(`[Storage] Could not save "${key}"; changes remain in memory only.`, error); return false; }
}
function safeStorageRemoveItem(key) {
    try { window.localStorage.removeItem(key); return true; }
    catch (error) { console.warn(`[Storage] Could not remove "${key}".`, error); return false; }
}

let currentModelLibraryId = safeStorageGetItem("structuralCurrentModelId") || "";
let lastModelLibraryWriteSucceeded = true;
let lastModelSaveStorageFailed = false;
let lastModelLibraryReadFailed = false;

function cloneBuiltInSupportTemplate(template) {
    return JSON.parse(JSON.stringify(template));
}

function ensureBuiltInSupportTemplates() {
    const customTemplates = (model.supportTemplates || []).filter((s) => !s.builtIn && !["FIXED", "ROLLER", "HINGED"].includes(s.id));
    model.supportTemplates = [
        ...AppConfig.builtInSupportTemplates.map(cloneBuiltInSupportTemplate),
        ...customTemplates.map((s) => ({ ...s, type: s.type || "custom", builtIn: false })),
    ];
}

// Active analysis case selections. These are UI state, not part of the persisted input model.
let activeLoadCaseId = "";
let activeMomentCaseId = "";

// Which diagram mode is currently shown in the fullscreen modal (see section 10).
let currentFSMode = "model";

// Analysis result lifecycle: not-run -> valid -> invalidated.
const analysisState = { status: "not-run" };

// Snapshot-style reference to the two central state objects, for anyone
// exploring this file for the first time. This is documentation, not a new
// state container: AppState.model and AppState.analysis are the exact same
// objects as `model` and `analysisState` above, and every function in this
// file continues to read/write `model` / `analysisState` directly.
const AppState = { model, analysis: analysisState };

function isGridAnalysisMode() {
    return model.analysisMode === "grid";
}

// Keep both diagram selectors aligned with the current solver mode. This can
// also be called immediately before opening the fullscreen picker, so its labels
// do not depend solely on the earlier model-load synchronization.
function syncDiagramModeLabels() {
    const diagramLabels = isGridAnalysisMode()
        ? { afd: "Torsion (Mx)", sfd: "Vertical Shear (Fz)", bmd: "Torsion (My)" }
        : { afd: "AFD", sfd: "SFD", bmd: "BMD" };
    ["resultsDiagramMode", "fsModeSelect"].forEach((selectId) => {
        const select = document.getElementById(selectId);
        if (!select) return;
        Object.entries(diagramLabels).forEach(([value, label]) => {
            const option = Array.from(select.options || []).find((item) => item.value === value);
            if (option) option.textContent = label;
        });
    });
}

function syncAnalysisModeUI() {
    const gridMode = isGridAnalysisMode();
    const typeBadge = document.getElementById("currentModelTypeBadge");
    if (typeBadge) {
        typeBadge.textContent = gridMode ? "Grid Model" : "Beam / Truss / Frame Model";
        typeBadge.title = gridMode
            ? "Grid model — type is fixed for this model"
            : "Beam / Truss / Frame model — type is fixed for this model";
        typeBadge.className = `badge ${gridMode ? "badge-green" : "badge-blue"} model-type-indicator`;
    }
    const gridFields = document.getElementById("gridElementProperties");
    if (gridFields) gridFields.style.display = gridMode ? "grid" : "none";
    // Per-element self-weight values are configured on a Self Weight load case.
    document.querySelectorAll(".grid-only-property").forEach((node) => {
        node.style.display = gridMode ? "table-cell" : "none";
    });
    document.querySelectorAll(".plane-only-property").forEach((node) => {
        const isTableCell = node.tagName === "TH" || node.tagName === "TD";
        node.style.display = gridMode ? "none" : (isTableCell ? "table-cell" : "");
    });
    const dofBox = document.getElementById("planeDofNumberingBox");
    if (dofBox) dofBox.style.display = isGridAnalysisMode() ? "none" : "block";
    document.querySelectorAll(".plane-support-movement").forEach((field) => {
        field.style.display = gridMode ? "none" : "";
    });
    document.querySelectorAll(".grid-support-movement").forEach((field) => {
        field.style.display = gridMode ? "" : "none";
    });
    const modeNote = document.getElementById("analysisModeNote");
    if (modeNote) {
        modeNote.textContent = isGridAnalysisMode()
            ? "Grid geometry lies in the XY plane; node Z coordinates are unused. Grid DOFs: θX, θY and ΔZ. Grid templates require positive E, G, I and J. Loads use Fz; torsion uses Mx (+ right/− left) and My (+ up/− down)."
            : "Plane analysis uses the selected Beam, Truss or Frame type. Thermal loads are defined per member; uniform temperature changes create axial thermal actions and temperature gradients create bending actions.";
    }
    syncDiagramModeLabels();

    const setLabel = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    const setSupportDescription = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    if (isGridAnalysisMode()) {
        setSupportDescription("supportFixedDescription", "θX + θY + ΔZ restrained");
        setSupportDescription("supportRollerDescription", "ΔZ restrained only<br><span style=\"color:#64748b;\">Grid rotations θX and θY free</span>");
        setSupportDescription("supportHingedDescription", "ΔZ restrained only<br><span style=\"color:#64748b;\">Grid rotations θX and θY free</span>");
        setLabel("supportRFxLabel", "θX restrained"); setLabel("supportRFyLabel", "θY restrained");
        setLabel("supportRFzLabel", "RFz (unused by Grid)"); setLabel("supportRMxLabel", "RMx (unused by Grid)");
        setLabel("supportRMyLabel", "RMy (unused by Grid)"); setLabel("supportRMzLabel", "ΔZ restrained");
        setLabel("supportDispXLabel", "Δx (unused by Grid)"); setLabel("supportDispYLabel", "Δy (unused by Grid)");
        setLabel("supportDispZLabel", "ΔZ prescribed"); setLabel("supportRotXLabel", "θX prescribed");
        setLabel("supportRotYLabel", "θY prescribed"); setLabel("supportRotZLabel", "θz (unused by Grid)");
    } else {
        setSupportDescription("supportFixedDescription", "RFx + RFy + RFz + RMx + RMy + RMz restrained");
        setSupportDescription("supportRollerDescription", "RFy restrained only<br><span style=\"color:#64748b;\">All other 2D restraints free</span>");
        setSupportDescription("supportHingedDescription", "RFx + RFy restrained<br><span style=\"color:#64748b;\">Rotation RZ remains free</span>");
        setLabel("supportRFxLabel", "RFx"); setLabel("supportRFyLabel", "RFy");
        setLabel("supportRFzLabel", "RFz (Ignore)"); setLabel("supportRMxLabel", "RMx (Ignore)");
        setLabel("supportRMyLabel", "RMy (Ignore)"); setLabel("supportRMzLabel", "RMz");
        setLabel("supportDispXLabel", "Δx"); setLabel("supportDispYLabel", "Δy");
        setLabel("supportDispZLabel", "Δz"); setLabel("supportRotXLabel", "θx");
        setLabel("supportRotYLabel", "θy"); setLabel("supportRotZLabel", "θz");
    }
    const loadType = document.getElementById("loadType")?.value || "Element Point Load";
    const isUDL = loadType === "Element UDL";
    if (isGridAnalysisMode()) {
        setLabel("lblLoadFx", isUDL ? "Start Fx (not used by Grid)" : "Fx (not used by Grid)");
        setLabel("lblLoadFy", isUDL ? "Start Fy (not used by Grid)" : "Fy (not used by Grid)");
        setLabel("lblLoadFz", isUDL ? "Start Fz" : "Fz");
        setLabel("lblLoadFxEnd", "End Fx (not used by Grid)");
        setLabel("lblLoadFyEnd", "End Fy (not used by Grid)");
        setLabel("lblLoadFzEnd", "End Fz");
        setLabel("lblMomentX", "Mx — Right / Left (+ right, − left)");
        setLabel("lblMomentY", "My — Up / Down (+ up, − down)");
        setLabel("lblMomentZ", "Mz (not used by Grid)");
    } else {
        setLabel("lblLoadFz", "Fz");
        setLabel("lblLoadFzEnd", "End Fz");
        setLabel("lblMomentX", "Mx");
        setLabel("lblMomentY", "My");
        setLabel("lblMomentZ", "Mz (Rotation)");
    }

    // User-facing Grid terminology is torsion; the stored model fields remain
    // compatible with existing moment-case and moment solver data.
    const gridNavLabels = [
        ["momentCases", gridMode ? "Torsion Cases" : "Moment Cases"],
        ["moments", gridMode ? "Torsions" : "Moments"],
    ];
    gridNavLabels.forEach(([section, label]) => {
        const button = document.querySelector(`.nav-btn[data-section="${section}"]`);
        if (button) {
            const icon = button.querySelector(".nav-icon");
            button.innerHTML = `${icon ? icon.outerHTML : ""}${label}`;
        }
    });
    const pageTitles = AppConfig.sectionTitles;
    pageTitles.momentCases = gridMode
        ? ["Torsion Cases", "Define reusable Grid torsion cases."]
        : ["Moment Cases", "Define reusable moment cases."];
    pageTitles.moments = gridMode
        ? ["Torsions", "Define nodal and element Grid torsions."]
        : ["Moments", "Define nodal and element moment inputs."];
    const activeSection = document.querySelector(".section.active")?.id;
    if (activeSection === "moments" || activeSection === "momentCases") {
        const title = document.getElementById("pageTitle");
        const subtitle = document.getElementById("pageSubtitle");
        const content = pageTitles[activeSection];
        if (content && title) title.textContent = content[0];
        if (content && subtitle) subtitle.textContent = content[1];
    }
    if (typeof syncLoadInputModeUI === "function") syncLoadInputModeUI();
    if (typeof syncMomentInputModeUI === "function") syncMomentInputModeUI();
    if (typeof syncMomentCaseInputModeUI === "function") syncMomentCaseInputModeUI();
    if (typeof syncElementTemplateTypeUI === "function") syncElementTemplateTypeUI();
}

function setAnalysisMode(value) {
    // A model's solver type is fixed when it is created. Loading/importing a
    // model restores its saved type through applyPersistedInputModel(); this
    // function intentionally cannot switch an existing model's solver.
    const requested = value === "grid" ? "grid" : "plane";
    if (requested !== (model.analysisMode === "grid" ? "grid" : "plane")) {
        console.warn("Model type cannot be changed after creation. Create a new model to use another solver.");
    }
    syncAnalysisModeUI();
    return requested === (model.analysisMode === "grid" ? "grid" : "plane");
}


// Page title/subtitle text shown in the topbar for each sidebar section.

// ==========================================================================
// 3. GENERIC HELPERS
// ==========================================================================
function getNextId(currentId) {
    const current = String(currentId ?? "");
    const match = current.match(/^(.*?)(\d+)$/);
    if (match) {
        const next = String(parseInt(match[2], 10) + 1).padStart(match[2].length, "0");
        return match[1] + next;
    }
    return current + "1";
}

function val(id) {
    return document.getElementById(id).value.trim();
}
function num(id) {
    const value = document.getElementById(id).value.trim();
    if (value === "") return "";
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : "";
}

// Mobile-friendly scientific notation helper. Tap "e" after entering the
// mantissa, then enter the exponent, e.g. 2e5, 7.5e-4, 1e-6.
function insertScientificExponent(id) {
    const input = document.getElementById(id);
    if (!input) return;
    input.focus();
    const start = typeof input.selectionStart === "number" ? input.selectionStart : input.value.length;
    const end = typeof input.selectionEnd === "number" ? input.selectionEnd : input.value.length;
    const before = input.value.slice(0, start);
    const after = input.value.slice(end);
    if (/[eE]/.test(input.value)) return;
    input.value = before + "e" + after;
    const pos = start + 1;
    if (typeof input.setSelectionRange === "function") input.setSelectionRange(pos, pos);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// Safe for values embedded inside single-quoted inline JavaScript arguments.
// encodeURIComponent alone leaves apostrophes unchanged, allowing quote breakout.
function encodeInlineArgument(value) {
    return encodeURIComponent(String(value ?? "")).replace(/'/g, "%27");
}

function formatNum(num) {
    if (Math.abs(num) < 1e-10) return "0.000";
    if (Math.abs(num) > 1e6 || (Math.abs(num) > 0 && Math.abs(num) < 1e-3))
        return Number(num).toExponential(3);
    return Number(num).toFixed(3);
}

// ==========================================================================
// UNIT SYSTEM
// Internal analysis units: kN, m, kN/m, kN·m, kN/m².
// Young's modulus E is entered/stored in kN/m². Grid shear modulus G remains entered in GPa.
// ==========================================================================
function getElementEInternal(tmpl) {
    if (!tmpl) return 0;
    const hasValue = (value) => value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value));
    // Canonical material unit: kN/m². Legacy fields remain readable during import/migration.
    if (hasValue(tmpl.E_kN_m2)) return Number(tmpl.E_kN_m2);
    if (hasValue(tmpl.E_GPa)) return Number(tmpl.E_GPa) * 1e6;
    // Legacy v14 stored E in N/m².
    if (hasValue(tmpl.E)) return Number(tmpl.E) / 1000;
    return 0;
}

function migrateUnitSystem() {
    model.elementTemplates = (model.elementTemplates || []).map((tmpl) => {
        const normalized = { ...tmpl };
        const hasValue = (value) => value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value));
        if (!hasValue(normalized.E_kN_m2)) {
            if (hasValue(normalized.E_GPa)) {
                // Legacy saved models stored E in GPa; 1 GPa = 10⁶ kN/m².
                normalized.E_kN_m2 = Number(normalized.E_GPa) * 1e6;
            } else if (hasValue(normalized.E)) {
                // Older models stored E in N/m².
                normalized.E_kN_m2 = Number(normalized.E) / 1000;
            }
        }
        delete normalized.E_GPa;
        delete normalized.E;
        return normalized;
    });
}



// ==========================================================================
// INPUT VALIDATION HELPERS
// Centralized validation keeps all model entities consistent before mutation.
// ==========================================================================
function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}

function requireFinite(value, label, options = {}) {
    if (!isFiniteNumber(value)) return `${label} must be a finite number.`;
    if (options.min !== undefined && value < options.min) return `${label} must be at least ${options.min}.`;
    if (options.minExclusive !== undefined && value <= options.minExclusive) return `${label} must be greater than ${options.minExclusive}.`;
    return null;
}

// Migrate template-level self-weight values from older model files into
// per-element values on Self Weight load cases. Current models store no weight
// on element templates: every element has its own kN/m value on the case.
function normalizeLegacySelfWeightModel(source) {
    if (!source || typeof source !== "object" || Array.isArray(source) || !Array.isArray(source.elementTemplates)) return source;

    const grid = source.analysisMode === "grid";
    const legacyByTemplate = new Map();
    const elementTemplates = source.elementTemplates.map((original, index) => {
        if (!original || typeof original !== "object" || Array.isArray(original)) return original;
        const template = { ...original };
        let legacyValue;
        let hasLegacyValue = false;

        if (Object.prototype.hasOwnProperty.call(template, "selfWeight")) {
            legacyValue = template.selfWeight;
            hasLegacyValue = true;
        } else if (Object.prototype.hasOwnProperty.call(template, "density") ||
                   Object.prototype.hasOwnProperty.call(template, "selfWeightType")) {
            const raw = template.density === undefined || template.density === null || template.density === ""
                ? 0 : Number(template.density);
            if (!Number.isFinite(raw) || raw < 0) {
                legacyValue = template.density;
                hasLegacyValue = true;
            } else {
                const oldType = template.selfWeightType || "density";
                if (oldType === "lineWeight") {
                    legacyValue = raw;
                } else if (oldType === "density") {
                    if (raw > 0) {
                        if (grid) {
                            throw new Error(`Element template '${template.id ?? index + 1}' has an older density-based weight that cannot be converted safely for Grid. Re-enter self-weight for each element in a Self Weight load case.`);
                        }
                        const area = Number(template.A);
                        if (area === 0 && Number(template.I) > 0) {
                            throw new Error(`Beam template '${template.id ?? index + 1}' has an older density-based weight but A = 0. Re-enter self-weight for each element in a Self Weight load case.`);
                        }
                        legacyValue = raw * area * 9.81 / 1000;
                    } else {
                        legacyValue = 0;
                    }
                } else {
                    throw new Error(`Element template '${template.id ?? index + 1}' has an unsupported old self-weight format.`);
                }
                hasLegacyValue = true;
            }
        }

        if (hasLegacyValue) {
            if (legacyValue === undefined || legacyValue === null || legacyValue === "" ||
                !Number.isFinite(Number(legacyValue)) || Number(legacyValue) < 0) {
                throw new Error(`Element template '${template.id ?? index + 1}' has an invalid legacy self-weight. Re-enter its weight on a Self Weight load case.`);
            }
            if (template.id !== undefined && template.id !== null) {
                legacyByTemplate.set(String(template.id), Number(legacyValue));
            }
        }
        delete template.selfWeight;
        delete template.density;
        delete template.selfWeightType;
        return template;
    });

    const elements = Array.isArray(source.elements) ? source.elements : [];
    const legacyByElement = Object.create(null);
    elements.forEach((element) => {
        const templateId = String(element?.templateId ?? "");
        if (legacyByTemplate.has(templateId)) legacyByElement[String(element.id)] = legacyByTemplate.get(templateId);
    });

    const normalized = { ...source, elementTemplates };
    const hasPositiveLegacyWeight = Object.values(legacyByElement).some((value) => Number(value) > 0);
    const loadCases = Array.isArray(source.loadCases) ? source.loadCases.map((item) => ({ ...item })) : [];
    const selfWeightCaseExists = loadCases.some((item) => item.type === "Self Weight");

    if (Object.keys(legacyByElement).length && selfWeightCaseExists) {
        normalized.loadCases = loadCases.map((item) => {
            if (item.type !== "Self Weight") return item;
            const existing = item.memberSelfWeights && typeof item.memberSelfWeights === "object" && !Array.isArray(item.memberSelfWeights)
                ? item.memberSelfWeights : {};
            return { ...item, memberSelfWeights: { ...legacyByElement, ...existing } };
        });
    } else if (hasPositiveLegacyWeight && !selfWeightCaseExists) {
        let id = "SW1", suffix = 2;
        while (loadCases.some((item) => String(item.id) === id)) id = `SW${suffix++}`;
        loadCases.push({
            id,
            type: "Self Weight",
            description: "Migrated member self-weight",
            memberSelfWeights: { ...legacyByElement },
        });
        normalized.loadCases = loadCases;
    } else if (Array.isArray(source.loadCases)) {
        normalized.loadCases = loadCases;
    } else if (source.loadCases === undefined && hasPositiveLegacyWeight) {
        normalized.loadCases = [{ id: "SW1", type: "Self Weight", description: "Migrated member self-weight", memberSelfWeights: { ...legacyByElement } }];
    }

    return normalized;
}
function hasId(items, id, editingId = null) {
    // "__proto__" is special on ordinary object maps used by the UI/solver.
    if (String(id) === "__proto__") return true;
    return Array.isArray(items) && items.some((item) => String(item.id) === String(id) && String(item.id) !== String(editingId));
}

function requireReference(items, id, label) {
    if (!id) return `${label} is required.`;
    if (!items.some((item) => String(item.id) === String(id))) return `${label} "${id}" does not exist.`;
    return null;
}

function getElementLength(elementId) {
    const el = model.elements.find((item) => item.id === elementId);
    if (!el) return null;
    const n1 = model.nodes.find((n) => n.id === el.startNode);
    const n2 = model.nodes.find((n) => n.id === el.endNode);
    if (!n1 || !n2) return null;
    return Math.hypot(Number(n2.x) - Number(n1.x), Number(n2.y) - Number(n1.y));
}

function getElementStructuralType(element) {
    const tmpl = element ? model.elementTemplates.find((t) => t.id === element.templateId) : null;
    if (!tmpl) return null;
    const explicitType = String(tmpl.memberType || "").toLowerCase();
    if (["beam", "truss", "frame"].includes(explicitType)) return explicitType;
    // Backward compatibility for existing models that classified members
    // implicitly from A and I before the explicit member-type field existed.
    const A = Number(tmpl.A);
    const I = Number(tmpl.I);
    if (!Number.isFinite(A) || !Number.isFinite(I)) return null;
    if (A === 0 && I > 0) return "beam";
    if (I === 0 && A > 0) return "truss";
    if (A > 0 && I > 0) return "frame";
    return null;
}

function detectDefaultGlobalDofNumberingConfig() {
    // The Neglect X / Neglect Moment M controls are manual. With both
    // controls unselected, no DOF is omitted just because an element has
    // A=0 or I=0.
    return { skipAxial: false, skipMoment: false };
}

function ensureGlobalDofNumberingConfig() {
    const existing = model.dofSettings;
    if (existing && typeof existing === "object" && typeof existing.skipAxial === "boolean" && typeof existing.skipMoment === "boolean") {
        return existing;
    }

    // Backward compatibility: models created before manual switches existed
    // retain their previous automatic behaviour the first time they are opened.
    model.dofSettings = detectDefaultGlobalDofNumberingConfig();
    return model.dofSettings;
}

function getGlobalDofNumberingConfig() {
    const config = ensureGlobalDofNumberingConfig();
    return {
        skipAxial: !!config.skipAxial,
        skipMoment: !!config.skipMoment,
    };
}

function setGlobalDofNumberingOption(option, checked) {
    if (option !== "skipAxial" && option !== "skipMoment") return;

    const config = ensureGlobalDofNumberingConfig();
    config[option] = !!checked;
    model.dofSettings = config;

    // Changing a numbering option changes the global matrix numbering, so any
    // previous analysis result must be discarded before another run.
    markAnalysisInvalidated();
    updateGlobalDofNumberingUI();
}

function getNodeStructuralDofRelevance(nodeId) {
    const connected = model.elements.filter((el) => el.startNode === nodeId || el.endNode === nodeId);
    if (isGridAnalysisMode()) {
        const active = connected.length > 0;
        return { ux: active, uy: active, rz: active };
    }
    let axial = false;
    let bending = false;
    const skipAxialForBeam = getGlobalDofNumberingConfig().skipAxial;
    connected.forEach((el) => {
        const tmpl = model.elementTemplates.find((t) => t.id === el.templateId);
        if (!tmpl) return;
        const memberType = getElementStructuralType(el);
        // New Beam templates have an area but their axial DOFs can be excluded
        // by Ignore X. Truss and Frame axial stiffness retain their prior behavior.
        axial = axial || (Number(tmpl.A) > 0 && !(memberType === "beam" && skipAxialForBeam));
        bending = bending || Number(tmpl.I) > 0;
    });
    return { ux: axial, uy: connected.length > 0, rz: bending };
}

function parseLengthInputStrict(rawValue, elementId, label = "Distance") {
    const str = rawValue === undefined || rawValue === null ? "" : String(rawValue).trim();
    if (str === "") return { ok: false, message: `${label} is required.` };
    const L = getElementLength(elementId);
    if (!isFiniteNumber(L) || L <= 0) return { ok: false, message: "The selected element must have a valid positive length before a distance can be assigned." };

    const formulaMatch = str.match(/^(\d*\.?\d*)\s*\*?\s*[lL]\s*(?:\/\s*(\d+\.?\d*))?$/);
    if (formulaMatch) {
        const multiplier = formulaMatch[1] === "" ? 1 : Number(formulaMatch[1]);
        const divisor = formulaMatch[2] ? Number(formulaMatch[2]) : 1;
        if (!Number.isFinite(multiplier) || !Number.isFinite(divisor) || divisor <= 0) return { ok: false, message: `${label} contains an invalid L expression.` };
        return { ok: true, value: (multiplier * L) / divisor, length: L };
    }

    const value = Number(str);
    if (!Number.isFinite(value)) return { ok: false, message: `${label} must be a finite number or a valid L expression such as L/2.` };
    return { ok: true, value, length: L };
}

function validateNodeInput(id, x, y, z, editingId = null) {
    if (!id) return "Node ID is required.";
    if (hasId(model.nodes, id, editingId)) return "Node ID already exists.";
    for (const [value, label] of [[x, "X Coordinate"], [y, "Y Coordinate"], [z, "Z Coordinate"]]) {
        const error = requireFinite(value, label);
        if (error) return error;
    }
    const coincidentNode = model.nodes.find((node) =>
        String(node.id) !== String(editingId) && Number(node.x) === Number(x) && Number(node.y) === Number(y));
    if (coincidentNode) {
        return `Node '${coincidentNode.id}' already occupies (${x}, ${y}). Each node must have unique X/Y coordinates.`;
    }
    return null;
}

// ==========================================================================
// 4. MATRIX ALGEBRA UTILITIES
// Pure matrix helpers shared by the stiffness method solver below.
// ==========================================================================
function isNumericallyZeroStiffnessDof(matrix, index, tolerance = Number.EPSILON * 100) {
    const row = Array.isArray(matrix?.[index]) ? matrix[index] : [];
    const rowScale = row.reduce((maximum, value) => Math.max(maximum, Math.abs(Number(value) || 0)), 0);
    if (rowScale === 0) return true;
    return Math.abs(Number(row[index]) || 0) <= rowScale * tolerance;
}

const Matrix = {
    zeros: (r, c) => Array.from({ length: r }, () => new Array(c).fill(0)),
    add: (A, B) => A.map((row, i) => row.map((val, j) => val + B[i][j])),
    sub: (A, B) => A.map((row, i) => row.map((val, j) => val - B[i][j])),
    mul: (A, B) =>
        A.map((row) => B[0].map((_, j) => row.reduce((sum, val, k) => sum + val * B[k][j], 0))),
    transpose: (A) => A[0].map((_, c) => A.map((r) => r[c])),
    invert: (M) => {
        let n = M.length;
        let I = Matrix.zeros(n, n);
        for (let i = 0; i < n; i++) I[i][i] = 1;
        let C = M.map((r, i) => [...r, ...I[i]]);
        // Keep each row's original scale aligned with its row during pivoting.
        const rowScales = M.map((row) => row.reduce((maximum, value) => Math.max(maximum, Math.abs(value)), 0));
        for (let i = 0; i < n; i++) {
            // Scaled partial pivoting avoids treating every small-valued
            // stiffness matrix as singular merely because its units/scale
            // produce pivots below a fixed absolute threshold.
            let maxRow = i;
            let bestRatio = -1;
            for (let k = i; k < n; k++) {
                const ratio = rowScales[k] === 0 ? 0 : Math.abs(C[k][i]) / rowScales[k];
                if (ratio > bestRatio) {
                    bestRatio = ratio;
                    maxRow = k;
                }
            }
            if (bestRatio < 1e-12) return null; // Singular or numerically dependent row
            let tmp = C[maxRow];
            C[maxRow] = C[i];
            C[i] = tmp;
            const scaleTmp = rowScales[maxRow];
            rowScales[maxRow] = rowScales[i];
            rowScales[i] = scaleTmp;
            let pivot = C[i][i];
            for (let j = 0; j < 2 * n; j++) C[i][j] /= pivot;
            for (let k = 0; k < n; k++) {
                if (k !== i) {
                    let factor = C[k][i];
                    for (let j = 0; j < 2 * n; j++) C[k][j] -= factor * C[i][j];
                }
            }
        }
        return C.map((r) => r.slice(n));
    },
};

// ==========================================================================
// 5. MATRIX / EQUATION HTML RENDERING HELPERS
// Render [Matrix] and [A] = [B] x [C] style equations as bracketed HTML tables.
// ==========================================================================
function matrixToHTML(M, title = "", topLabels = null, rightLabels = null) {
    if (!M || M.length === 0) return "";

    /*
     * Matrix reduction is handled here at the presentation boundary only.
     *
     * The stiffness/load calculations continue to use their existing
     * formulations. When a local element DOF was removed by the global
     * numbering configuration, its label is represented by "—". Those
     * placeholder positions must not be rendered as real matrix rows/columns.
     *
     * Example:
     *   [—, 1, 2, —, 3, 4]  ->  [1, 2, 3, 4]
     *   6×6 matrix            ->  4×4 matrix
     *
     * This keeps the existing calculation untouched while ensuring every
     * displayed matrix is dense and consistently re-indexed.
     */
    const isRemovedDofLabel = (label) =>
        label === "—" || label === "−" || label === "-" || label === null || label === undefined;

    const isVector = !Array.isArray(M[0]);
    const originalRows = isVector ? M.map((val) => [val]) : M;
    const originalRowCount = originalRows.length;
    const originalColCount = isVector ? 1 : originalRows[0].length;

    const topHasRemoved = Array.isArray(topLabels) &&
        topLabels.length === originalColCount &&
        topLabels.some(isRemovedDofLabel);

    const rightHasRemoved = Array.isArray(rightLabels) &&
        rightLabels.length === originalRowCount &&
        rightLabels.some(isRemovedDofLabel);

    let rowIndices = Array.from({ length: originalRowCount }, (_, i) => i);
    let colIndices = Array.from({ length: originalColCount }, (_, i) => i);

    if (rightHasRemoved) {
        rowIndices = rowIndices.filter((i) => !isRemovedDofLabel(rightLabels[i]));
    }

    if (topHasRemoved && !isVector) {
        colIndices = colIndices.filter((i) => !isRemovedDofLabel(topLabels[i]));
    }

    const rows = rowIndices.map((r) =>
        colIndices.map((c) => originalRows[r][c])
    );

    const displayTopLabels = topHasRemoved
        ? colIndices.map((_, i) => i + 1)
        : topLabels;
    const displayRightLabels = rightHasRemoved
        ? rowIndices.map((_, i) => i + 1)
        : rightLabels;

    let html = `<div class="matrix-wrapper">`;

    if (title) {
        html += `<div class="matrix-title">${escapeHtml(title)}</div>`;
    } else {
        html += `<div></div>`;
    }

    const colsCount = isVector ? 1 : rows[0]?.length || 0;

    if (displayTopLabels && !isVector) {
        html += `<div style="display: flex; width: 100%; padding: 0 8px;">`;
        for (let c = 0; c < colsCount; c++) {
            let lbl = displayTopLabels[c] !== undefined ? displayTopLabels[c] : "";
            html += `<div style="flex: 1; text-align: center; font-size: 11px; font-weight: bold; color: #dc2626;">${escapeHtml(lbl)}</div>`;
        }
        html += `</div>`;
    } else {
        html += `<div></div>`;
    }

    html += `<div style="display: flex; align-items: stretch; gap: 2px;">`;

    // Left Bracket
    html += `<div style="width: 6px; border-left: 2px solid #1e293b; border-top: 2px solid #1e293b; border-bottom: 2px solid #1e293b;"></div>`;

    // Values Table
    html += `<table class="matrix-table">`;

    rows.forEach((row) => {
        html += `<tr>`;
        row.forEach((val) => {
            html += `<td>${typeof val === "number" ? formatNum(val) : escapeHtml(val)}</td>`;
        });
        html += `</tr>`;
    });

    html += `</table>`;

    // Right Bracket
    html += `<div style="width: 6px; border-right: 2px solid #1e293b; border-top: 2px solid #1e293b; border-bottom: 2px solid #1e293b;"></div>`;

    // Right Labels
    if (displayRightLabels) {
        html += `<div style="display: flex; flex-direction: column; justify-content: space-around; margin-left: 6px; padding: 6px 0;">`;
        rows.forEach((_, i) => {
            let lbl = displayRightLabels[i] !== undefined ? displayRightLabels[i] : "";
            html += `<div style="font-size: 11px; font-weight: bold; color: #dc2626; line-height: 1;">${escapeHtml(lbl)}</div>`;
        });
        html += `</div>`;
    }

    html += `</div>`; // Close stretch flex
    html += `</div>`; // Close matrix-wrapper
    return html;
}

function matrixEqHTML(matrices, operators) {
    // Blank operators separate independent matrices into different rows.
    // Non-blank operators connect matrices into the same calculation row.
    let html = `<div class="eq-wrap">`;
    let row = ``;

    for (let i = 0; i < matrices.length; i++) {
        row += matrixToHTML(matrices[i].m, matrices[i].t, matrices[i].top, matrices[i].right);

        const op = i < operators.length ? String(operators[i]) : "";
        if (op.trim() !== "") {
            row += `<div style="display: inline-flex; align-items: center; justify-content: center;">
                        <div class="math-operator" style="margin: 0 10px;">${op}</div>
                    </div>`;
        } else {
            html += `<div class="eq-row">${row}</div>`;
            row = ``;
        }
    }

    if (row) {
        html += `<div class="eq-row">${row}</div>`;
    }

    html += `</div>`;
    return html;
}

function showEmpty(tbodyId, colspan, title = "No records yet") {
    document.getElementById(tbodyId).innerHTML =
        `<tr><td colspan="${colspan}"><div class="empty"><div class="empty-icon">○</div><h4>${title}</h4><div>Create an item using the form above.</div></div></td></tr>`;
}

// Per-assignment prescribed movements use the same six-component schema as the
// legacy support-template fields, but values now belong to a single node:
// plane: dx, dy, tz; Grid: tx, ty, dz.
const SUPPORT_MOVEMENT_FIELDS = ["dx", "dy", "dz", "tx", "ty", "tz"];
const ZERO_SUPPORT_MOVEMENTS = Object.freeze({ dx: 0, dy: 0, dz: 0, tx: 0, ty: 0, tz: 0 });

function supportTemplateRestrainsMovement(template, field, gridMode = isGridAnalysisMode()) {
    if (!template) return false;
    // The Grid solver defines its own effective built-in supports independently
    // of the plane-model checkbox fields stored in the common UI templates.
    if (gridMode && ["FIXED", "ROLLER", "HINGED"].includes(String(template.id))) {
        const gridBuiltIns = {
            FIXED: { tx: true, ty: true, dz: true },
            ROLLER: { tx: false, ty: false, dz: true },
            HINGED: { tx: false, ty: false, dz: true },
        };
        if (Object.prototype.hasOwnProperty.call(gridBuiltIns, template.id)) {
            return !!gridBuiltIns[template.id][field];
        }
    }
    const restraintKey = gridMode
        ? ({ tx: "RFx", ty: "RFy", dz: "RMz" })[field]
        : ({ dx: "RFx", dy: "RFy", tz: "RMz" })[field];
    // Components unused by the selected analysis mode are not boundary inputs.
    if (!restraintKey) return true;
    return !!template.restraints?.[restraintKey];
}

function getSupportAssignmentPrescribedDisplacements(assignment, template) {
    const input = assignment?.prescribedDisplacements;
    const hasAssignmentValues = input && typeof input === "object" && !Array.isArray(input) &&
        SUPPORT_MOVEMENT_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(input, field));
    const source = hasAssignmentValues ? input : (template?.displacement || ZERO_SUPPORT_MOVEMENTS);
    const result = {};
    SUPPORT_MOVEMENT_FIELDS.forEach((field) => {
        const raw = source?.[field];
        if (raw === undefined || raw === null || raw === "") {
            result[field] = 0;
            return;
        }
        const value = Number(raw);
        result[field] = Number.isFinite(value) ? value : raw;
    });
    return result;
}

// Migrate old projects that stored settlement/rotation on a reusable support
// template. The old value is copied to each assignment using that template, and
// the template field is zeroed only after validation succeeds.
function normalizeLegacySupportMovementAssignments(source, { clearTemplateValues = false } = {}) {
    if (!source || typeof source !== "object" || Array.isArray(source)) return source;
    const templates = Array.isArray(source.supportTemplates) ? source.supportTemplates : [];
    const assignments = Array.isArray(source.supportAssignments) ? source.supportAssignments : [];
    const templateById = new Map(templates.map((template) => [String(template.id), template]));
    const gridMode = source.analysisMode === "grid";
    const normalizedAssignments = assignments.map((assignment) => {
        const template = templateById.get(String(assignment.supportId)) ||
            AppConfig.builtInSupportTemplates.find((item) => String(item.id) === String(assignment.supportId));
        const raw = assignment.prescribedDisplacements;
        const hasAssignmentValues = raw && typeof raw === "object" && !Array.isArray(raw) &&
            SUPPORT_MOVEMENT_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(raw, field));
        const legacyValues = template?.displacement || ZERO_SUPPORT_MOVEMENTS;
        const movements = {};
        SUPPORT_MOVEMENT_FIELDS.forEach((field) => {
            const valueSource = hasAssignmentValues ? raw : legacyValues;
            const value = valueSource?.[field];
            if (value === undefined || value === null || value === "") {
                movements[field] = 0;
                return;
            }
            const number = Number(value);
            movements[field] = Number.isFinite(number) ? number : value;
        });

        // Old solver behavior ignored prescribed movements on unrestrained DOFs.
        // Preserve that behavior while migrating legacy template-owned values.
        if (!hasAssignmentValues) {
            SUPPORT_MOVEMENT_FIELDS.forEach((field) => {
                if (!supportTemplateRestrainsMovement(template, field, gridMode)) movements[field] = 0;
            });
        }
        return { ...assignment, prescribedDisplacements: movements };
    });

    const normalized = { ...source, supportAssignments: normalizedAssignments };
    if (clearTemplateValues && Array.isArray(source.supportTemplates)) {
        normalized.supportTemplates = templates.map((template) => ({
            ...template,
            displacement: { ...ZERO_SUPPORT_MOVEMENTS },
        }));
    }
    return normalized;
}

// ==========================================================================
// 6. PERSISTENCE
// Save/load the input model to localStorage, export/import as JSON, clear all data.
// Only input data is persisted. Solver-derived analysis state is never saved.
// ==========================================================================
function getPersistedInputModel() {
    const persisted = {};

    // Persist only true user-input fields. Analysis mutates element and
    // support-assignment objects with calculated matrices, loads and reactions;
    // copying those objects directly would make exported/saved files enormous.
    const INPUT_FIELD_KEYS = {
        nodes: ["id", "x", "y", "z"],
        elementTemplates: ["id", "memberType", "I", "E_kN_m2", "G_GPa", "J", "A", "alpha", "thermalDepth"],
        elements: ["id", "templateId", "startNode", "endNode"],
        supportTemplates: ["id", "description", "type", "builtIn", "restraints", "displacement"],
        supportAssignments: ["id", "supportId", "nodeId", "prescribedDisplacements"],
        loadCases: ["id", "type", "description", "memberSelfWeights"],
        loads: ["id", "loadCaseId", "type", "nodeId", "elementId", "axisSystem", "angle", "distance", "distanceEnd", "Fx", "Fy", "Fz", "FxEnd", "FyEnd", "FzEnd", "temperatureDelta", "temperatureT1", "temperatureT2"],
        momentCases: ["id", "type", "description"],
        moments: ["id", "momentCaseId", "type", "nodeId", "elementId", "distance", "Mx", "My", "Mz"],
    };

    AppConfig.persistedModelKeys.forEach((key) => {
        const items = Array.isArray(model[key]) ? model[key] : [];
        const fields = INPUT_FIELD_KEYS[key];
        persisted[key] = fields
            ? items.map((item) => {
                  const clean = {};
                  fields.forEach((field) => {
                      if (Object.prototype.hasOwnProperty.call(item || {}, field)) clean[field] = item[field];
                  });
                  return clean;
              })
            : [];
    });

    // Persist the manual global DoF switches with the model so each saved
    // model keeps its own numbering configuration.
    persisted.dofSettings = { ...getGlobalDofNumberingConfig() };
    persisted.analysisMode = model.analysisMode === "grid" ? "grid" : "plane";

    return persisted;
}

function validatePersistedInputModel(source) {
    if (!source || typeof source !== "object" || Array.isArray(source)) {
        throw new Error("The file must contain a model JSON object.");
    }
    if (source.analysisMode !== undefined && !["plane", "grid"].includes(source.analysisMode)) {
        throw new Error("Model analysisMode must be either 'plane' or 'grid'.");
    }
    source = normalizeLegacySelfWeightModel(normalizeLegacySupportMovementAssignments(source));

    const requiredCollections = ["nodes", "elementTemplates", "elements"];
    requiredCollections.forEach((key) => {
        if (!Array.isArray(source[key])) {
            throw new Error(`The model is missing the required '${key}' array.`);
        }
    });

    const collections = {};
    AppConfig.persistedModelKeys.forEach((key) => {
        const list = source[key];
        if (list !== undefined && !Array.isArray(list)) {
            throw new Error(`Model field '${key}' must be an array.`);
        }
        collections[key] = list === undefined ? [] : list;
        collections[key].forEach((item, index) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) {
                throw new Error(`'${key}[${index}]' must be an object.`);
            }
        });
    });

    const idSets = {};
    Object.entries(collections).forEach(([key, list]) => {
        const seen = new Set();
        list.forEach((item, index) => {
            const rawId = item.id;
            if (typeof rawId !== "string" || rawId.trim() === "") {
                throw new Error(`'${key}[${index}]' must have a non-empty string ID.`);
            }
            if (rawId === "__proto__") {
                throw new Error(`'${key}[${index}]' uses the reserved ID "__proto__". Choose a different ID.`);
            }
            if (rawId !== rawId.trim()) {
                throw new Error(`'${key}[${index}]' ID must not contain leading or trailing whitespace.`);
            }
            const id = rawId;
            if (seen.has(id)) throw new Error(`Duplicate ID '${id}' in '${key}'.`);
            seen.add(id);
        });
        idSets[key] = new Set(list.map((item) => String(item.id)));
    });

    const requireReference = (value, targetSet, description) => {
        if (typeof value !== "string" || value === "" || !targetSet.has(value)) {
            throw new Error(`Invalid or missing ${description}: '${value ?? ""}'. References must match an existing string ID exactly.`);
        }
    };
    const requireFiniteField = (record, field, description, { min = -Infinity, exclusiveMin = -Infinity, optional = false } = {}) => {
        const value = record[field];
        if (optional && (value === undefined || value === null || value === "")) return;
        if (value === undefined || value === null || value === "" || !Number.isFinite(Number(value))) {
            throw new Error(`${description} must be a finite number.`);
        }
        const number = Number(value);
        if (number < min || number <= exclusiveMin) {
            const limit = Number.isFinite(exclusiveMin) ? `greater than ${exclusiveMin}` : `at least ${min}`;
            throw new Error(`${description} must be ${limit}.`);
        }
    };

    const nodeIds = idSets.nodes;
    const templateIds = idSets.elementTemplates;
    const elementIds = idSets.elements;
    const loadCaseIds = idSets.loadCases;
    const momentCaseIds = idSets.momentCases;
    const supportIds = new Set([...idSets.supportTemplates, "FIXED", "ROLLER", "HINGED"]);

    collections.loadCases.forEach((loadCase) => {
        if (!["Dead", "Live", "Self Weight"].includes(loadCase.type)) {
            throw new Error(`Load case '${loadCase.id}' has unsupported type '${loadCase.type}'.`);
        }
        const memberWeights = loadCase.memberSelfWeights;
        if (memberWeights === undefined) return;
        if (!memberWeights || typeof memberWeights !== "object" || Array.isArray(memberWeights)) {
            throw new Error(`Load case '${loadCase.id}' memberSelfWeights must be an object keyed by element ID.`);
        }
        Object.entries(memberWeights).forEach(([elementId, weight]) => {
            if (!elementIds.has(String(elementId))) {
                throw new Error(`Load case '${loadCase.id}' self-weight references unknown element '${elementId}'.`);
            }
            requireFiniteField({ weight }, "weight", `Load case '${loadCase.id}' self-weight for element '${elementId}' (kN/m)`, { min: 0 });
        });
    });

    const occupiedNodeCoordinates = new Map();
    collections.nodes.forEach((node) => {
        requireFiniteField(node, "x", `Node '${node.id}' X coordinate`);
        requireFiniteField(node, "y", `Node '${node.id}' Y coordinate`);
        requireFiniteField(node, "z", `Node '${node.id}' Z coordinate`, { optional: true });
        const coordinateKey = JSON.stringify([Number(node.x), Number(node.y)]);
        const existingNodeId = occupiedNodeCoordinates.get(coordinateKey);
        if (existingNodeId !== undefined) {
            throw new Error(`Nodes '${existingNodeId}' and '${node.id}' share the same X/Y coordinates. Every node must have unique coordinates in the analysis plane.`);
        }
        occupiedNodeCoordinates.set(coordinateKey, node.id);
    });

    collections.elementTemplates.forEach((template) => {
        const grid = source.analysisMode === "grid";
        const materialE = template.E_kN_m2 !== undefined && template.E_kN_m2 !== null && template.E_kN_m2 !== ""
            ? template.E_kN_m2
            : (template.E_GPa !== undefined && template.E_GPa !== null && template.E_GPa !== ""
                ? template.E_GPa : template.E);
        requireFiniteField({ E: materialE }, "E", `Element template '${template.id}' E`, { exclusiveMin: 0 });
        requireFiniteField(template, "I", `Element template '${template.id}' I`, { min: 0 });
        if (grid) {
            const legacyG = template.G_GPa === undefined || template.G_GPa === null || template.G_GPa === ""
                ? template.G : template.G_GPa;
            requireFiniteField({ G: legacyG }, "G", `Grid element template '${template.id}' G`, { exclusiveMin: 0 });
            requireFiniteField(template, "J", `Grid element template '${template.id}' J`, { exclusiveMin: 0 });
            requireFiniteField(template, "I", `Grid element template '${template.id}' I`, { exclusiveMin: 0 });
        } else {
            requireFiniteField(template, "A", `Element template '${template.id}' A`, { min: 0 });
            if (Number(template.A) === 0 && Number(template.I) === 0) {
                throw new Error(`Element template '${template.id}' cannot have both A and I equal to zero.`);
            }
            const memberType = template.memberType === undefined || template.memberType === null || template.memberType === ""
                ? null : String(template.memberType).toLowerCase();
            if (memberType !== null) {
                if (!["beam", "truss", "frame"].includes(memberType)) {
                    throw new Error(`Element template '${template.id}' has unsupported member type '${template.memberType}'.`);
                }
                requireFiniteField(template, "A", `Element template '${template.id}' A`, { exclusiveMin: 0 });
                if (memberType === "truss") {
                    if (Number(template.I) !== 0) {
                        throw new Error(`Truss template '${template.id}' must have I = 0.`);
                    }
                } else {
                    requireFiniteField(template, "I", `Element template '${template.id}' I`, { exclusiveMin: 0 });
                }
            }
            requireFiniteField(template, "alpha", `Element template '${template.id}' thermal expansion coefficient alpha`, { min: 0, optional: true });
            requireFiniteField(template, "thermalDepth", `Element template '${template.id}' thermal section depth`, { min: 0, optional: true });
        }
    });

    collections.supportTemplates.forEach((support) => {
        const canonicalSupport = AppConfig.builtInSupportTemplates.find((item) => item.id === support.id);
        if (canonicalSupport && support.builtIn === false) {
            throw new Error(`Support ID '${support.id}' is reserved for a built-in support. Rename the custom support before importing.`);
        }
        if (!canonicalSupport && support.builtIn === true) {
            throw new Error(`Custom support '${support.id}' cannot be marked as built-in.`);
        }
        const restraints = support.restraints;
        if (!restraints || typeof restraints !== "object" || Array.isArray(restraints)) {
            throw new Error(`Support template '${support.id}' is missing its restraints object.`);
        }
        ["RFx", "RFy", "RFz", "RMx", "RMy", "RMz"].forEach((field) => {
            if (typeof restraints[field] !== "boolean") {
                throw new Error(`Support template '${support.id}' restraint '${field}' must be true or false.`);
            }
        });
        const displacement = support.displacement;
        if (!displacement || typeof displacement !== "object" || Array.isArray(displacement)) {
            throw new Error(`Support template '${support.id}' is missing its prescribed-displacement object.`);
        }
        ["dx", "dy", "dz", "tx", "ty", "tz"].forEach((field) => {
            requireFiniteField(displacement, field, `Support template '${support.id}' displacement '${field}'`);
        });
        if (canonicalSupport) {
            const restraintMismatch = ["RFx", "RFy", "RFz", "RMx", "RMy", "RMz"]
                .some((field) => restraints[field] !== canonicalSupport.restraints[field]);
            const displacementMismatch = ["dx", "dy", "dz", "tx", "ty", "tz"]
                .some((field) => Number(displacement[field]) !== Number(canonicalSupport.displacement[field]));
            if (restraintMismatch || displacementMismatch) {
                throw new Error(`Built-in support '${support.id}' does not match the application's standard definition. Restore its built-in restraints and prescribed displacements before importing.`);
            }
        }
    });

    collections.elements.forEach((element) => {
        requireReference(element.templateId, templateIds, `element template reference on element '${element.id}'`);
        requireReference(element.startNode, nodeIds, `start-node reference on element '${element.id}'`);
        requireReference(element.endNode, nodeIds, `end-node reference on element '${element.id}'`);
        if (String(element.startNode) === String(element.endNode)) {
            throw new Error(`Element '${element.id}' cannot start and end at the same node.`);
        }
        const start = collections.nodes.find((node) => String(node.id) === String(element.startNode));
        const end = collections.nodes.find((node) => String(node.id) === String(element.endNode));
        const length = Math.hypot(Number(end.x) - Number(start.x), Number(end.y) - Number(start.y));
        if (!(length > 0) || !Number.isFinite(length)) {
            throw new Error(`Element '${element.id}' must have non-zero length in the XY plane.`);
        }
    });

    const gridModel = source.analysisMode === "grid";
    const assignedSupportNodes = new Set();
    collections.supportAssignments.forEach((assignment) => {
        requireReference(assignment.nodeId, nodeIds, `node reference on support assignment '${assignment.id}'`);
        requireReference(assignment.supportId, supportIds, `support-template reference on support assignment '${assignment.id}'`);
        const nodeKey = String(assignment.nodeId);
        if (assignedSupportNodes.has(nodeKey)) {
            throw new Error(`Node '${nodeKey}' has multiple support assignments. Combine the required restraints into one support template before importing.`);
        }
        assignedSupportNodes.add(nodeKey);

        if (assignment.prescribedDisplacements !== undefined) {
            const movements = assignment.prescribedDisplacements;
            if (!movements || typeof movements !== "object" || Array.isArray(movements)) {
                throw new Error(`Support assignment '${assignment.id}' prescribedDisplacements must be an object.`);
            }
            SUPPORT_MOVEMENT_FIELDS.forEach((field) => {
                requireFiniteField(movements, field, `Support assignment '${assignment.id}' movement '${field}'`, { optional: true });
            });
            const supportTemplate = collections.supportTemplates.find((item) => String(item.id) === String(assignment.supportId)) ||
                AppConfig.builtInSupportTemplates.find((item) => String(item.id) === String(assignment.supportId));
            const activeMovementFields = gridModel ? ["tx", "ty", "dz"] : ["dx", "dy", "tz"];
            activeMovementFields.forEach((field) => {
                const value = movements[field] === undefined || movements[field] === null || movements[field] === "" ? 0 : Number(movements[field]);
                if (Number.isFinite(value) && value !== 0 && !supportTemplateRestrainsMovement(supportTemplate, field, gridModel)) {
                    throw new Error(`Support assignment '${assignment.id}' prescribes ${field}=${value} at node '${nodeKey}', but support '${assignment.supportId}' does not restrain that degree of freedom.`);
                }
            });
        }
    });
    const getElementLength = (elementId, description) => {
        const element = collections.elements.find((candidate) => String(candidate.id) === String(elementId));
        if (!element) throw new Error(`${description} references unknown element '${elementId}'.`);
        const start = collections.nodes.find((node) => String(node.id) === String(element.startNode));
        const end = collections.nodes.find((node) => String(node.id) === String(element.endNode));
        const length = Math.hypot(Number(end?.x) - Number(start?.x), Number(end?.y) - Number(start?.y));
        if (!(length > 0) || !Number.isFinite(length)) throw new Error(`${description} requires an element with positive length.`);
        return length;
    };

    collections.loads.forEach((load) => {
        const axisSystem = load.axisSystem;
        if (axisSystem !== undefined && axisSystem !== null && axisSystem !== "" &&
            !["Global", "Local", "Angled"].includes(axisSystem)) {
            throw new Error(`Load '${load.id}' has unsupported axis system '${axisSystem}'.`);
        }
        if (load.type === "Nodal Load" && axisSystem === "Local") {
            throw new Error(`Nodal load '${load.id}' cannot use the Local axis system.`);
        }
        requireReference(load.loadCaseId, loadCaseIds, `load-case reference on load '${load.id}'`);
        const temperatureLoad = ["Uniform Temperature Change", "Temperature Gradient"].includes(load.type);
        // "Element Load" is a legacy alias still handled by both solver paths.
        if (!["Nodal Load", "Element Point Load", "Element Load", "Element UDL", "Uniform Temperature Change", "Temperature Gradient"].includes(load.type)) {
            throw new Error(`Load '${load.id}' has unsupported type '${load.type}'.`);
        }
        if (temperatureLoad) {
            if (gridModel) throw new Error(`Temperature load '${load.id}' is only supported for Beam / Truss / Frame models.`);
            requireReference(load.elementId, elementIds, `element reference on temperature load '${load.id}'`);
            const targetElement = collections.elements.find((item) => item.id === load.elementId);
            const targetTemplate = collections.elementTemplates.find((item) => item.id === targetElement.templateId);
            requireFiniteField(targetTemplate, "alpha", `Temperature load '${load.id}' element template alpha`, { exclusiveMin: 0 });
            if (load.type === "Uniform Temperature Change") {
                requireFiniteField(load, "temperatureDelta", `Temperature load '${load.id}' temperature change ΔT`);
                requireFiniteField(targetTemplate, "A", `Temperature load '${load.id}' element area A`, { exclusiveMin: 0 });
            } else {
                requireFiniteField(load, "temperatureT1", `Temperature gradient load '${load.id}' T1`);
                requireFiniteField(load, "temperatureT2", `Temperature gradient load '${load.id}' T2`);
                requireFiniteField(targetTemplate, "I", `Temperature gradient load '${load.id}' element inertia I`, { exclusiveMin: 0 });
                requireFiniteField(targetTemplate, "thermalDepth", `Temperature gradient load '${load.id}' section depth d`, { exclusiveMin: 0 });
            }
            return;
        }
        if (load.type === "Nodal Load") {
            requireReference(load.nodeId, nodeIds, `node reference on load '${load.id}'`);
        } else {
            requireReference(load.elementId, elementIds, `element reference on load '${load.id}'`);
        }

        const startForceFields = gridModel ? ["Fz"] : ["Fx", "Fy"];
        startForceFields.forEach((field) => requireFiniteField(load, field, `Load '${load.id}' ${field}`));
        if (load.type === "Element Point Load" || load.type === "Element Load" || load.type === "Element UDL") {
            const length = getElementLength(load.elementId, `Load '${load.id}'`);
            requireFiniteField(load, "distance", `Load '${load.id}' distance`, { min: 0 });
            if (Number(load.distance) > length) {
                throw new Error(`Load '${load.id}' distance must not exceed element length ${length}.`);
            }
            if (load.type === "Element UDL") {
                const rawEndDistance = load.distanceEnd;
                const endDistance = rawEndDistance === undefined || rawEndDistance === null || rawEndDistance === ""
                    ? length : Number(rawEndDistance);
                requireFiniteField({ endDistance }, "endDistance", `Load '${load.id}' end distance`, { min: 0 });
                if (!(Number(load.distance) < endDistance) || endDistance > length) {
                    throw new Error(`Load '${load.id}' UDL interval must satisfy 0 ≤ start distance < end distance ≤ element length ${length}.`);
                }
                // Missing end intensities default to their start intensity, as in the UI/solver.
                const endForceFields = gridModel ? ["FzEnd"] : ["FxEnd", "FyEnd"];
                endForceFields.forEach((field) => requireFiniteField(load, field, `Load '${load.id}' ${field}`, { optional: true }));
            }
        }
        ["Fx", "Fy", "Fz", "FxEnd", "FyEnd", "FzEnd", "angle"].forEach((field) => {
            requireFiniteField(load, field, `Load '${load.id}' ${field}`, { optional: true });
        });
    });
    collections.momentCases.forEach((momentCase) => {
        if (!["Dead", "Live", "Self Weight"].includes(momentCase.type)) {
            throw new Error(`Moment/torsion case '${momentCase.id}' has unsupported type '${momentCase.type}'.`);
        }
    });

    collections.moments.forEach((moment) => {
        requireReference(moment.momentCaseId, momentCaseIds, `moment-case reference on moment '${moment.id}'`);
        if (!["Nodal Moment", "Element Moment"].includes(moment.type)) {
            throw new Error(`Moment '${moment.id}' has unsupported type '${moment.type}'.`);
        }
        if (moment.type === "Nodal Moment") {
            requireReference(moment.nodeId, nodeIds, `node reference on moment '${moment.id}'`);
        } else {
            requireReference(moment.elementId, elementIds, `element reference on moment '${moment.id}'`);
            const length = getElementLength(moment.elementId, `Moment '${moment.id}'`);
            requireFiniteField(moment, "distance", `Moment '${moment.id}' distance`, { min: 0 });
            if (Number(moment.distance) > length) {
                throw new Error(`Moment '${moment.id}' distance must not exceed element length ${length}.`);
            }
        }
        (gridModel ? ["Mx", "My"] : ["Mz"]).forEach((field) => {
            requireFiniteField(moment, field, `Moment '${moment.id}' ${field}`);
        });
    });

    return true;
}

function resetAllEditForms() {
    // Edit IDs belong to the model currently loaded in the workspace.
    const resetters = [
        () => typeof resetNodeForm === "function" && resetNodeForm(),
        () => typeof resetElementTemplateForm === "function" && resetElementTemplateForm(),
        () => typeof resetElementAssignmentForm === "function" && resetElementAssignmentForm(),
        () => typeof resetSupportForm === "function" && resetSupportForm(),
        () => typeof resetSupportAssignmentForm === "function" && resetSupportAssignmentForm(),
        () => typeof resetLoadCaseForm === "function" && resetLoadCaseForm(),
        () => typeof resetLoadForm === "function" && resetLoadForm(),
        () => typeof resetMomentCaseForm === "function" && resetMomentCaseForm(),
        () => typeof resetMomentForm === "function" && resetMomentForm(),
    ];
    resetters.forEach((reset) => {
        try { reset(); }
        catch (error) { console.warn("[Model switch] Could not reset an edit form.", error); }
    });
}

function applyPersistedInputModel(source) {
    // Migrate legacy template-owned settlements to assignments, validate the
    // complete input, and only then clear the old template movement values.
    const assignmentNormalized = normalizeLegacySupportMovementAssignments(normalizeLegacySelfWeightModel(source));
    validatePersistedInputModel(assignmentNormalized);
    const normalizedSource = normalizeLegacySupportMovementAssignments(assignmentNormalized, { clearTemplateValues: true });
    resetAllEditForms();
    AppConfig.persistedModelKeys.forEach((key) => {
        model[key] = Array.isArray(normalizedSource?.[key]) ? normalizedSource[key] : [];
    });
    model.analysisMode = normalizedSource?.analysisMode === "grid" ? "grid" : "plane";
    syncAnalysisModeUI();

    if (normalizedSource?.dofSettings && typeof normalizedSource.dofSettings === "object" &&
        typeof normalizedSource.dofSettings.skipAxial === "boolean" &&
        typeof normalizedSource.dofSettings.skipMoment === "boolean") {
        model.dofSettings = {
            skipAxial: normalizedSource.dofSettings.skipAxial,
            skipMoment: normalizedSource.dofSettings.skipMoment,
        };
    } else {
        delete model.dofSettings;
        ensureGlobalDofNumberingConfig();
    }

    // Never carry solver-derived state across a save/load/import boundary.
    delete model.nodeDisplacements;
    model.elements.forEach((el) => {
        if (!el) return;
        delete el.plotData;
        delete el.L;
        delete el.cx;
        delete el.cy;
        delete el.SM;
        delete el.RT;
        delete el.RTT;
        delete el.SMS;
        delete el.AML;
        delete el.localwx;
        delete el.localwy;
        delete el.localPointLoads;
        delete el.localUDLs;
        delete el.localPointMoments;
    });
    model.supportAssignments.forEach((sa) => {
        if (!sa) return;
        delete sa.rx;
        delete sa.ry;
        delete sa.rz;
    });
}

function getMissingSelfWeightElement(loadCase, elements = model.elements) {
    if (!loadCase || loadCase.type !== "Self Weight") return null;
    const weights = loadCase.memberSelfWeights && typeof loadCase.memberSelfWeights === "object"
        ? loadCase.memberSelfWeights : {};
    return elements.find((element) => {
        const id = String(element.id);
        if (!Object.prototype.hasOwnProperty.call(weights, id)) return true;
        const weight = weights[id];
        return weight === undefined || weight === null || weight === "" ||
            !Number.isFinite(Number(weight)) || Number(weight) < 0;
    }) || null;
}

function getModelName() {
    const input = document.getElementById("modelName");
    return (input?.value || "Structural Model").trim() || "Structural Model";
}

function saveModelNamePreference() {
    safeStorageSetItem("structuralModelName", getModelName());
}

function sanitizeFileName(name) {
    return String(name || "Structural Model")
        .trim()
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
        .replace(/[. ]+$/g, "")
        .replace(/\s+/g, " ") || "Structural Model";
}

function hasModelInputData(data = getPersistedInputModel()) {
    return AppConfig.persistedModelKeys.some((key) => {
        let items = Array.isArray(data?.[key]) ? data[key] : [];
        // Built-in support templates are always available in the UI; they do
        // not mean the user has created a model that needs saving.
        if (key === "supportTemplates") {
            items = items.filter((item) => item && !item.builtIn && !["FIXED", "ROLLER", "HINGED"].includes(String(item.id)));
        }
        return items.length > 0;
    });
}

function createModelLibraryId() {
    return `model-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeModelLibraryRecords(source) {
    const normalized = Object.create(null);
    const seenNames = new Set();
    let changed = false;

    Object.entries(source || {}).forEach(([storageId, record]) => {
        if (!record || typeof record !== "object" || Array.isArray(record)) {
            changed = true;
            return;
        }

        const id = String(storageId);
        const baseName = String(record.name ?? "").trim() || "Structural Model";
        let name = baseName;
        let suffix = 2;
        // Names are compared case-insensitively after trimming only the ends.
        // Internal spaces remain significant ("My Model" != "MyModel").
        while (seenNames.has(modelNameKey(name))) {
            name = `${baseName} (${suffix++})`;
        }
        seenNames.add(modelNameKey(name));

        if (record.name !== name || String(record.id || storageId) !== id) changed = true;
        normalized[id] = { ...record, id, name };
    });

    if (Object.keys(normalized).length !== Object.keys(source || {}).length) changed = true;
    return { library: normalized, changed };
}

function getModelLibrary() {
    lastModelLibraryReadFailed = false;
    let raw = null;
    try {
        raw = safeStorageGetItem("structuralModels");
        const saved = JSON.parse(raw || "{}");
        if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
            lastModelLibraryReadFailed = raw !== null && raw !== "";
            return Object.create(null);
        }
        // Preserve rather than silently discard malformed records from otherwise valid JSON.
        if (Object.values(saved).some((record) => !record || typeof record !== "object" || Array.isArray(record))) {
            lastModelLibraryReadFailed = true;
            return Object.create(null);
        }

        const result = normalizeModelLibraryRecords(saved);
        let libraryChanged = result.changed;
        // Migrate older saved models to per-element weights on Self Weight cases
        // when reading. Records whose old value cannot be converted safely are kept
        // intact so the user can see the error when opening/exporting them.
        Object.values(result.library).forEach((record) => {
            if (!record || !record.data || typeof record.data !== "object") return;
            try {
                const normalizedData = normalizeLegacySelfWeightModel(record.data);
                if (JSON.stringify(normalizedData) !== JSON.stringify(record.data)) {
                    record.data = normalizedData;
                    libraryChanged = true;
                }
            } catch (error) {
                // Preserve the legacy record; opening/exporting it will surface
                // the explicit conversion error instead of dropping its load.
            }
        });
        if (libraryChanged) {
            safeStorageSetItem("structuralModels", JSON.stringify(result.library));

            // If an existing duplicate had the current model ID, keep its
            // displayed name synchronized with the automatically repaired name.
            const currentId = safeStorageGetItem("structuralCurrentModelId") || "";
            const oldName = saved[currentId]?.name;
            const repairedName = result.library[currentId]?.name;
            if (repairedName && String(oldName ?? "") !== repairedName) {
                safeStorageSetItem("structuralModelName", repairedName);
                const nameInput = document.getElementById("modelName");
                if (nameInput) nameInput.value = repairedName;
            }
        }
        return result.library;
    } catch (error) {
        lastModelLibraryReadFailed = true;
        return Object.create(null);
    }
}


function getModelLibraryReadFailureMessage() {
    return "The saved-model library could not be read from browser storage. The stored value has been left untouched to avoid overwriting potentially recoverable data. Export the current workspace as JSON before continuing.";
}
function setModelLibrary(library) {
    const result = normalizeModelLibraryRecords(library);
    lastModelLibraryWriteSucceeded = safeStorageSetItem("structuralModels", JSON.stringify(result.library));
    if (!lastModelLibraryWriteSucceeded) return result.library;

    const activeId = String(currentModelLibraryId || safeStorageGetItem("structuralCurrentModelId") || "");
    const activeName = result.library[activeId]?.name;
    const requestedName = library?.[activeId]?.name;
    if (activeName && requestedName !== activeName) {
        safeStorageSetItem("structuralModelName", activeName);
        const nameInput = document.getElementById("modelName");
        if (nameInput) nameInput.value = activeName;
    }
    return result.library;
}

function formatModelSavedTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString();
}

// ---- Duplicate-model protection -------------------------------------------
// A model counts as a duplicate of a saved one when it has the same name, or
// when its input data is identical to a saved model's data.
function modelNameKey(name) {
    // Ignore all whitespace and letter case when comparing names.
    // Displayed names retain their original internal spacing; whitespace is
    // removed only for duplicate detection (e.g. "Bridge Model" = "bridgemodel").
    return String(name ?? "").replace(/\s+/g, "").toLowerCase();
}

function getAvailableModelName(requestedName, library = getModelLibrary(), ignoreId = "") {
    const baseName = String(requestedName ?? "").trim() || "Structural Model";
    const used = new Set(Object.entries(library).filter(([id]) => String(id) !== String(ignoreId))
        .map(([, item]) => modelNameKey(item?.name)));
    if (!used.has(modelNameKey(baseName))) return baseName;

    let suffix = 2;
    let candidate = `${baseName} (${suffix})`;
    while (used.has(modelNameKey(candidate))) candidate = `${baseName} (${++suffix})`;
    return candidate;
}

function canonicalJSON(value) {
    if (Array.isArray(value)) return "[" + value.map(canonicalJSON).join(",") + "]";
    if (value && typeof value === "object") {
        return "{" + Object.keys(value).sort().map((k) => JSON.stringify(k) + ":" + canonicalJSON(value[k])).join(",") + "}";
    }
    return JSON.stringify(value === undefined ? null : value);
}

function modelDataFingerprint(data) {
    const norm = {};
    AppConfig.persistedModelKeys.forEach((key) => {
        let items = Array.isArray(data?.[key]) ? data[key] : [];
        if (key === "supportTemplates") {
            items = items.filter((t) => t && !t.builtIn && !["FIXED", "ROLLER", "HINGED"].includes(t.id));
        }
        norm[key] = items;
    });
    const hasInput = Object.values(norm).some((items) => items.length > 0);
    if (!hasInput) return "";
    const d = data?.dofSettings;
    norm.dofSettings = { skipAxial: !!(d && d.skipAxial), skipMoment: !!(d && d.skipMoment) };
    norm.analysisMode = data?.analysisMode === "grid" ? "grid" : "plane";
    return canonicalJSON(norm);
}

// Returns { type: "content" | "name", item } for the first saved model (other
// than ignoreId) that duplicates the given name/data, or null.
function findDuplicateModel(name, data, ignoreId, library = getModelLibrary()) {
    const key = modelNameKey(name);
    const fp = modelDataFingerprint(data);
    const others = Object.values(library).filter((m) => m && m.id !== ignoreId);
    if (fp) {
        const same = others.find((m) => modelDataFingerprint(m.data) === fp);
        if (same) return { type: "content", item: same };
    }
    const sameName = others.find((m) => modelNameKey(m.name) === key);
    if (sameName) return { type: "name", item: sameName };
    return null;
}

function duplicateModelMessage(dup) {
    return dup.type === "content"
        ? `Duplicate model: this model is identical to the saved model "${dup.item.name}". It was not saved again.`
        : `Duplicate model: a saved model named "${dup.item.name}" already exists. Rename this model before saving.`;
}

function saveCurrentModelToLibrary(silent = false) {
    lastModelSaveStorageFailed = false;
    const library = getModelLibrary();
    if (lastModelLibraryReadFailed) {
        lastModelSaveStorageFailed = true;
        alert(getModelLibraryReadFailureMessage());
        return false;
    }
    const data = getPersistedInputModel();
    let modelName = getModelName();

    const dup = findDuplicateModel(modelName, data, currentModelLibraryId, library);
    if (dup) {
        if (!silent) {
            alert(duplicateModelMessage(dup));
            return false;
        }
        // If this is a never-saved workspace, an identical saved model already
        // preserves its content. An existing current record, however, must still
        // be updated so autosave does not silently leave that record stale.
        if (dup.type === "content" && !currentModelLibraryId) return false;
        modelName = getAvailableModelName(modelName, library, currentModelLibraryId);
        // Silent autosaves may need a unique library name, but must not
        // rewrite the user's visible name field without an explicit action.
    }

    const previousCurrentId = currentModelLibraryId;
    const storageKeys = ["structuralModels", "structuralCurrentModelId", "structuralInputModel", "structuralModelName"];
    const previousStorage = Object.fromEntries(storageKeys.map((key) => [key, safeStorageGetItem(key)]));
    if (!currentModelLibraryId) currentModelLibraryId = createModelLibraryId();

    library[currentModelLibraryId] = {
        id: currentModelLibraryId,
        name: modelName,
        data,
        updatedAt: new Date().toISOString(),
    };

    // The named library is now the source of truth. Remove the legacy full-model
    // snapshot before writing so it cannot consume quota alongside the library.
    safeStorageRemoveItem("structuralInputModel");
    setModelLibrary(library);
    const persisted = lastModelLibraryWriteSucceeded &&
        safeStorageSetItem("structuralCurrentModelId", currentModelLibraryId) &&
        safeStorageSetItem("structuralModelName", modelName);

    if (!persisted) {
        lastModelSaveStorageFailed = true;
        storageKeys.forEach((key) => {
            const previous = previousStorage[key];
            if (previous === null) safeStorageRemoveItem(key);
            else safeStorageSetItem(key, previous);
        });
        currentModelLibraryId = previousCurrentId;
        if (typeof renderModelLibrary === "function") renderModelLibrary();
        alert("Model was NOT confirmed saved: browser storage rejected one or more writes (for example, storage may be full or blocked). Your current workspace remains open. Export the model as JSON before leaving this page.");
        return false;
    }

    renderModelLibrary();
    if (!silent) alert(`Model "${modelName}" saved in browser storage.`);
    return true;
}

function saveModel() {
    // Save preferences only after the library accepts the name; a rejected
    // duplicate must not become the next startup's preferred model name.
    saveCurrentModelToLibrary(false);
}

function loadModel() {
    const savedName = safeStorageGetItem("structuralModelName");
    const nameInput = document.getElementById("modelName");
    if (nameInput && savedName) nameInput.value = savedName;

    // Preferred: restore the currently selected model from the named library.
    const library = getModelLibrary();
    if (lastModelLibraryReadFailed) {
        if (typeof renderModelLibrary === "function") renderModelLibrary();
        return;
    }
    const storedCurrentId = safeStorageGetItem("structuralCurrentModelId") || "";
    if (storedCurrentId && library[storedCurrentId]?.data) {
        try {
            validatePersistedInputModel(library[storedCurrentId].data);
            applyPersistedInputModel(library[storedCurrentId].data);
            currentModelLibraryId = storedCurrentId;
            if (nameInput) nameInput.value = library[storedCurrentId].name || nameInput.value || "Structural Model";
            ensureBuiltInSupportTemplates();
            markAnalysisInvalidated();
            renderModelLibrary();
        } catch (error) {
            // A stale/corrupt library record must not abort application startup.
            console.error("Unable to restore the current saved model:", error);
            currentModelLibraryId = "";
            safeStorageRemoveItem("structuralCurrentModelId");
            renderModelLibrary();
            alert(`The previously active saved model could not be loaded: ${error && error.message ? error.message : "invalid model data"}. It remains in your saved-model library for recovery.`);
        }
        return;
    }

    // Backward compatibility: migrate the previous single-model storage into
    // the new named library the first time the updated file is opened.
    const saved = safeStorageGetItem("structuralInputModel");
    if (!saved) {
        renderModelLibrary();
        return;
    }
    try {
        const parsed = JSON.parse(saved);
        applyPersistedInputModel(parsed);
        ensureBuiltInSupportTemplates();
        markAnalysisInvalidated();

        if (!currentModelLibraryId) {
            currentModelLibraryId = createModelLibraryId();
            library[currentModelLibraryId] = {
                id: currentModelLibraryId,
                name: getModelName(),
                data: parsed,
                updatedAt: new Date().toISOString(),
            };
            setModelLibrary(library);
            safeStorageSetItem("structuralCurrentModelId", currentModelLibraryId);
        }
        renderModelLibrary();
    } catch (error) {
        console.error(error);
        renderModelLibrary();
    }
}

function resetAnalysisForModelChange() {
    activeLoadCaseId = "";
    activeMomentCaseId = "";
    analysisState.status = "not-run";
    const resultsContent = document.getElementById("resultsContent");
    if (resultsContent) resultsContent.style.display = "none";
    updateAnalysisStatusUI();
}

function openSavedModel(modelId) {
    const library = getModelLibrary();
    if (lastModelLibraryReadFailed) {
        alert(getModelLibraryReadFailureMessage());
        return;
    }
    const savedModel = library[modelId];
    if (!savedModel?.data) return;

    // Validate the target before changing the current model or saving over its
    // working state. Corrupt library entries must fail without side effects.
    try {
        validatePersistedInputModel(savedModel.data);
    } catch (error) {
        alert(`This saved model cannot be opened: ${error && error.message ? error.message : "invalid model data"}. Your current workspace has not been changed.`);
        return;
    }

    // The saved snapshot above is stale once the current workspace is saved.
    // If Open is clicked on the already-active model, save and stay on that live copy.
    if (modelId === currentModelLibraryId) {
        if (hasModelInputData()) saveCurrentModelToLibrary(true);
        renderModelLibrary();
        const dashboardBtn = document.querySelector('.nav-btn[data-section="dashboard"]');
        switchSection("dashboard", dashboardBtn);
        return;
    }

    // Protect the current work from accidental loss by saving it first when it
    // contains input data. This does not alter the active solver state.
    if (hasModelInputData()) {
        saveCurrentModelToLibrary(true);
        if (lastModelSaveStorageFailed) return;
    }

    currentModelLibraryId = modelId;
    safeStorageSetItem("structuralCurrentModelId", modelId);
    safeStorageSetItem("structuralModelName", savedModel.name || "Structural Model");

    const nameInput = document.getElementById("modelName");
    if (nameInput) nameInput.value = savedModel.name || "Structural Model";

    applyPersistedInputModel(savedModel.data);
    migrateUnitSystem();
    ensureBuiltInSupportTemplates();
    resetAnalysisForModelChange();
    syncAnalysisModeUI();
    refreshAll();
    renderModelLibrary();

    const dashboardBtn = document.querySelector('.nav-btn[data-section="dashboard"]');
    switchSection("dashboard", dashboardBtn);
}

function newModel() {
    const library = getModelLibrary();
    if (lastModelLibraryReadFailed) {
        alert(getModelLibraryReadFailureMessage());
        return;
    }
    const existingNames = new Set(Object.values(library).map((m) => modelNameKey(m && m.name)));
    if (hasModelInputData()) existingNames.add(modelNameKey(getModelName()));
    let defaultNumber = Object.keys(library).length + 1;
    while (existingNames.has(modelNameKey(`Model ${defaultNumber}`))) defaultNumber++;

    const modal = document.getElementById("newModelModal");
    const nameInput = document.getElementById("newModelNameInput");
    const validation = document.getElementById("newModelValidationMessage");
    if (!modal || !nameInput) {
        // Defensive fallback for an unexpected shell/rendering failure.
        const proposedName = prompt("Enter the new model name:", `Model ${defaultNumber}`);
        if (proposedName === null) return;
        const normalizedName = String(proposedName).trim() || `Model ${defaultNumber}`;
        const names = new Set(Object.values(getModelLibrary()).map((m) => modelNameKey(m && m.name)));
        if (hasModelInputData()) names.add(modelNameKey(getModelName()));
        if (names.has(modelNameKey(normalizedName))) {
            alert(`A model named "${normalizedName}" already exists or is about to be saved. Choose a different name.`);
            return;
        }
        createNewModelRecord(normalizedName, "plane");
        return;
    }

    nameInput.value = `Model ${defaultNumber}`;
    modal.dataset.defaultName = `Model ${defaultNumber}`;
    const btfOption = modal.querySelector('input[name="newModelAnalysisMode"][value="plane"]');
    if (btfOption) btfOption.checked = true;
    if (validation) { validation.textContent = ""; validation.hidden = true; }
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => nameInput.focus());
}

function closeNewModelDialog() {
    const modal = document.getElementById("newModelModal");
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
}

function createNewModelFromDialog(event) {
    if (event) event.preventDefault();
    const modal = document.getElementById("newModelModal");
    const nameInput = document.getElementById("newModelNameInput");
    const validation = document.getElementById("newModelValidationMessage");
    if (!modal || !nameInput) return;

    const defaultName = modal.dataset.defaultName || "New Model";
    const modelName = nameInput.value.trim() || defaultName;
    const library = getModelLibrary();
    if (lastModelLibraryReadFailed) {
        if (validation) {
            validation.textContent = getModelLibraryReadFailureMessage();
            validation.hidden = false;
        } else {
            alert(getModelLibraryReadFailureMessage());
        }
        return;
    }
    const existingNames = new Set(Object.values(library).map((m) => modelNameKey(m && m.name)));
    if (hasModelInputData()) existingNames.add(modelNameKey(getModelName()));
    if (existingNames.has(modelNameKey(modelName))) {
        if (validation) {
            validation.textContent = `A saved model named "${modelName}" already exists. Choose a different name.`;
            validation.hidden = false;
        } else {
            alert(`Duplicate model: a saved model named "${modelName}" already exists. Choose a different name.`);
        }
        nameInput.focus();
        return;
    }

    const selectedMode = modal.querySelector('input[name="newModelAnalysisMode"]:checked')?.value === "grid" ? "grid" : "plane";
    closeNewModelDialog();
    createNewModelRecord(modelName, selectedMode);
}

function createNewModelRecord(modelName, analysisMode) {
    if (hasModelInputData()) {
        saveCurrentModelToLibrary(true);
        if (lastModelSaveStorageFailed) return;
    }
    resetAllEditForms();
    // Re-check after autosaving the previous model to guard every creation
    // path, including the prompt fallback and future callers.
    const library = getModelLibrary();
    if (lastModelLibraryReadFailed) {
        alert(getModelLibraryReadFailureMessage());
        return;
    }
    modelName = getAvailableModelName(modelName, library);

    AppConfig.persistedModelKeys.forEach((key) => {
        model[key] = [];
    });
    model.dofSettings = { skipAxial: false, skipMoment: false };
    // The solver type is chosen once at model creation and is never changed by
    // the in-workspace UI. Saved/imported models restore their own saved type.
    model.analysisMode = analysisMode === "grid" ? "grid" : "plane";
    syncAnalysisModeUI();
    ensureBuiltInSupportTemplates();
    currentModelLibraryId = "";
    safeStorageRemoveItem("structuralCurrentModelId");
    // This legacy snapshot may belong to the model that was open before this new workspace.
    safeStorageRemoveItem("structuralInputModel");
    safeStorageSetItem("structuralModelName", modelName);

    const nameInput = document.getElementById("modelName");
    if (nameInput) nameInput.value = modelName;

    resetAnalysisForModelChange();
    refreshAll();
    renderModelLibrary();
    const dashboardBtn = document.querySelector('.nav-btn[data-section="dashboard"]');
    switchSection("dashboard", dashboardBtn);
}
function deleteSavedModel(modelId) {
    const library = getModelLibrary();
    if (lastModelLibraryReadFailed) {
        alert(getModelLibraryReadFailureMessage());
        return;
    }
    const savedModel = library[modelId];
    if (!savedModel) return;

    if (!confirm(`Delete saved model "${savedModel.name}"? This cannot be undone.`)) return;

    const deletedCurrentModel = currentModelLibraryId === modelId;
    delete library[modelId];
    setModelLibrary(library);
    if (!lastModelLibraryWriteSucceeded) {
        alert("The model was not deleted because browser storage rejected the library update. No deletion is confirmed.");
        return;
    }

    if (deletedCurrentModel || Object.keys(library).length === 0) {
        // Deleting the active model (or the last remaining saved model) also
        // clears its live and persisted working copy to avoid a ghost model.
        resetActiveModelAfterSavedModelDeletion();
    }
    renderModelLibrary();
}

function downloadJSONFile(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 4)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

function exportModel() {
    saveModelNamePreference();
    const data = getPersistedInputModel();
    downloadJSONFile(`${sanitizeFileName(getModelName())}.json`, data);
}

function exportSavedModel(modelId) {
    const library = getModelLibrary();
    if (lastModelLibraryReadFailed) {
        alert(getModelLibraryReadFailureMessage());
        return;
    }
    const savedModel = library[modelId];
    if (!savedModel?.data) return;
    try {
        const data = normalizeLegacySelfWeightModel(savedModel.data);
        validatePersistedInputModel(data);
        downloadJSONFile(`${sanitizeFileName(savedModel.name)}.json`, data);
    } catch (error) {
        alert(error.message || "This saved model's self-weight data cannot be exported safely. Open and review the model first.");
    }
}

function exportAllModels() {
    const library = getModelLibrary();
    if (lastModelLibraryReadFailed) {
        alert(getModelLibraryReadFailureMessage());
        return;
    }
    let models = Object.values(library).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    try {
        models = models.map((item) => ({ ...item, data: normalizeLegacySelfWeightModel(item.data) }));
        models.forEach((item) => validatePersistedInputModel(item.data));
    } catch (error) {
        alert(error.message || "At least one saved model has self-weight data that cannot be converted safely. Open and correct that model before exporting all models.");
        return;
    }

    // Always export the current in-memory version of the open model. This means
    // recent edits are included even when the model was saved earlier.
    if (hasModelInputData()) {
        const currentData = getPersistedInputModel();
        const currentName = getModelName();
        const currentIndex = currentModelLibraryId
            ? models.findIndex((item) => item.id === currentModelLibraryId)
            : -1;

        const currentSnapshot = {
            id: currentModelLibraryId || "current-unsaved",
            name: currentName,
            data: currentData,
            updatedAt: new Date().toISOString(),
        };

        if (currentIndex >= 0) {
            models[currentIndex] = currentSnapshot;
        } else {
            models.push(currentSnapshot);
        }
    }

    if (models.length === 0) {
        alert("No saved models available to export.");
        return;
    }

    const bundle = {
        type: "StructuralAnalysisModelCollection",
        version: 1,
        exportedAt: new Date().toISOString(),
        models: models.map((item) => ({
            id: item.id,
            name: item.name,
            updatedAt: item.updatedAt || null,
            data: item.data,
        })),
    };

    const defaultExportFileName =
        safeStorageGetItem("structuralExportAllFileName") || "Structural_Analysis_All_Models";
    const enteredExportFileName = prompt(
        "Enter export file name:",
        defaultExportFileName,
    );
    if (enteredExportFileName === null) return;

    const safeExportFileName = sanitizeFileName(enteredExportFileName) || defaultExportFileName;
    safeStorageSetItem("structuralExportAllFileName", safeExportFileName);
    downloadJSONFile(`${safeExportFileName}.json`, bundle);
}

function importModel(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const imported = JSON.parse(e.target.result);

            // Collection import: merge all named models into the local library.
            if (imported?.type === "StructuralAnalysisModelCollection" && Array.isArray(imported.models)) {
                const library = getModelLibrary();
                if (lastModelLibraryReadFailed) {
                    alert(getModelLibraryReadFailureMessage());
                    return;
                }
                let importedCount = 0;
                let duplicateCount = 0;

                imported.models.forEach((item, index) => {
                    if (!item || typeof item !== "object" || !item.data || typeof item.data !== "object") {
                        throw new Error(`Model collection entry ${index + 1} is missing a valid model payload.`);
                    }
                    item.data = normalizeLegacySupportMovementAssignments(normalizeLegacySelfWeightModel(item.data));
                    validatePersistedInputModel(item.data);
                    item.data = normalizeLegacySupportMovementAssignments(item.data, { clearTemplateValues: true });
                    let importName = String(item.name || `Imported Model ${importedCount + 1}`);
                    const fpImport = modelDataFingerprint(item.data);
                    if (fpImport && Object.values(library).some((m) => modelDataFingerprint(m.data) === fpImport)) {
                        duplicateCount++;
                        return;
                    }
                    if (Object.values(library).some((m) => modelNameKey(m.name) === modelNameKey(importName))) {
                        let n = 2;
                        while (Object.values(library).some((m) => modelNameKey(m.name) === modelNameKey(`${importName} (${n})`))) n++;
                        importName = `${importName} (${n})`;
                    }
                    let id = String(item.id || createModelLibraryId());
                    if (library[id]) id = createModelLibraryId();
                    library[id] = {
                        id,
                        name: importName,
                        data: item.data,
                        updatedAt: item.updatedAt || new Date().toISOString(),
                    };
                    importedCount++;
                });

                setModelLibrary(library);
                if (!lastModelLibraryWriteSucceeded) {
                    alert("The models were not imported because browser storage rejected the library update. No import is confirmed.");
                    return;
                }
                renderModelLibrary();
                alert(`${importedCount} model(s) imported into the model library.` +
                    (duplicateCount ? ` ${duplicateCount} duplicate model(s) already saved on this device were skipped.` : ""));
            } else {
                // Validate before prompting or saving the current workspace. An
                // invalid import should have no persistent side effects.
                validatePersistedInputModel(imported);
                // Single-model JSON: load it as the current unsaved model.
                if (hasModelInputData()) {
                    const saveBeforeReplace = confirm(
                        "Importing this file will replace the current workspace model. Choose OK to save the current model first, or Cancel to replace it without saving.",
                    );
                    if (saveBeforeReplace) {
                        saveCurrentModelToLibrary(true);
                        if (lastModelSaveStorageFailed) return;
                    }
                }
                applyPersistedInputModel(imported);
                migrateUnitSystem();
                ensureBuiltInSupportTemplates();
                currentModelLibraryId = "";
                safeStorageRemoveItem("structuralCurrentModelId");
                // Avoid restoring the pre-import workspace as if it were the imported model after refresh.
                safeStorageRemoveItem("structuralInputModel");

                const importedBaseName = file.name.replace(/\.json$/i, "").trim();
                const libraryForName = getModelLibrary();
                const importedName = importedBaseName
                    ? (lastModelLibraryReadFailed ? importedBaseName : getAvailableModelName(importedBaseName, libraryForName))
                    : "";
                if (lastModelLibraryReadFailed) alert(getModelLibraryReadFailureMessage());
                const nameInput = document.getElementById("modelName");
                if (nameInput && importedName) {
                    nameInput.value = importedName;
                    saveModelNamePreference();
                }

                resetAnalysisForModelChange();
                refreshAll();
                renderModelLibrary();
                alert("Structural input model imported as the current unsaved model.");
            }
        } catch (error) {
            alert(`Invalid model file: ${error && error.message ? error.message : "Invalid JSON."}`);
        } finally {
            event.target.value = "";
        }
    };
    reader.readAsText(file);
}

function resetActiveModelAfterSavedModelDeletion() {
    resetAllEditForms();
    AppConfig.persistedModelKeys.forEach((key) => { model[key] = []; });
    model.dofSettings = { skipAxial: false, skipMoment: false };
    model.analysisMode = "plane";
    currentModelLibraryId = "";
    ["structuralCurrentModelId", "structuralInputModel", "structuralModelName"].forEach((key) => safeStorageRemoveItem(key));

    const nameInput = document.getElementById("modelName");
    if (nameInput) nameInput.value = "Structural Model";
    ensureBuiltInSupportTemplates();
    resetAnalysisForModelChange();
    syncAnalysisModeUI();
    const resultsContent = document.getElementById("resultsContent");
    if (resultsContent) resultsContent.style.display = "none";
    refreshAll();
}

function clearModel() {
    if (!confirm("Delete the entire current input model? Saved models in the Home library will not be deleted.")) return;

    resetAllEditForms();
    AppConfig.persistedModelKeys.forEach((key) => {
        model[key] = [];
    });
    model.dofSettings = { skipAxial: false, skipMoment: false };
    model.analysisMode = "plane";
    ensureBuiltInSupportTemplates();
    currentModelLibraryId = "";
    safeStorageRemoveItem("structuralCurrentModelId");
    safeStorageRemoveItem("structuralInputModel");
    safeStorageRemoveItem("structuralModelName");

    const nameInput = document.getElementById("modelName");
    if (nameInput) nameInput.value = "Structural Model";

    resetAnalysisForModelChange();
    renderModelLibrary();
    document.getElementById("resultsContent").style.display = "none";
    refreshAll();
}

// ==========================================================================
// 7. NAVIGATION
// Sidebar section switching.
// ==========================================================================
function updatePageTitle(id) {
    document.getElementById("pageTitle").textContent = AppConfig.sectionTitles[id][0];
}

function updatePageSubtitle(id) {
    document.getElementById("pageSubtitle").textContent = AppConfig.sectionTitles[id][1];
}

function switchSection(id, btnEl) {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
    if (btnEl) btnEl.classList.add("active");
    const target = document.getElementById(id);
    if (target) target.classList.add("active");

    const appRoot = document.querySelector(".app");
    if (appRoot) {
        appRoot.classList.toggle("home-mode", id === "home");
        appRoot.classList.toggle("about-mode", id === "about");
    }

    const liveModelDiagramCard = document.getElementById("liveModelDiagramCard");
    if (liveModelDiagramCard) liveModelDiagramCard.style.display = (id === "home" || id === "about") ? "none" : "block";

    const homeButton = document.getElementById("topbarHomeButton");
    if (homeButton) homeButton.style.display = (id === "home" || id === "about") ? "none" : "inline-flex";

    updatePageTitle(id);
    updatePageSubtitle(id);
}

function goHome() {
    const homeBtn = document.querySelector('.nav-btn[data-section="home"]');
    switchSection("home", homeBtn);
}

document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        switchSection(btn.dataset.section, btn);
    });
});

// ==========================================================================
// 8. MODEL CRUD & TABLE RENDERING
// Each subsection: create-form submit handler, form reset, table render, (edit/delete).
// ==========================================================================

// ---- Reorderable Input Tables ----
// Drag the grip beside any input ID to change that collection's sequence.
// Pointer events are used so the same control works with mouse and touch.
const sortDragState = {
    row: null,
    handle: null,
    tbody: null,
    collection: null,
    pointerId: null,
    startX: 0,
    startY: 0,
    holdTimer: null,
    active: false,
};

const SORT_HOLD_DELAY_MS = 450;
const SORT_MOVE_CANCEL_PX = 10;

function reorderVisibleCollection(collectionName, orderedEncodedIds) {
    const collection = model[collectionName];
    if (!Array.isArray(collection)) return false;

    const orderedIds = [];
    orderedEncodedIds.forEach((encodedId) => {
        try {
            const id = decodeURIComponent(encodedId);
            if (!orderedIds.includes(id)) orderedIds.push(id);
        } catch (error) {
            // Ignore malformed DOM data; the underlying model remains intact.
        }
    });

    const idSet = new Set(orderedIds);
    const reorderedVisibleItems = orderedIds
        .map((id) => collection.find((item) => String(item?.id) === String(id)))
        .filter(Boolean);

    if (!reorderedVisibleItems.length) return false;

    const visiblePositions = [];
    collection.forEach((item, index) => {
        if (idSet.has(String(item?.id))) visiblePositions.push(index);
    });

    if (visiblePositions.length !== reorderedVisibleItems.length) return false;

    visiblePositions.forEach((position, index) => {
        collection[position] = reorderedVisibleItems[index];
    });

    return true;
}

function activateSortDrag() {
    if (!sortDragState.row || !sortDragState.handle) return;
    if (!sortDragState.row.isConnected) return;

    sortDragState.active = true;
    sortDragState.handle.classList.remove("sort-holding");
    sortDragState.handle.classList.add("sort-ready");
    sortDragState.row.classList.add("sort-dragging");

    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        try { navigator.vibrate([28, 22, 38]); } catch (error) {}
    }
}

function finishSortDrag(commit = true) {
    const row = sortDragState.row;
    const tbody = sortDragState.tbody;
    const collection = sortDragState.collection;
    const wasActive = sortDragState.active;

    if (sortDragState.holdTimer) {
        clearTimeout(sortDragState.holdTimer);
        sortDragState.holdTimer = null;
    }

    if (commit && wasActive && tbody && collection) {
        const orderedIds = Array.from(tbody.querySelectorAll("tr[data-sort-collection]"))
            .filter((tr) => tr.dataset.sortCollection === collection)
            .map((tr) => tr.dataset.sortId);

        if (reorderVisibleCollection(collection, orderedIds)) {
            markAnalysisInvalidated();
            refreshAll();
        }
    }

    if (row) row.classList.remove("sort-dragging", "sort-drop-target");
    if (sortDragState.handle) sortDragState.handle.classList.remove("sort-holding", "sort-ready");

    sortDragState.row = null;
    sortDragState.handle = null;
    sortDragState.tbody = null;
    sortDragState.collection = null;
    sortDragState.pointerId = null;
    sortDragState.startX = 0;
    sortDragState.startY = 0;
    sortDragState.active = false;
}

function handleSortPointerDown(e) {
    const handle = e.target.closest(".sort-handle");
    if (!handle) return;
    if (e.button !== undefined && e.button !== 0) return;

    const row = handle.closest("tr[data-sort-collection][data-sort-id]");
    const tbody = row?.parentElement;
    if (!row || !tbody) return;

    e.preventDefault();

    finishSortDrag(false);

    sortDragState.row = row;
    sortDragState.handle = handle;
    sortDragState.tbody = tbody;
    sortDragState.collection = row.dataset.sortCollection;
    sortDragState.pointerId = e.pointerId;
    sortDragState.startX = e.clientX;
    sortDragState.startY = e.clientY;
    sortDragState.active = false;

    handle.classList.add("sort-holding");

    sortDragState.holdTimer = setTimeout(() => {
        activateSortDrag();
    }, SORT_HOLD_DELAY_MS);

    if (handle.setPointerCapture) {
        try { handle.setPointerCapture(e.pointerId); } catch (error) {}
    }
}

function handleSortPointerMove(e) {
    if (!sortDragState.row || e.pointerId !== sortDragState.pointerId) return;

    const dx = e.clientX - sortDragState.startX;
    const dy = e.clientY - sortDragState.startY;
    const movement = Math.hypot(dx, dy);

    if (!sortDragState.active) {
        if (movement >= SORT_MOVE_CANCEL_PX) {
            finishSortDrag(false);
        }
        return;
    }

    e.preventDefault();

    const elementAtPointer = document.elementFromPoint(e.clientX, e.clientY);
    const targetRow = elementAtPointer?.closest("tr[data-sort-collection][data-sort-id]");
    if (!targetRow || targetRow.parentElement !== sortDragState.tbody) return;
    if (targetRow.dataset.sortCollection !== sortDragState.collection) return;
    if (targetRow === sortDragState.row) return;

    const currentTarget = sortDragState.tbody.querySelector("tr.sort-drop-target");
    if (currentTarget && currentTarget !== targetRow) currentTarget.classList.remove("sort-drop-target");
    targetRow.classList.add("sort-drop-target");

    const rect = targetRow.getBoundingClientRect();
    const insertBefore = e.clientY < rect.top + rect.height / 2;
    if (insertBefore) {
        sortDragState.tbody.insertBefore(sortDragState.row, targetRow);
    } else {
        sortDragState.tbody.insertBefore(sortDragState.row, targetRow.nextSibling);
    }
}

document.addEventListener("pointerdown", handleSortPointerDown, { passive: false });
document.addEventListener("pointermove", handleSortPointerMove, { passive: false });
document.addEventListener("pointerup", () => finishSortDrag(true));
document.addEventListener("pointercancel", () => finishSortDrag(false));

function handleSortKeyboardReorder(event) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    const handle = event.target?.closest?.(".sort-handle");
    if (!handle) return;
    const row = handle.closest("tr[data-sort-collection][data-sort-id]");
    const tbody = row?.parentElement;
    if (!row || !tbody) return;

    const collection = row.dataset.sortCollection;
    const rows = Array.from(tbody.querySelectorAll("tr[data-sort-collection][data-sort-id]"))
        .filter((candidate) => candidate.dataset.sortCollection === collection);
    const index = rows.indexOf(row);
    const nextIndex = index + (event.key === "ArrowUp" ? -1 : 1);
    if (index < 0 || nextIndex < 0 || nextIndex >= rows.length) return;
    event.preventDefault();

    const targetRow = rows[nextIndex];
    if (event.key === "ArrowUp") tbody.insertBefore(row, targetRow);
    else tbody.insertBefore(row, targetRow.nextSibling);

    const orderedIds = Array.from(tbody.querySelectorAll("tr[data-sort-collection]"))
        .filter((candidate) => candidate.dataset.sortCollection === collection)
        .map((candidate) => candidate.dataset.sortId);
    const movedId = row.dataset.sortId;
    if (reorderVisibleCollection(collection, orderedIds)) {
        markAnalysisInvalidated();
        refreshAll();
        const movedRow = Array.from(document.querySelectorAll('tr[data-sort-collection][data-sort-id]'))
            .find((candidate) => candidate.dataset.sortCollection === collection && candidate.dataset.sortId === movedId);
        movedRow?.querySelector(".sort-handle")?.focus();
    }
}
document.addEventListener("keydown", handleSortKeyboardReorder);

function sortHandle(id) {
    const safeId = escapeHtml(id);
    return `<span class="sort-handle" role="group" tabindex="0" title="Drag to reorder; use Arrow Up or Arrow Down when focused" aria-keyshortcuts="ArrowUp ArrowDown" aria-label="Reorder ${safeId}. Use Arrow Up or Arrow Down.">⋮⋮</span>`;
}

function setOptions(selectId, items, placeholder, valueKey = "id") {
    const select = document.getElementById(selectId);
    if (!select) return;
    const current = select.value;
    select.innerHTML =
        `<option value="">${placeholder}</option>` +
        items
            .map((item) => {
                const value = typeof item === "string" ? item : item[valueKey];
                return `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`;
            })
            .join("");
    if (
        items.some((item) => {
            const value = typeof item === "string" ? item : item[valueKey];
            return String(value) === current;
        })
    )
        select.value = current;
}

function updateSelects() {
    setOptions("elementTemplateSelect", model.elementTemplates, "Select template");
    setOptions("elementStartNode", model.nodes, "Select node");
    setOptions("elementEndNode", model.nodes, "Select node");
    setOptions("supportTemplateSelect", model.supportTemplates, "Select support");
    setOptions("supportNodeSelect", model.nodes, "Select node");
    setOptions("loadCaseSelect", model.loadCases, "Select load case");
    setOptions("loadNode", model.nodes, "Select node");
    setOptions("loadElement", model.elements, "Select element");
    setOptions("momentCaseSelect", model.momentCases, "Select moment case");
    setOptions("momentNode", model.nodes, "Select node");
    setOptions("momentElement", model.elements, "Select element");
    syncActiveAnalysisCaseSelectors();
}

function getDeletionDependencies(collection, value, property) {
    const refValue = String(value);
    const deps = [];

    const addDependency = (label, items) => {
        if (items.length) deps.push(`${items.length} ${label}${items.length === 1 ? "" : "s"}`);
    };

    switch (collection) {
        case "nodes":
            addDependency("element", model.elements.filter((e) => String(e.startNode) === refValue || String(e.endNode) === refValue));
            addDependency("support assignment", model.supportAssignments.filter((s) => String(s.nodeId) === refValue));
            addDependency("load", model.loads.filter((l) => String(l.nodeId) === refValue));
            addDependency("moment", model.moments.filter((m) => String(m.nodeId) === refValue));
            break;
        case "elementTemplates":
            addDependency("element", model.elements.filter((e) => String(e.templateId) === refValue));
            break;
        case "elements":
            addDependency("load", model.loads.filter((l) => String(l.elementId) === refValue));
            addDependency("moment", model.moments.filter((m) => String(m.elementId) === refValue));
            break;
        case "supportTemplates":
            addDependency("support assignment", model.supportAssignments.filter((s) => String(s.supportId) === refValue));
            break;
        case "loadCases":
            addDependency("load", model.loads.filter((l) => String(l.loadCaseId) === refValue));
            break;
        case "momentCases":
            addDependency("moment", model.moments.filter((m) => String(m.momentCaseId) === refValue));
            break;
    }

    return deps;
}

function deleteItem(collection, encodedValue, property) {
    const value = decodeURIComponent(encodedValue);

    if (collection === "supportTemplates") {
        const support = model.supportTemplates.find((item) => String(item[property]) === String(value));
        if (support?.builtIn) return alert("Built-in support templates cannot be deleted.");
    }

    const dependencies = getDeletionDependencies(collection, value, property);
    if (dependencies.length) {
        const entityNames = {
            nodes: "Node",
            elementTemplates: "Element Template",
            elements: "Element",
            supportTemplates: "Support Template",
            supportAssignments: "Support Assignment",
            loadCases: "Load Case",
            loads: "Load",
            momentCases: "Moment Case",
            moments: "Moment",
        };
        return alert(`Cannot delete ${entityNames[collection] || collection} ${value} because it is referenced by ${dependencies.join(", ")}. Delete or reassign those dependent items first.`);
    }

    if (!confirm(`Delete ${value}?`)) return;

    if (property === "id") {
        const editResetters = {
            nodes: () => { if (typeof editingNodeId !== "undefined" && String(editingNodeId) === String(value)) resetNodeForm(); },
            elementTemplates: () => { if (typeof editingElementTemplateId !== "undefined" && String(editingElementTemplateId) === String(value)) resetElementTemplateForm(); },
            elements: () => { if (typeof editingElementId !== "undefined" && String(editingElementId) === String(value)) resetElementAssignmentForm(); },
            supportTemplates: () => { if (typeof editingSupportTemplateId !== "undefined" && String(editingSupportTemplateId) === String(value)) resetSupportForm(); },
            supportAssignments: () => { if (typeof editingSupportAssignmentId !== "undefined" && String(editingSupportAssignmentId) === String(value)) resetSupportAssignmentForm(); },
            loadCases: () => { if (typeof editingLoadCaseId !== "undefined" && String(editingLoadCaseId) === String(value)) resetLoadCaseForm(); },
            loads: () => { if (typeof editingLoadId !== "undefined" && String(editingLoadId) === String(value)) resetLoadForm(); },
            momentCases: () => { if (typeof editingMomentCaseId !== "undefined" && String(editingMomentCaseId) === String(value)) resetMomentCaseForm(); },
            moments: () => { if (typeof editingMomentId !== "undefined" && String(editingMomentId) === String(value)) resetMomentForm(); },
        };
        if (editResetters[collection]) editResetters[collection]();
    }

    markAnalysisInvalidated();
    model[collection] = model[collection].filter(
        (item) => String(item[property]) !== String(value),
    );
    if (collection === "elements") {
        model.loadCases.forEach((loadCase) => {
            const weights = loadCase.memberSelfWeights;
            if (weights && typeof weights === "object" && !Array.isArray(weights)) delete weights[String(value)];
        });
    }
    refreshAll();
}

function refreshAll() {
    syncAnalysisModeUI();
    if (typeof syncLoadInputModeUI === "function") syncLoadInputModeUI();
    if (typeof syncMomentInputModeUI === "function") syncMomentInputModeUI();
    if (typeof syncMomentCaseInputModeUI === "function") syncMomentCaseInputModeUI();
    updateGlobalDofNumberingUI();
    renderModelLibrary();
    renderNodes();
    renderElementTemplates();
    renderElements();
    renderSupportTemplates();
    renderSupportAssignments();
    renderLoadCases();
    renderLoads();
    renderMomentCases();
    renderMoments();
    updateSelects();
    // updateSelects rebuilds the shared case dropdowns, so reapply mode labels
    // and placeholders afterward for Grid torsion terminology.
    if (typeof syncLoadInputModeUI === "function") syncLoadInputModeUI();
    if (typeof syncMomentInputModeUI === "function") syncMomentInputModeUI();
    if (typeof syncMomentCaseInputModeUI === "function") syncMomentCaseInputModeUI();
    updateStats();
    scheduleInlineModelDiagramRedraw();
}

/* ==========================================================================
 * APPLICATION BOOTSTRAP
 * Runs once every module script has loaded and registered its markup + logic
 * (index.html loads main.js first and the page / results modules afterwards).
 * ========================================================================== */
document.addEventListener("DOMContentLoaded", function initApplication() {
    // Establish the Home view before restoring saved data. Startup operations
    // can touch old or malformed browser data; they must never leave the shell
    // in dashboard styling while the Home section is active.
    const homeNavBtn = document.querySelector('.nav-btn[data-section="home"]');
    const forceHomeView = () => {
        document.querySelectorAll(".section").forEach((section) => {
            section.classList.toggle("active", section.id === "home");
        });
        document.querySelectorAll(".nav-btn").forEach((button) => {
            button.classList.toggle("active", button === homeNavBtn);
        });
        const appRoot = document.querySelector(".app");
        if (appRoot) appRoot.classList.add("home-mode");
        const liveModelDiagramCard = document.getElementById("liveModelDiagramCard");
        if (liveModelDiagramCard) liveModelDiagramCard.style.display = "none";
        const homeButton = document.getElementById("topbarHomeButton");
        if (homeButton) homeButton.style.display = "none";
        updatePageTitle("home");
        updatePageSubtitle("home");
    };

    forceHomeView();
    try {
        loadModel();
        migrateUnitSystem();
        ensureBuiltInSupportTemplates();
        analysisState.status = "not-run";
        updateAnalysisStatusUI();
        syncAnalysisModeUI();
        toggleLoadTarget();
        toggleMomentTarget();
        refreshAll();
    } catch (error) {
        console.error("[startup] Initialization failed; keeping the Home screen visible.", error);
    } finally {
        // Reassert Home after initialization so no intermediate UI update or
        // partial failure can determine which screen users see on page open.
        forceHomeView();
        try {
            renderModelLibrary();
        } catch (error) {
            console.error("[startup] Could not refresh the saved-model list.", error);
        }
    }
});


/* ---- Supplied Grid calculation engine (Steps 1–3, embedded in an existing file) ---- */
/*
 * Grid Structure Analysis — Steps 1–3 only.
 * No CSS, UI, DOM rendering, persistence, diagrams, or event handlers.
 *
 * API:
 *   const result = GridSolver.calculateSteps1To3(model, {
 *     loadCaseId: "LC1",
 *     momentCaseId: "MC1"
 *   });
 *
 * This file intentionally stops after member-property and member-stiffness
 * calculations. It does not calculate global equilibrium, displacements,
 * support reactions, or final member end actions.
 */
(function (global) {
  "use strict";

  const BUILT_IN_SUPPORT_TEMPLATES = [
    {
      id: "FIXED", description: "Fixed Grid Support", type: "fixed", builtIn: true,
      restraints: { RFx: true, RFy: true, RFz: false, RMx: false, RMy: false, RMz: true },
      displacement: { dx: 0, dy: 0, dz: 0, tx: 0, ty: 0, tz: 0 }
    },
    {
      id: "ROLLER", description: "Grid Vertical Support", type: "roller", builtIn: true,
      restraints: { RFx: false, RFy: false, RFz: false, RMx: false, RMy: false, RMz: true },
      displacement: { dx: 0, dy: 0, dz: 0, tx: 0, ty: 0, tz: 0 }
    },
    {
      id: "HINGED", description: "Grid Hinge (RFz only)", type: "hinged", builtIn: true,
      restraints: { RFx: false, RFy: false, RFz: false, RMx: false, RMy: false, RMz: true },
      displacement: { dx: 0, dy: 0, dz: 0, tx: 0, ty: 0, tz: 0 }
    }
  ];

  const EMPTY_MODEL = () => ({
    nodes: [], elementTemplates: [], elements: [], supportTemplates: [],
    supportAssignments: [], loadCases: [], loads: [], momentCases: [], moments: []
  });

  const Matrix = Object.freeze({
    zeros: (rows, cols) => Array.from({ length: rows }, () => new Array(cols).fill(0)),
    mul: (A, B) => {
      if (!A.length || !B.length || !B[0].length) return [];
      if (A[0].length !== B.length) throw new Error("Matrix dimensions do not match for multiplication.");
      return A.map(row => B[0].map((_, col) =>
        row.reduce((sum, value, k) => sum + value * B[k][col], 0)
      ));
    },
    transpose: A => A.length ? A[0].map((_, col) => A.map(row => row[col])) : []
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeModel(input) {
    const source = input && input.model ? input.model : input;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      throw new TypeError("GridSolver.calculateSteps1To3 expects a model object.");
    }

    const normalized = EMPTY_MODEL();
    for (const key of Object.keys(normalized)) {
      if (source[key] !== undefined) {
        if (!Array.isArray(source[key])) throw new TypeError(`Model field '${key}' must be an array.`);
        normalized[key] = clone(source[key]);
      }
    }

    // Normalize legacy element modulus fields into the canonical solver unit (kN/m²).
    normalized.elementTemplates = normalized.elementTemplates.map(template => {
      const item = { ...template };
      const hasValue = value => value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value));
      if (!hasValue(item.E_kN_m2)) {
        if (hasValue(item.E_GPa)) item.E_kN_m2 = Number(item.E_GPa) * 1e6;
        else if (hasValue(item.E)) item.E_kN_m2 = Number(item.E) / 1000;
      }
      delete item.E_GPa;
      delete item.E;
      if (!hasValue(item.G_GPa) && hasValue(item.G)) {
        item.G_GPa = Number(item.G) / 1e9;
        delete item.G;
      }
      // J is an independent torsional property. Do not fabricate it from I:
      // missing/invalid J is rejected by the member validation below.
      return item;
    });

    const customTemplates = normalized.supportTemplates.filter(support =>
      !support.builtIn && !["FIXED", "ROLLER", "HINGED"].includes(String(support.id))
    );
    normalized.supportTemplates = [
      ...BUILT_IN_SUPPORT_TEMPLATES.map(clone),
      ...customTemplates.map(support => ({ ...support, type: support.type || "custom", builtIn: false }))
    ];
    return normalized;
  }

  function getElementEInternal(template) {
    if (!template) return 0;
    const hasValue = value => value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value));
    if (hasValue(template.E_kN_m2)) return Number(template.E_kN_m2);
    if (hasValue(template.E_GPa)) return Number(template.E_GPa) * 1e6;
    if (hasValue(template.E)) return Number(template.E) / 1000;
    return 0;
  }

  function getElementGInternal(template) {
    if (!template) return 0;
    const hasValue = value => value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value));
    if (hasValue(template.G_GPa)) return Number(template.G_GPa) * 1e6;
    if (hasValue(template.G)) return Number(template.G) / 1000;
    return 0;
  }

  function gridElementMatrices(n1, n2, template) {
    if (!n1 || !n2 || !template) return null;
    const dx = Number(n2.x) - Number(n1.x);
    const dy = Number(n2.y) - Number(n1.y);
    const L = Math.hypot(dx, dy);
    if (!(L > 0)) return null;

    const cx = dx / L;
    const cy = dy / L;
    const E = getElementEInternal(template);
    const G = getElementGInternal(template);
    const I = Number(template.I);
    const J = Number(template.J);
    if (!(E > 0 && G > 0 && I > 0 && J > 0)) return null;

    const a = 12 * E * I / Math.pow(L, 3);
    const b = 6 * E * I / Math.pow(L, 2);
    const c = 4 * E * I / L;
    const m = G * J / L;
    const p = m * cx * cx + c * cy * cy;
    const q = (m - c) * cx * cy;
    const ss = m * cy * cy + c * cx * cx;
    const r = b * cy;
    const t = -b * cx;
    const p1 = -m * cx * cx + 0.5 * c * cy * cy;
    const q1 = (-m - 0.5 * c) * cx * cy;
    const r1 = -b * cy;
    const s1 = -m * cy * cy + 0.5 * c * cx * cx;
    const t1 = b * cx;

    const SM = [
      [m, 0, 0, -m, 0, 0],
      [0, c, -b, 0, c / 2, b],
      [0, -b, a, 0, -b, -a],
      [-m, 0, 0, m, 0, 0],
      [0, c / 2, -b, 0, c, b],
      [0, b, -a, 0, b, a]
    ];
    const RT = [
      [cx, cy, 0, 0, 0, 0],
      [-cy, cx, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0],
      [0, 0, 0, cx, cy, 0],
      [0, 0, 0, -cy, cx, 0],
      [0, 0, 0, 0, 0, 1]
    ];
    const RTT = Matrix.transpose(RT);
    const SMS = Matrix.mul(Matrix.mul(RTT, SM), RT);

    return {
      L, cx, cy, E, G, I, J, A: Number(template.A) || 0,
      a, b, c, m, p, q, s: ss, r, t, p1, q1, r1, s1, t1,
      SM, RT, RTT, SMS
    };
  }

  function gridPointLoadVector(P, a, L) {
    const x = Math.max(0, Math.min(Number(a) || 0, L));
    const xi = x / L;
    const N1 = 1 - 3 * xi * xi + 2 * xi * xi * xi;
    const N2 = L * (xi - 2 * xi * xi + xi * xi * xi);
    const N3 = 3 * xi * xi - 2 * xi * xi * xi;
    const N4 = L * (-xi * xi + xi * xi * xi);
    const load = Number(P) || 0;
    return [0, -load * N2, load * N1, 0, -load * N4, load * N3];
  }

  function gridPointTorsionFEM(T, a, L) {
    const x = Math.max(0, Math.min(Number(a) || 0, L));
    const load = Number(T) || 0;
    return [-load * (L - x) / L, 0, 0, -load * x / L, 0, 0];
  }

  function gridPointMomentVector(M, a, L) {
    const x = Math.max(0, Math.min(Number(a) || 0, L));
    const xi = x / L;
    const dN1 = (-6 * xi + 6 * xi * xi) / L;
    const dN2 = 1 - 4 * xi + 3 * xi * xi;
    const dN3 = (6 * xi - 6 * xi * xi) / L;
    const dN4 = -2 * xi + 3 * xi * xi;
    return [0, -M * dN2, M * dN1, 0, -M * dN4, M * dN3];
  }

  function gridUDLLoadVector(q1, q2, a, b, L) {
    const lo = Math.max(0, Math.min(Number(a) || 0, L));
    const hi = Math.max(0, Math.min(Number(b) || 0, L));
    const out = Matrix.zeros(6, 1);
    if (!(hi > lo)) return out;
    const span = hi - lo;
    const gp = [
      [-0.9815606342467191, 0.0471753363865118], [-0.9041172563704749, 0.1069393259953184],
      [-0.7699026741943047, 0.1600783285433464], [-0.5873179542866175, 0.2031674267230659],
      [-0.3678314989981802, 0.2334925365383548], [-0.1252334085114689, 0.2491470458134029],
      [0.1252334085114689, 0.2491470458134029], [0.3678314989981802, 0.2334925365383548],
      [0.5873179542866175, 0.2031674267230659], [0.7699026741943047, 0.1600783285433464],
      [0.9041172563704749, 0.1069393259953184], [0.9815606342467191, 0.0471753363865118]
    ];
    // 12-point Gauss-Legendre integration for a linearly varying UDL.
    for (const [z, w] of gp) {
      const x = lo + 0.5 * (z + 1) * span;
      const wt = 0.5 * span * w;
      const xi = x / L;
      const N1 = 1 - 3 * xi * xi + 2 * xi * xi * xi;
      const N2 = L * (xi - 2 * xi * xi + xi * xi * xi);
      const N3 = 3 * xi * xi - 2 * xi * xi * xi;
      const N4 = L * (-xi * xi + xi * xi * xi);
      const qx = Number(q1) + (Number(q2) - Number(q1)) * ((x - lo) / span);
      const v = [0, -N2 * qx, N1 * qx, 0, -N4 * qx, N3 * qx];
      for (let i = 0; i < 6; i++) out[i][0] += wt * v[i];
    }
    return out;
  }

  function gridLocalMomentComponents(Mx, My, cx, cy) {
    return { Mx: cx * Mx + cy * My, My: -cy * Mx + cx * My };
  }

  function activeCaseId(options, field, list) {
    const requested = options[field];
    return String(requested ?? (list[0] && list[0].id) ?? "");
  }

  function calculateSteps1To3(inputModel, options = {}) {
    options = options || {};
    const model = normalizeModel(inputModel);
    if (!model.nodes.length) throw new Error("The model must contain at least one node.");
    if (!model.elements.length) throw new Error("The model must contain at least one element.");

    const nodeIds = new Set();
    model.nodes.forEach(node => {
      const id = String(node.id ?? "");
      if (!id) throw new Error("Every node must have an ID.");
      if (nodeIds.has(id)) throw new Error(`Duplicate node ID '${id}'.`);
      nodeIds.add(id);
    });

    const activeLoadCaseId = activeCaseId(options, "loadCaseId", model.loadCases);
    const activeMomentCaseId = activeCaseId(options, "momentCaseId", model.momentCases);
    if (model.loads.length && !activeLoadCaseId) throw new Error("Select a load case before calculating member loads.");
    if (model.moments.length && !activeMomentCaseId) throw new Error("Select a moment case before calculating member moments.");
    if (activeLoadCaseId && !model.loadCases.some(item => String(item.id) === activeLoadCaseId)) {
      throw new Error(`Load case '${activeLoadCaseId}' does not exist in the model.`);
    }
    if (activeMomentCaseId && !model.momentCases.some(item => String(item.id) === activeMomentCaseId)) {
      throw new Error(`Moment case '${activeMomentCaseId}' does not exist in the model.`);
    }

    const isActiveLoadCase = load => !!activeLoadCaseId && String(load.loadCaseId || "") === activeLoadCaseId;
    const isActiveMomentCase = moment => !!activeMomentCaseId && String(moment.momentCaseId || "") === activeMomentCaseId;

    // STEP 1 — Degree-of-freedom numbering and restraints.
    const dofMap = {};
    model.nodes.forEach((node, index) => {
      dofMap[node.id] = { x: 3 * index, y: 3 * index + 1, z: 3 * index + 2, num: index };
    });
    const totalDof = model.nodes.length * 3;
    const isRestrained = new Array(totalDof).fill(false);
    const prescribedDisp = new Array(totalDof).fill(0);

    const gridSupportRestraints = assignment => {
      const template = model.supportTemplates.find(support => support.id === assignment.supportId);
      if (!template) return { rx: false, ry: false, rz: false, dx: 0, dy: 0, dz: 0 };
      const movement = assignment.prescribedDisplacements &&
        typeof assignment.prescribedDisplacements === "object" && !Array.isArray(assignment.prescribedDisplacements)
          ? assignment.prescribedDisplacements
          : (template.displacement || {});
      return {
        rx: !!(template.restraints && template.restraints.RFx),
        ry: !!(template.restraints && template.restraints.RFy),
        rz: !!(template.restraints && template.restraints.RMz),
        dx: Number(movement.tx) || 0,
        dy: Number(movement.ty) || 0,
        dz: Number(movement.dz) || 0
      };
    };

    model.supportAssignments.forEach(assignment => {
      const dof = dofMap[assignment.nodeId];
      if (!dof) return;
      const restraint = gridSupportRestraints(assignment);
      if (restraint.rx) { isRestrained[dof.x] = true; prescribedDisp[dof.x] = restraint.dx; }
      if (restraint.ry) { isRestrained[dof.y] = true; prescribedDisp[dof.y] = restraint.dy; }
      if (restraint.rz) { isRestrained[dof.z] = true; prescribedDisp[dof.z] = restraint.dz; }
    });

    model.elements.forEach(element => {
      const n1 = model.nodes.find(node => node.id === element.startNode);
      const n2 = model.nodes.find(node => node.id === element.endNode);
      const template = model.elementTemplates.find(item => item.id === element.templateId);
      if (!n1 || !n2 || !template) throw new Error(`Element '${element.id}' has an invalid node or template reference.`);
      if (!gridElementMatrices(n1, n2, template)) {
        throw new Error(`Element '${element.id}' requires positive I, J, E and G values and a non-zero XY length.`);
      }
    });

    const step1Nodes = model.nodes.map((node, index) => {
      const dof = dofMap[node.id];
      return {
        nodeId: node.id,
        nodeNumber: index + 1,
        dof: {
          thetaX: { number: dof.x + 1, restrained: isRestrained[dof.x], prescribed: prescribedDisp[dof.x] },
          thetaY: { number: dof.y + 1, restrained: isRestrained[dof.y], prescribed: prescribedDisp[dof.y] },
          deltaZ: { number: dof.z + 1, restrained: isRestrained[dof.z], prescribed: prescribedDisp[dof.z] }
        }
      };
    });
    const step1 = { title: "Grid Joint DoF Numbering", dofMap, numNodes: model.nodes.length, totalDof, nodes: step1Nodes };

    // STEP 2 — Joint coordinates and member geometry/material properties.
    const step2Joints = model.nodes.map((node, index) => {
      const dof = dofMap[node.id];
      return {
        jointNumber: index + 1,
        nodeId: node.id,
        x: Number(node.x) || 0,
        y: Number(node.y) || 0,
        z: Number(node.z) || 0,
        dof: {
          thetaX: dof.x + 1, thetaY: dof.y + 1, deltaZ: dof.z + 1
        },
        restrained: {
          thetaX: isRestrained[dof.x], thetaY: isRestrained[dof.y], deltaZ: isRestrained[dof.z]
        }
      };
    });
    const step2Members = model.elements.map((element, index) => {
      const n1 = model.nodes.find(node => node.id === element.startNode);
      const n2 = model.nodes.find(node => node.id === element.endNode);
      const template = model.elementTemplates.find(item => item.id === element.templateId);
      const p = gridElementMatrices(n1, n2, template);
      return {
        memberNumber: index + 1,
        elementId: element.id,
        templateId: element.templateId,
        startNode: element.startNode,
        endNode: element.endNode,
        I: p.I, J: p.J, E_kN_m2: p.E, G_GPa: p.G / 1e6, A: p.A,
        length: p.L, cx: p.cx, cy: p.cy,
        m: p.m, a: p.a, b: p.b, c: p.c,
        p: p.p, q: p.q, r: p.r, s: p.s, t: p.t,
        p1: p.p1, q1: p.q1, r1: p.r1, s1: p.s1, t1: p.t1
      };
    });
    const step2 = { title: "Joint and Member Properties", joints: step2Joints, members: step2Members };

    // STEP 3 — Local member stiffness matrices, transformed stiffness matrices,
    // and equivalent fixed-end actions for member loads in the selected cases.
    const step3Members = model.elements.map(element => {
      const n1 = model.nodes.find(node => node.id === element.startNode);
      const n2 = model.nodes.find(node => node.id === element.endNode);
      const template = model.elementTemplates.find(item => item.id === element.templateId);
      const p = gridElementMatrices(n1, n2, template);
      const AML = Matrix.zeros(6, 1);
      const localPointLoads = [];
      const localUDLs = [];
      const localPointMoments = [];
      const activeLC = model.loadCases.find(item => String(item.id) === activeLoadCaseId);

      if (Number(activeLC?.memberSelfWeights?.[String(element.id)]) > 0 && activeLC?.type === "Self Weight") {
        // Self-weight is a per-element downward line load stored on the case.
        const q = -Number(activeLC.memberSelfWeights[String(element.id)]);
        const fixedEnd = gridUDLLoadVector(q, q, 0, p.L, p.L);
        for (let i = 0; i < 6; i++) AML[i][0] -= fixedEnd[i][0];

        // Keep the same load in the member-load data consumed by Step 8 and
        // the internal-action diagrams. AML already contains the fixed-end
        // action above; this record is for plotting/reporting only and must
        // not be assembled into AML a second time.
        localUDLs.push({ startDistance: 0, endDistance: p.L, q1: q, q2: q });
      }

      model.loads.forEach(load => {
        if (!isActiveLoadCase(load) || load.elementId !== element.id) return;
        if (load.type === "Element Point Load" || load.type === "Element Load") {
          const a = Math.max(0, Math.min(Number(load.distance) || 0, p.L));
          const force = Number(load.Fz) || 0;
          const fixedEnd = gridPointLoadVector(force, a, p.L);
          for (let i = 0; i < 6; i++) AML[i][0] -= fixedEnd[i];
          localPointLoads.push({ distance: a, Fz: force });
        } else if (load.type === "Element UDL") {
          const a = Math.max(0, Math.min(Number(load.distance) || 0, p.L));
          const rawEnd = load.distanceEnd === "" || load.distanceEnd == null ? p.L : Number(load.distanceEnd);
          const b = Math.max(0, Math.min(rawEnd, p.L));
          if (!(b > a)) return;
          const q1 = Number(load.Fz) || 0;
          const q2 = load.FzEnd !== undefined && load.FzEnd !== "" ? (Number(load.FzEnd) || 0) : q1;
          const fixedEnd = gridUDLLoadVector(q1, q2, a, b, p.L);
          for (let i = 0; i < 6; i++) AML[i][0] -= fixedEnd[i][0];
          localUDLs.push({ startDistance: a, endDistance: b, q1, q2 });
        }
      });

      model.moments.forEach(moment => {
        if (!isActiveMomentCase(moment) || moment.elementId !== element.id || moment.type !== "Element Moment") return;
        const a = Math.max(0, Math.min(Number(moment.distance) || 0, p.L));
        const hasMx = Number.isFinite(Number(moment.Mx));
        const hasMy = Number.isFinite(Number(moment.My));
        const globalMx = hasMx ? Number(moment.Mx) : 0;
        const globalMy = hasMy ? Number(moment.My) : 0;
        const local = gridLocalMomentComponents(globalMx, globalMy, p.cx, p.cy);
        const torsion = (Number(moment.Mz) || 0) + local.Mx;
        const bendingVector = gridPointMomentVector(local.My, a, p.L);
        const torsionVector = gridPointTorsionFEM(torsion, a, p.L);
        for (let i = 0; i < 6; i++) AML[i][0] += bendingVector[i] + torsionVector[i];
        localPointMoments.push({ distance: a, Mx: torsion, My: local.My });
      });

      const AMS = Matrix.mul(p.RTT, AML);
      return {
        elementId: element.id,
        templateId: element.templateId,
        startNode: element.startNode,
        endNode: element.endNode,
        length: p.L,
        directionCosines: { cx: p.cx, cy: p.cy },
        SM: p.SM,
        RT: p.RT,
        RTT: p.RTT,
        SMS: p.SMS,
        AML,
        AMS,
        localPointLoads,
        localUDLs,
        localPointMoments
      };
    });

    return {
      success: true,
      solver: "Grid Structure Analysis — Steps 1–3",
      units: { force: "kN", length: "m", moment: "kN·m", rotation: "rad", translation: "m" },
      activeCases: { loadCaseId: activeLoadCaseId, momentCaseId: activeMomentCaseId },
      dofOrder: ["thetaX", "thetaY", "deltaZ"],
      steps: { step1, step2, step3: { title: "Member Stiffness Matrices and Fixed-End Actions", members: step3Members } }
    };
  }

  global.GridSolver = Object.freeze({
    version: "1.1.0-steps-1-3-only",
    calculateSteps1To3,
    Matrix
  });
})(window);
