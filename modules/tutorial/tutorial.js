/* ==========================================================================
 * tutorial.js — Interactive tutorials (engine)
 *
 * Hands-on, learn-by-doing tutorials for beginners. A tutorial builds one real
 * model together with the learner:
 *
 *   - a coach panel docked to the bottom of the screen explains the current
 *     step in plain language (centred card for intro / summary steps);
 *   - a pulsing highlight ring marks the exact control to use next;
 *   - every form is PRE-FILLED with the tutorial values, so the learner only
 *     reads, checks and presses the highlighted button;
 *   - a checklist shows which items exist (✔), which are still missing (○) and
 *     which differ from the tutorial (!);
 *   - "Do it for me" performs the step by submitting the app's own forms, so the
 *     normal validation and rendering code always runs. Nothing writes directly
 *     into the model except the optional "repair" of a mistyped item.
 *
 * The tutorial content lives in tutorial-beginner.js and tutorial-grid.js; each
 * file registers one definition with StructuralTutorial.register(def).
 *
 * Public API (window.StructuralTutorial):
 *   register(def)  add a tutorial definition
 *   start(id)      start tutorial `id` from the Home screen
 *   stop()         close the tutorial panel (the model stays open)
 *   isActive()     true while a tutorial is running
 *   openChooser()  show the tutorial chooser dialog
 *   list()         registered definitions
 *
 * Load order: after every page module (see index.html) so all markup exists.
 * ========================================================================== */
(function () {
    "use strict";

    if (window.StructuralTutorial) return; // guard against the script being loaded twice

    /* ----------------------------------------------------------------------
     * Configuration
     * -------------------------------------------------------------------- */
    const POLL_MS = 250;
    const KEY_DONE = "structuralTutorialsCompleted";
    const KEY_PROMPTED = "structuralTutorialPrompted";
    // The order in which the model-building tabs must be filled.
    const KIND_ORDER = [
        "nodes", "elementTemplates", "elements", "supportAssignments",
        "loadCases", "loads", "momentCases", "moments",
    ];
    const SUPPORT_NAMES = { FIXED: "Fixed", HINGED: "Hinged", ROLLER: "Roller" };

    const registry = [];

    /* ----------------------------------------------------------------------
     * Small helpers
     * -------------------------------------------------------------------- */
    const byId = (id) => document.getElementById(id);
    const qs = (sel, root) => (root || document).querySelector(sel);
    const esc = (value) => (typeof escapeHtml === "function"
        ? escapeHtml(value)
        : String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])));
    const reduceMotion = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const isGrid = () => typeof isGridAnalysisMode === "function" && isGridAnalysisMode();

    function activeSection() {
        const el = qs(".container > .section.active");
        return el ? el.id : "home";
    }

    function showSection(id) {
        if (!id || activeSection() === id) return;
        try {
            if (id === "home" && typeof goHome === "function") goHome();
            else if (typeof switchSection === "function") switchSection(id, qs('.nav-btn[data-section="' + id + '"]'));
        } catch (error) {
            console.error("[tutorial] Could not switch section:", id, error);
        }
    }

    function isVisible(el) {
        return !!el && el.getClientRects().length > 0;
    }

    /* Number shown inside an input: 200000000 -> "2e8", 0.0005 -> "5e-4". The same
     * notation the "e" shortcut button on the forms produces. */
    function fmtInput(value) {
        const n = Number(value);
        if (!Number.isFinite(n)) return String(value ?? "");
        if (n === 0) return "0";
        const a = Math.abs(n);
        if (a >= 1e5 || a < 1e-2) {
            const parts = n.toExponential().split("e");
            return parts[0] + "e" + Number(parts[1]);
        }
        return String(n);
    }

    /* Number shown as text: 200000000 -> "2×10⁸", −30 -> "−30". */
    function pretty(value) {
        const n = Number(value);
        if (!Number.isFinite(n)) return esc(value);
        if (n === 0) return "0";
        const a = Math.abs(n);
        const sign = n < 0 ? "−" : "";
        if (a >= 1e5 || a < 1e-2) {
            const parts = a.toExponential().split("e");
            const sup = String(Number(parts[1])).replace(/-/g, "⁻")
                .replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[d]);
            return sign + parts[0] + "×10" + sup;
        }
        return sign + String(a);
    }

    function approxEqual(a, b) {
        const blank = (v) => v === undefined || v === null || v === "";
        if (blank(a) && blank(b)) return true;
        if (blank(a) || blank(b)) return false;
        const na = Number(a), nb = Number(b);
        if (Number.isFinite(na) && Number.isFinite(nb)) {
            return Math.abs(na - nb) <= 1e-9 * Math.max(1, Math.abs(na), Math.abs(nb));
        }
        return String(a).trim() === String(b).trim();
    }

    /* Fires the same events a user's typing would, so inline handlers
     * (onchange="toggleLoadTarget()" ...) run. Returns false when a <select>
     * does not (yet) offer the requested value. */
    function setField(id, value) {
        const el = byId(id);
        if (!el) return false;
        const text = value === undefined || value === null ? "" : String(value);
        if (el.tagName === "SELECT" && !Array.from(el.options).some((o) => o.value === text)) return false;
        el.value = text;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
    }

    const allTrue = (list) => list.every(Boolean);

    function submitForm(formId) {
        const form = byId(formId);
        if (!form) return false;
        if (typeof form.requestSubmit === "function") form.requestSubmit();
        else form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
        return true;
    }

    /* ----------------------------------------------------------------------
     * Persistence (localStorage may be unavailable: everything degrades quietly)
     * -------------------------------------------------------------------- */
    function readJSON(key, fallback) {
        try {
            const raw = safeStorageGetItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) { return fallback; }
    }
    const completedMap = () => readJSON(KEY_DONE, {});
    function markCompleted(id) {
        const map = completedMap();
        map[id] = new Date().toISOString();
        safeStorageSetItem(KEY_DONE, JSON.stringify(map));
    }
    function storageUsable() {
        try {
            const probe = "__structuralTutorialProbe__";
            if (!safeStorageSetItem(probe, "1")) return false;
            safeStorageRemoveItem(probe);
            return true;
        } catch (e) { return false; }
    }

    /* ----------------------------------------------------------------------
     * Collections: how every model-building tab is filled and described
     * -------------------------------------------------------------------- */
    const COLLECTIONS = {
        nodes: {
            title: "Nodes", form: "nodeForm", submit: "nodeSubmitBtn", reset: "resetNodeForm",
            fill: (it) => allTrue([
                setField("nodeCoordinateMode", "cartesian"),
                setField("nodeId", it.id),
                setField("nodeX", fmtInput(it.x)),
                setField("nodeY", fmtInput(it.y)),
            ]),
            label: (it) => `<b>${esc(it.id)}</b> X = ${pretty(it.x)} m, Y = ${pretty(it.y)} m`,
        },
        elementTemplates: {
            title: "Element templates", form: "elementTemplateForm", submit: "elementTemplateSubmitBtn", reset: "resetElementTemplateForm",
            fill: (it) => {
                const ok = [setField("elementTemplateId", it.id)];
                if (isGrid()) {
                    ok.push(setField("elementE", fmtInput(it.E_kN_m2)), setField("elementI", fmtInput(it.I)),
                        setField("elementG", fmtInput(it.G_GPa)), setField("elementJ", fmtInput(it.J)));
                } else {
                    ok.push(setField("elementMemberType", it.memberType)); // before I: Truss locks I = 0
                    ok.push(setField("elementE", fmtInput(it.E_kN_m2)));
                    if (it.memberType !== "truss") ok.push(setField("elementI", fmtInput(it.I)));
                    ok.push(setField("elementA", fmtInput(it.A)));
                }
                return allTrue(ok);
            },
            label: (it) => {
                if (isGrid()) {
                    return `<b>${esc(it.id)}</b> E = ${pretty(it.E_kN_m2)} kN/m², I = ${pretty(it.I)} m⁴, G = ${pretty(it.G_GPa)} GPa, J = ${pretty(it.J)} m⁴`;
                }
                const type = it.memberType.charAt(0).toUpperCase() + it.memberType.slice(1);
                const inertia = it.memberType === "truss" ? "I = 0 (automatic)" : `I = ${pretty(it.I)} m⁴`;
                return `<b>${esc(it.id)}</b> ${type}: E = ${pretty(it.E_kN_m2)} kN/m², ${inertia}, A = ${pretty(it.A)} m²`;
            },
        },
        elements: {
            title: "Elements", form: "elementAssignmentForm", submit: "elementSubmitBtn", reset: "resetElementAssignmentForm",
            fill: (it) => allTrue([
                setField("elementId", it.id),
                setField("elementTemplateSelect", it.templateId),
                setField("elementStartNode", it.startNode),
                setField("elementEndNode", it.endNode),
            ]),
            label: (it) => `<b>${esc(it.id)}</b> template ${esc(it.templateId)}, ${esc(it.startNode)} → ${esc(it.endNode)}`,
        },
        supportAssignments: {
            title: "Supports", form: "supportAssignmentForm", submit: "supportAssignmentSubmitBtn", reset: "resetSupportAssignmentForm",
            fill: (it) => allTrue([
                setField("supportAssignmentId", it.id),
                setField("supportTemplateSelect", it.supportId),
                setField("supportNodeSelect", it.nodeId),
            ]),
            label: (it) => `<b>${esc(it.id)}</b> ${esc(SUPPORT_NAMES[it.supportId] || it.supportId)} support at node ${esc(it.nodeId)}`,
        },
        loadCases: {
            title: "Load cases", form: "loadCaseForm", submit: "loadCaseSubmitBtn", reset: "resetLoadCaseForm",
            fill: (it) => allTrue([
                setField("loadCaseId", it.id),
                setField("loadCaseType", it.type),
                setField("loadCaseDescription", it.description),
            ]),
            label: (it) => `<b>${esc(it.id)}</b> ${esc(it.type)} — ${esc(it.description)}`,
        },
        loads: {
            title: "Loads", form: "loadForm", submit: "loadSubmitBtn", reset: "resetLoadForm",
            fill: (it) => {
                const udl = it.type === "Element UDL";
                const ok = [
                    setField("loadId", it.id),
                    setField("loadCaseSelect", it.loadCaseId),
                    setField("loadType", it.type), // shows / hides the matching fields
                    setField("loadElement", it.elementId),
                    setField("loadDistance", fmtInput(it.distance)),
                ];
                if (!isGrid()) ok.push(setField("loadAxisSystem", "Global"));
                if (udl) ok.push(setField("loadDistanceEnd", fmtInput(it.distanceEnd)));
                if (isGrid()) {
                    ok.push(setField("loadFz", fmtInput(it.Fz)));
                    if (udl) ok.push(setField("loadFzEnd", fmtInput(it.FzEnd)));
                } else {
                    ok.push(setField("loadFx", fmtInput(it.Fx)), setField("loadFy", fmtInput(it.Fy)));
                    if (udl) ok.push(setField("loadFxEnd", fmtInput(it.FxEnd)), setField("loadFyEnd", fmtInput(it.FyEnd)));
                }
                return allTrue(ok);
            },
            label: (it, hints) => {
                const udl = it.type === "Element UDL";
                const where = udl
                    ? `UDL on ${esc(it.elementId)} from ${esc(hints.loadDistance ?? it.distance)} to ${esc(hints.loadDistanceEnd ?? it.distanceEnd)}`
                    : `point load on ${esc(it.elementId)} at a = ${esc(hints.loadDistance ?? it.distance)}`;
                const unit = udl ? "kN/m" : "kN";
                let value;
                if (isGrid()) value = `Fz = ${pretty(it.Fz)} ${unit}`;
                else {
                    const parts = [];
                    if (Number(it.Fx)) parts.push(`Fx = ${pretty(it.Fx)} ${unit}`);
                    if (Number(it.Fy)) parts.push(`Fy = ${pretty(it.Fy)} ${unit}`);
                    value = parts.join(", ") || `Fy = 0`;
                }
                return `<b>${esc(it.id)}</b> in ${esc(it.loadCaseId)}: ${where}, ${value}`;
            },
        },
        momentCases: {
            title: "Moment cases", form: "momentCaseForm", submit: "momentCaseSubmitBtn", reset: "resetMomentCaseForm",
            fill: (it) => allTrue([
                setField("momentCaseId", it.id),
                setField("momentCaseType", it.type),
                setField("momentCaseDescription", it.description),
            ]),
            label: (it) => `<b>${esc(it.id)}</b> ${esc(it.type)} — ${esc(it.description)}`,
        },
        moments: {
            title: "Moments", form: "momentForm", submit: "momentSubmitBtn", reset: "resetMomentForm",
            fill: (it) => {
                const ok = [
                    setField("momentId", it.id),
                    setField("momentCaseSelect", it.momentCaseId),
                    setField("momentType", it.type),
                    setField("momentElement", it.elementId),
                    setField("momentDistance", fmtInput(it.distance)),
                ];
                if (isGrid()) ok.push(setField("momentX", fmtInput(it.Mx)), setField("momentY", fmtInput(it.My)));
                else ok.push(setField("momentZ", fmtInput(it.Mz)));
                return allTrue(ok);
            },
            label: (it, hints) => {
                const where = `on ${esc(it.elementId)} at a = ${esc(hints.momentDistance ?? it.distance)}`;
                let value;
                if (isGrid()) {
                    const parts = [];
                    if (Number(it.Mx)) parts.push(`Mx = ${pretty(it.Mx)} kN·m`);
                    if (Number(it.My)) parts.push(`My = ${pretty(it.My)} kN·m`);
                    value = parts.join(", ") || "Mx = My = 0";
                } else {
                    value = `Mz = ${pretty(it.Mz)} kN·m (${Number(it.Mz) >= 0 ? "anticlockwise" : "clockwise"})`;
                }
                return `<b>${esc(it.id)}</b> in ${esc(it.momentCaseId)}: ${where}, ${value}`;
            },
        },
    };

    /* ----------------------------------------------------------------------
     * Tutorial state
     * -------------------------------------------------------------------- */
    const S = {
        active: false,
        def: null,
        idx: 0,
        modelName: "",
        modelCreated: false,
        latched: {},          // step id -> true for steps whose custom check latches
        prefillKey: "",
        dialogFilled: false,
        needScroll: false,
        lastNav: null,
        renderKey: "",
        minimized: false,
        confirmExit: false,
        message: "",          // one-line result of the last "Do it for me"
        timer: 0,
        raf: 0,
        panel: null,
        backdrop: null,
        rings: null,
        ringEls: [],
        resizeObserver: null,
        listeners: [],
    };

    const stepOf = (i) => S.def.steps[i === undefined ? S.idx : i];

    /* ----------------------------------------------------------------------
     * Items of a task and their status
     * -------------------------------------------------------------------- */
    function expectedItems(task) {
        const all = (S.def.data && S.def.data[task.kind]) || [];
        return task.ids ? all.filter((it) => task.ids.includes(it.id)) : all;
    }

    function hintsFor(kind, id) {
        return (S.def.inputs && S.def.inputs[kind + "." + id]) || {};
    }

    /* Compares every field present in the tutorial item (ids, numbers, names). */
    function itemStatus(kind, expected) {
        const list = Array.isArray(model[kind]) ? model[kind] : [];
        const found = list.find((m) => String(m.id) === String(expected.id));
        if (!found) return "missing";
        const IGNORE = { z: 1, description: 1 };
        const same = Object.keys(expected).every((key) => IGNORE[key] || approxEqual(found[key], expected[key]));
        return same ? "ok" : "differs";
    }

    function evaluateStep(step) {
        const result = { items: [], done: true, nav: null };
        if (step.nav && S.modelCreated && activeSection() !== step.nav) result.nav = step.nav;
        if (step.task) {
            result.items = expectedItems(step.task).map((it) => ({ it, status: itemStatus(step.task.kind, it) }));
            result.done = result.items.every((x) => x.status === "ok");
        } else if (typeof step.isDone === "function") {
            let value = false;
            try { value = !!step.isDone(S); } catch (e) { value = false; }
            if (step.latch) {
                if (value) S.latched[step.id] = true;
                value = !!S.latched[step.id];
            }
            result.done = value;
        }
        return result;
    }

    /* ----------------------------------------------------------------------
     * Filling forms / "Do it for me"
     * -------------------------------------------------------------------- */
    function applyHints(kind, item) {
        const hints = hintsFor(kind, item.id);
        Object.keys(hints).forEach((fieldId) => setField(fieldId, hints[fieldId]));
    }

    function fillForm(kind, item) {
        const cfg = COLLECTIONS[kind];
        try {
            if (typeof window[cfg.reset] === "function") window[cfg.reset]();
            const ok = cfg.fill(item);
            applyHints(kind, item);
            return ok;
        } catch (error) {
            console.error("[tutorial] fill failed", kind, item, error);
            return false;
        }
    }

    function prefillNext(step) {
        const next = expectedItems(step.task).find((it) => itemStatus(step.task.kind, it) === "missing");
        if (next) fillForm(step.task.kind, next);
    }

    /* Creates / repairs the items of one task by submitting the app's own form. */
    function autoTask(task) {
        for (const item of expectedItems(task)) {
            const status = itemStatus(task.kind, item);
            if (status === "ok") continue;
            if (status === "differs") {
                const list = model[task.kind];
                const index = list.findIndex((m) => String(m.id) === String(item.id));
                if (index >= 0) list.splice(index, 1); // same id is re-created below, so references stay valid
                if (typeof markAnalysisInvalidated === "function") markAnalysisInvalidated();
                if (typeof refreshAll === "function") refreshAll();
            }
            if (!fillForm(task.kind, item)) {
                return `Could not fill the form for ${item.id}. Complete the earlier steps first.`;
            }
            submitForm(COLLECTIONS[task.kind].form);
            if (itemStatus(task.kind, item) !== "ok") {
                return `Could not create ${item.id}. Complete the earlier steps first.`;
            }
        }
        return "";
    }

    function doItForMe() {
        const step = stepOf();
        S.message = "";
        if (step.task) S.message = autoTask(step.task);
        else if (typeof step.auto === "function") {
            try { S.message = step.auto(S) || ""; } catch (error) { console.error(error); S.message = "That could not be done automatically."; }
        }
        S.prefillKey = "";
        tick();
    }

    /* Builds every remaining model-building step, then jumps to the analysis part. */
    function buildEverything() {
        if (!S.modelCreated) return;
        S.message = "";
        for (const kind of KIND_ORDER) {
            if (!(S.def.data[kind] || []).length) continue;
            const problem = autoTask({ kind });
            if (problem) { S.message = problem; break; }
        }
        if (!S.message) {
            const target = S.def.steps.findIndex((s) => s.id === S.def.analyseStepId);
            if (target >= 0) gotoStep(target);
        }
        S.prefillKey = "";
        tick();
    }

    /* ----------------------------------------------------------------------
     * Panel (DOM)
     * -------------------------------------------------------------------- */
    function buildPanel() {
        S.backdrop = document.createElement("div");
        S.backdrop.className = "sa-backdrop";
        S.backdrop.hidden = true;

        S.panel = document.createElement("section");
        S.panel.className = "sa-coach";
        S.panel.setAttribute("role", "region");
        S.panel.setAttribute("aria-label", "Interactive tutorial");
        S.panel.addEventListener("click", onPanelClick);

        S.rings = document.createElement("div");
        S.rings.className = "sa-rings";
        S.rings.setAttribute("aria-hidden", "true");

        document.body.appendChild(S.backdrop);
        document.body.appendChild(S.rings);
        document.body.appendChild(S.panel);
        document.body.classList.add("sa-tutorial-active");

        if (typeof ResizeObserver === "function") {
            S.resizeObserver = new ResizeObserver(syncPanelHeight);
            S.resizeObserver.observe(S.panel);
        }
    }

    function syncPanelHeight() {
        if (!S.panel) return;
        const card = S.panel.classList.contains("sa-coach--card");
        document.body.classList.toggle("sa-card-mode", card);
        const h = card ? 0 : Math.ceil(S.panel.getBoundingClientRect().height);
        document.documentElement.style.setProperty("--sa-coach-h", h + "px");
    }

    function destroyPanel() {
        if (S.resizeObserver) S.resizeObserver.disconnect();
        S.resizeObserver = null;
        [S.panel, S.backdrop, S.rings].forEach((el) => el && el.remove());
        S.panel = S.backdrop = S.rings = null;
        S.ringEls = [];
        document.body.classList.remove("sa-tutorial-active", "sa-card-mode");
        document.documentElement.style.removeProperty("--sa-coach-h");
    }

    function bodyHTML(step) {
        const body = typeof step.body === "function" ? step.body(S) : step.body;
        return body || "";
    }

    function figureHTML(step) {
        if (!step.figure) return "";
        let svg = "";
        try {
            svg = step.figure === "model" && typeof modelPreviewSVG === "function"
                ? modelPreviewSVG(S.def.data)
                : (typeof step.figure === "function" ? step.figure(S) : "");
        } catch (e) { svg = ""; }
        if (!svg) return "";
        const caption = step.figureCaption ? `<figcaption>${step.figureCaption}</figcaption>` : "";
        return `<figure class="sa-figure">${svg}${caption}</figure>`;
    }

    function itemsHTML(ev) {
        if (!ev.items.length) return "";
        const firstMissing = ev.items.findIndex((x) => x.status === "missing");
        const kind = stepOf().task.kind;
        const rows = ev.items.map((x, i) => {
            const hints = hintsFor(kind, x.it.id);
            const note = S.def.notes && S.def.notes[kind + "." + x.it.id];
            const mark = x.status === "ok" ? "✔" : x.status === "differs" ? "!" : "";
            const cls = x.status === "ok" ? "ok" : x.status === "differs" ? "differs" : (i === firstMissing ? "current" : "todo");
            const warn = x.status === "differs"
                ? `<em>This ${esc(x.it.id)} exists but differs from the tutorial. Press “Do it for me” to correct it, or edit it with ✎ in the table.</em>` : "";
            const extra = note ? `<small>${note}</small>` : "";
            return `<li class="${cls}"><span class="sa-mark">${mark}</span><span class="sa-item-body">${COLLECTIONS[kind].label(x.it, hints)}${extra}${warn}</span></li>`;
        }).join("");
        return `<div class="sa-side-title">${esc(COLLECTIONS[kind].title)} to create</div><ul class="sa-items">${rows}</ul>`;
    }

    function statusHTML(step, ev) {
        if (S.message) return `<div class="sa-status warn">${esc(S.message)}</div>`;
        if (ev.nav) return "";
        if (S.modelCreated && model.analysisMode !== S.def.mode) {
            return `<div class="sa-status warn">The open model is not the tutorial model. Exit and restart the tutorial.</div>`;
        }
        if (S.modelCreated && activeSection() === "home") {
            return `<div class="sa-status warn">You are on the Home screen. <button type="button" class="sa-btn" data-act="resume">Back to my tutorial model</button></div>`;
        }
        if (step.task || step.isDone) {
            if (ev.done) return `<div class="sa-status done">✔ ${step.doneNote || "Step complete. Press Next to continue."}</div>`;
            if (step.hint) return `<div class="sa-status">${step.hint}</div>`;
        }
        if (step.task && ev.items.some((x) => x.status === "missing")) {
            return `<div class="sa-status">Check the highlighted form, then press the highlighted button.</div>`;
        }
        return "";
    }

    function renderExitConfirm(step) {
        const saved = !!currentModelLibraryId;
        S.panel.innerHTML = `
            <div class="sa-coach-head"><span class="sa-coach-tag">Tutorial</span><span class="sa-coach-step">Leave the tutorial?</span><span class="sa-spacer"></span></div>
            <div class="sa-coach-main single"><div class="sa-main"><div class="sa-title">What should happen to your tutorial model?</div>
            <div class="sa-text"><p>${S.modelCreated
                ? `The model “${esc(getModelName())}” is open${saved ? " and saved on the Home screen" : " but not saved yet"}. You can keep working on it or remove it.`
                : "You have not created the tutorial model yet, so nothing needs to be removed."}</p></div></div></div>
            <div class="sa-coach-foot">
                <button type="button" class="sa-btn primary" data-act="resume-tutorial">Continue tutorial</button>
                <span class="sa-spacer"></span>
                <button type="button" class="sa-btn" data-act="exit-keep">${S.modelCreated ? "Exit and keep the model" : "Exit"}</button>
                ${S.modelCreated ? '<button type="button" class="sa-btn danger" data-act="exit-discard">Exit and delete the model</button>' : ""}
            </div>`;
        S.panel.classList.remove("sa-coach--card", "sa-min");
        S.backdrop.hidden = true;
    }

    function render(ev) {
        if (!S.panel) return;
        const step = stepOf();
        const total = S.def.steps.length;
        const last = S.idx === total - 1;
        const card = !!step.card;
        const interactive = !!(step.task || step.isDone);

        const key = JSON.stringify([S.idx, S.confirmExit, S.minimized, S.message, ev.nav, ev.done,
            ev.items.map((x) => x.status), S.modelCreated, activeSection() === "home", model.analysisMode,
            typeof step.body === "function" ? bodyHTML(step) : 0, currentModelLibraryId]);
        if (key === S.renderKey) return;
        S.renderKey = key;

        if (S.confirmExit) { renderExitConfirm(step); syncPanelHeight(); return; }

        const text = ev.nav
            ? `<div class="sa-callout info">👉 First open the <b>${esc(navLabel(ev.nav))}</b> tab in the left menu (highlighted). <button type="button" class="sa-btn" data-act="gonav">Take me there</button></div>`
            : "";
        const items = itemsHTML(ev);
        const side = items ? `<div class="sa-side">${items}</div>` : "";
        const percent = Math.round((S.idx / (total - 1)) * 100);
        const canBuild = S.modelCreated && S.def.analyseStepId && S.idx < S.def.steps.findIndex((s) => s.id === S.def.analyseStepId);

        S.panel.classList.toggle("sa-coach--card", card);
        S.panel.classList.toggle("sa-min", S.minimized && !card);
        S.backdrop.hidden = !card;

        S.panel.innerHTML = `
            <div class="sa-coach-head">
                <span class="sa-coach-tag">${esc(S.def.shortTitle || "Tutorial")}</span>
                <span class="sa-coach-step">Step ${S.idx + 1} of ${total}</span>
                <span class="sa-coach-progress" aria-hidden="true"><span style="width:${percent}%"></span></span>
                ${card ? "" : `<button type="button" class="sa-icon-btn" data-act="min" title="${S.minimized ? "Show" : "Hide"} the tutorial panel" aria-label="${S.minimized ? "Show" : "Hide"} the tutorial panel">${S.minimized ? "▴" : "▾"}</button>`}
                <button type="button" class="sa-icon-btn" data-act="exit" title="Exit tutorial" aria-label="Exit tutorial">✕</button>
            </div>
            <div class="sa-coach-main ${side ? "" : "single"}">
                <div class="sa-main" aria-live="polite">
                    <div class="sa-title">${step.title}</div>
                    ${figureHTML(step)}
                    ${text}
                    <div class="sa-text">${bodyHTML(step)}</div>
                    ${statusHTML(step, ev)}
                </div>
                ${side}
            </div>
            <div class="sa-coach-foot">
                <button type="button" class="sa-btn" data-act="back" ${S.idx === 0 ? "disabled" : ""}>← Back</button>
                ${interactive && !ev.nav && !card ? `<button type="button" class="sa-btn" data-act="auto">✨ Do it for me</button>` : ""}
                ${!card && !ev.nav ? `<button type="button" class="sa-btn link" data-act="show">📍 Show me where</button>` : ""}
                ${canBuild && !card ? `<button type="button" class="sa-btn link" data-act="build" title="Creates all the remaining model data and jumps to the analysis">Build the whole model for me</button>` : ""}
                <span class="sa-spacer"></span>
                ${interactive && !ev.done && !card ? `<button type="button" class="sa-btn link" data-act="skip">Skip this step</button>` : ""}
                <button type="button" class="sa-btn primary ${ev.done || !interactive ? "ready" : ""}" data-act="next" ${interactive && !ev.done ? "disabled" : ""}>${last ? "Finish ✓" : (step.nextLabel || "Next →")}</button>
            </div>`;
        syncPanelHeight();
    }

    function navLabel(section) {
        const btn = qs('.nav-btn[data-section="' + section + '"]');
        return btn ? btn.textContent.replace(/^[^A-Za-z]+/, "").trim() : section;
    }

    function onPanelClick(event) {
        const btn = event.target.closest("[data-act]");
        if (!btn || btn.disabled) return;
        const act = btn.getAttribute("data-act");
        if (act === "next") nextStep();
        else if (act === "back") gotoStep(S.idx - 1);
        else if (act === "skip") gotoStep(S.idx + 1);
        else if (act === "auto") doItForMe();
        else if (act === "build") buildEverything();
        else if (act === "show") { S.needScroll = true; }
        else if (act === "min") { S.minimized = !S.minimized; S.renderKey = ""; }
        else if (act === "exit") { S.confirmExit = true; S.renderKey = ""; }
        else if (act === "resume-tutorial") { S.confirmExit = false; S.renderKey = ""; }
        else if (act === "exit-keep") stop(false);
        else if (act === "exit-discard") stop(true);
        else if (act === "gonav") { const ev = evaluateStep(stepOf()); if (ev.nav) showSection(ev.nav); }
        else if (act === "resume") showSection("dashboard");
        tick();
    }

    /* ----------------------------------------------------------------------
     * Highlight rings
     * -------------------------------------------------------------------- */
    function resolveTargets(step, ev) {
        let list;
        if (ev.nav) {
            list = [{ el: qs('.nav-btn[data-section="' + ev.nav + '"]'), style: "strong" }];
        } else if (step.card) {
            list = [];
        } else {
            let raw = typeof step.targets === "function" ? step.targets(S) : step.targets;
            if (!raw && step.task) {
                const cfg = COLLECTIONS[step.task.kind];
                raw = [{ sel: "#" + cfg.form, style: "soft" }, { sel: "#" + cfg.submit, style: "strong" }];
            }
            list = (Array.isArray(raw) ? raw : raw ? [raw] : []).map((t) => {
                const spec = typeof t === "string" ? { sel: t, style: "strong" } : t;
                return { el: spec.el || (spec.sel ? qs(spec.sel) : null), style: spec.style || "strong" };
            });
        }
        return list.filter((t) => isVisible(t.el));
    }

    let currentTargets = [];

    function drawRings() {
        if (!S.active || !S.rings) return;
        const pad = 5;
        while (S.ringEls.length < currentTargets.length) {
            const div = document.createElement("div");
            div.className = "sa-ring";
            S.rings.appendChild(div);
            S.ringEls.push(div);
        }
        S.ringEls.forEach((div, i) => {
            const target = currentTargets[i];
            if (!target || !isVisible(target.el)) { div.classList.add("hidden"); return; }
            const r = target.el.getBoundingClientRect();
            div.classList.remove("hidden");
            div.classList.toggle("soft", target.style === "soft");
            div.style.transform = `translate(${Math.round(r.left - pad)}px, ${Math.round(r.top - pad)}px)`;
            div.style.width = Math.round(r.width + pad * 2) + "px";
            div.style.height = Math.round(r.height + pad * 2) + "px";
        });
        S.raf = requestAnimationFrame(drawRings);
    }

    /* Scrolls the page so the highlighted area sits between the sticky top bar and the panel. */
    function scrollToTargets() {
        const strong = currentTargets.filter((t) => t.style === "strong");
        const all = currentTargets.length ? currentTargets : [];
        if (!all.length || !S.panel) return;
        const rect = (list) => {
            const rs = list.map((t) => t.el.getBoundingClientRect());
            return { top: Math.min(...rs.map((r) => r.top)), bottom: Math.max(...rs.map((r) => r.bottom)) };
        };
        const topbar = qs(".topbar");
        const stickyTop = topbar && isVisible(topbar) && getComputedStyle(topbar).position === "sticky" ? topbar.getBoundingClientRect().height : 0;
        const panelH = S.panel.classList.contains("sa-coach--card") ? 0 : S.panel.getBoundingClientRect().height;
        const top = stickyTop + 14;
        const bottom = window.innerHeight - panelH - 14;
        let r = rect(all);
        if (r.bottom - r.top > bottom - top && strong.length) r = rect(strong);
        let delta = 0;
        if (r.top < top) delta = r.top - top;
        else if (r.bottom > bottom) delta = Math.min(r.bottom - bottom, r.top - top);
        if (Math.abs(delta) > 4) window.scrollBy({ top: delta, behavior: reduceMotion() ? "auto" : "smooth" });
    }

    /* ----------------------------------------------------------------------
     * Main loop
     * -------------------------------------------------------------------- */
    function tick() {
        if (!S.active || !S.panel) return;
        const step = stepOf();

        // Home-screen dialog: pre-fill the model name and type for the learner.
        const dialog = byId("newModelModal");
        const dialogOpen = !!dialog && !dialog.hidden;
        if (!dialogOpen) S.dialogFilled = false;
        if (dialogOpen && step.createModel && !S.dialogFilled) {
            const name = byId("newModelNameInput");
            if (name) name.value = S.modelName;
            const radio = dialog.querySelector('input[name="newModelAnalysisMode"][value="' + S.def.mode + '"]');
            if (radio) radio.checked = true;
            S.dialogFilled = true;
        }

        // Latch "model created" once the workspace is a fresh model of the right type.
        if (!S.modelCreated && step.createModel && activeSection() !== "home" && !dialogOpen &&
            model.analysisMode === S.def.mode && !model.nodes.length && !model.elements.length) {
            S.modelCreated = true;
        }

        const ev = evaluateStep(step);

        // Pre-fill the form with the next missing item (on entering, and after every creation).
        if (step.task && !ev.nav && S.modelCreated && !S.confirmExit && activeSection() !== "home") {
            const okCount = ev.items.filter((x) => x.status === "ok").length;
            const key = step.id + ":" + okCount;
            if (key !== S.prefillKey) {
                S.prefillKey = key;
                if (okCount < ev.items.length) prefillNext(step);
            }
        }

        if (typeof step.onTick === "function") {
            try { step.onTick(S, ev); } catch (e) { console.error(e); }
        }

        // Panel sits left of nothing on Home (no sidebar) and next to the sidebar elsewhere.
        const sidebar = qs(".sidebar");
        const sidebarShown = window.innerWidth > 800 && isVisible(sidebar);
        S.panel.classList.toggle("sa-coach--full", !sidebarShown);

        const targets = S.confirmExit ? [] : resolveTargets(step, ev);
        const sig = targets.map((t) => (t.el.id || t.el.className) + t.style).join("|");
        if (sig !== S.targetSig) { S.targetSig = sig; S.needScroll = true; }
        currentTargets = targets;
        if (ev.nav !== S.lastNav) { S.lastNav = ev.nav; S.needScroll = true; }

        render(ev);

        if (S.needScroll && targets.length) {
            S.needScroll = false;
            window.setTimeout(() => { if (S.active) scrollToTargets(); }, 120);
        }
    }

    /* ----------------------------------------------------------------------
     * Navigation between steps
     * -------------------------------------------------------------------- */
    function enterStep() {
        const step = stepOf();
        S.message = "";
        S.prefillKey = "";
        S.renderKey = "";
        S.targetSig = "";
        S.minimized = false;
        S.confirmExit = false;
        S.needScroll = true;
        if (step.section && !step.nav && (S.modelCreated || step.section === "home")) showSection(step.section);
        if (step.id === S.def.steps[0].id && !S.modelCreated) showSection("home");
        if (typeof step.onEnter === "function") {
            try { step.onEnter(S); } catch (e) { console.error(e); }
        }
        window.scrollTo({ top: 0 });
        tick();
    }

    function gotoStep(index) {
        if (index < 0 || index >= S.def.steps.length) return;
        // Leaving a half-built form: put the app forms back to a clean state.
        S.idx = index;
        enterStep();
    }

    function nextStep() {
        if (S.idx >= S.def.steps.length - 1) { finish(); return; }
        const step = stepOf();
        const ev = evaluateStep(step);
        const interactive = !!(step.task || step.isDone);
        if (interactive && !ev.done) return;
        gotoStep(S.idx + 1);
    }

    function finish() {
        markCompleted(S.def.id);
        if (S.modelCreated && typeof hasModelInputData === "function" && hasModelInputData() && !currentModelLibraryId) {
            saveCurrentModelToLibrary(true);
        }
        stop(false);
        refreshHomeCards();
    }

    /* ----------------------------------------------------------------------
     * Start / stop
     * -------------------------------------------------------------------- */
    function start(id) {
        const def = registry.find((d) => d.id === id);
        if (!def || S.active) return false;
        closeChooser();

        const library = typeof getModelLibrary === "function" ? getModelLibrary() : {};
        S.def = def;
        S.idx = 0;
        S.modelCreated = false;
        S.latched = {};
        S.message = "";
        S.modelName = typeof getAvailableModelName === "function" ? getAvailableModelName(def.modelName, library) : def.modelName;
        S.active = true;

        buildPanel();
        addListeners();
        S.timer = window.setInterval(tick, POLL_MS);
        S.raf = requestAnimationFrame(drawRings);
        enterStep();
        return true;
    }

    function stop(discardModel) {
        if (!S.active) return;
        const modelWasCreated = S.modelCreated;
        S.active = false;
        window.clearInterval(S.timer);
        cancelAnimationFrame(S.raf);
        removeListeners();
        destroyPanel();
        currentTargets = [];

        if (discardModel && modelWasCreated) {
            try {
                if (currentModelLibraryId) {
                    const library = getModelLibrary();
                    delete library[currentModelLibraryId];
                    setModelLibrary(library);
                }
                resetActiveModelAfterSavedModelDeletion();
            } catch (error) {
                console.error("[tutorial] could not remove the tutorial model", error);
            }
        }
        showSection("home");
        if (typeof renderModelLibrary === "function") renderModelLibrary();
        S.def = null;
    }

    function addListeners() {
        const on = (target, type, fn, opts) => {
            target.addEventListener(type, fn, opts);
            S.listeners.push([target, type, fn, opts]);
        };
        const soon = () => window.setTimeout(tick, 0);
        on(document, "click", soon, true);
        on(document, "change", soon, true);
        on(document, "submit", soon);
        on(window, "resize", () => { S.renderKey = ""; soon(); });
    }

    function removeListeners() {
        S.listeners.forEach(([target, type, fn, opts]) => target.removeEventListener(type, fn, opts));
        S.listeners = [];
    }

    /* ----------------------------------------------------------------------
     * Tutorial cards, chooser dialog, Home block, floating button
     * -------------------------------------------------------------------- */
    function cardHTML(def) {
        const done = !!completedMap()[def.id];
        const learn = (def.learn || []).map((t) => `<li>${t}</li>`).join("");
        return `<article class="sa-card">
            <div class="sa-card-top"><h4>${esc(def.title)}</h4>
                <span class="sa-chip">${esc(def.duration)}</span>
                ${done ? '<span class="sa-chip green">✔ Completed</span>' : ""}</div>
            <p>${def.summary}</p>
            ${learn ? `<ul>${learn}</ul>` : ""}
            <div class="sa-card-actions"><button type="button" class="btn btn-primary" data-sa-start="${esc(def.id)}">${done ? "Start again" : "Start tutorial"}</button></div>
        </article>`;
    }

    function ensureChooser() {
        let box = byId("saChooser");
        if (box) return box;
        box = document.createElement("div");
        box.id = "saChooser";
        box.className = "sa-chooser";
        box.hidden = true;
        box.innerHTML = `<div class="sa-chooser-box" role="dialog" aria-modal="true" aria-labelledby="saChooserTitle">
            <div class="sa-chooser-top"><div><h2 id="saChooserTitle"></h2><p id="saChooserSub"></p></div>
            <button type="button" class="sa-chooser-close" data-sa-close aria-label="Close">✕</button></div>
            <div class="sa-chooser-cards" id="saChooserCards"></div>
            <div class="sa-chooser-foot"><button type="button" class="btn btn-secondary" data-sa-close>Maybe later</button></div>
        </div>`;
        box.addEventListener("click", (e) => { if (e.target === box) closeChooser(); });
        document.body.appendChild(box);
        return box;
    }

    function openChooser(welcome) {
        if (S.active) return;
        const box = ensureChooser();
        byId("saChooserTitle").textContent = welcome ? "Welcome to Structure Analysis" : "Learn the software";
        byId("saChooserSub").textContent = welcome
            ? "New here? Pick a short hands-on tutorial. You will build a real model step by step, and the program shows you exactly what to click."
            : "Hands-on tutorials: you build a real model step by step while the program shows you where to click.";
        byId("saChooserCards").innerHTML = registry.map(cardHTML).join("");
        box.hidden = false;
    }

    function closeChooser() {
        const box = byId("saChooser");
        if (box) box.hidden = true;
    }

    function mountHomeBlock() {
        const anchor = qs("#home .home-standalone-title");
        if (!anchor || byId("saHomeBlock")) return;
        anchor.insertAdjacentHTML("beforebegin", `<div class="sa-home-block" id="saHomeBlock">
            <div class="sa-home-block-head"><h3>New to the software? Start here</h3>
            <p>Two guided tutorials teach every tab by building a real model with you.</p></div>
            <div class="sa-home-cards" id="saHomeCards"></div></div>`);
        refreshHomeCards();
    }

    function refreshHomeCards() {
        const host = byId("saHomeCards");
        if (host) host.innerHTML = registry.map(cardHTML).join("");
    }

    function mountEntryPoints() {
        if (!byId("saFab")) {
            const fab = document.createElement("button");
            fab.id = "saFab";
            fab.type = "button";
            fab.className = "sa-fab";
            fab.setAttribute("aria-label", "Open the tutorials");
            fab.innerHTML = '<span class="sa-fab-icon" aria-hidden="true">?</span><span class="sa-fab-label">Tutorials</span>';
            fab.addEventListener("click", () => openChooser(false));
            document.body.appendChild(fab);
        }
        const bottom = qs(".sidebar-bottom");
        if (bottom && !byId("saSidebarBtn")) {
            const b = document.createElement("button");
            b.id = "saSidebarBtn";
            b.type = "button";
            b.className = "sidebar-btn";
            b.textContent = "Tutorials";
            b.addEventListener("click", () => openChooser(false));
            bottom.appendChild(b);
        }
    }

    function boot() {
        mountHomeBlock();
        mountEntryPoints();

        document.addEventListener("click", (event) => {
            const startBtn = event.target.closest("[data-sa-start]");
            if (startBtn) { start(startBtn.getAttribute("data-sa-start")); return; }
            if (event.target.closest("[data-sa-close]")) closeChooser();
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeChooser();
        });

        // First visit with an empty library: offer the tutorials once (never forced).
        const offer = () => window.setTimeout(() => {
            if (S.active || !storageUsable() || safeStorageGetItem(KEY_PROMPTED) !== null) return;
            const empty = typeof getModelLibrary === "function" && Object.keys(getModelLibrary()).length === 0 &&
                !(typeof hasModelInputData === "function" && hasModelInputData());
            const modal = byId("newModelModal");
            if (!empty || (modal && !modal.hidden)) return;
            safeStorageSetItem(KEY_PROMPTED, "1");
            openChooser(true);
        }, 600);
        if (document.readyState === "complete") offer();
        else window.addEventListener("load", offer, { once: true });
    }

    window.StructuralTutorial = {
        register: function (def) {
            if (def && def.id && !registry.some((d) => d.id === def.id)) registry.push(def);
            refreshHomeCards();
        },
        start: start,
        stop: function () { stop(false); },
        isActive: function () { return S.active; },
        openChooser: function () { openChooser(false); },
        list: function () { return registry.slice(); },
    };

    // main.js initialises the app on DOMContentLoaded; this runs after it.
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();
