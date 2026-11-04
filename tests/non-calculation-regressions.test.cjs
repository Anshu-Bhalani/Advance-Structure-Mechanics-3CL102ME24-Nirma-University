"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const mainSource = fs.readFileSync(path.join(root, "assets/js/main.js"), "utf8");
const resultsForDiagramLabelsSource = fs.readFileSync(path.join(root, "modules/results/results.js"), "utf8");
const step3ThermalSource = fs.readFileSync(path.join(root, "modules/results/step-3/step-3.js"), "utf8");
const loadModuleSource = fs.readFileSync(path.join(root, "modules/load/load.js"), "utf8");
const step4Source = fs.readFileSync(path.join(root, "modules/results/step-4/step-4.js"), "utf8");
const diagramsForDiagramLabelsSource = fs.readFileSync(path.join(root, "modules/results/diagrams/diagrams.js"), "utf8");
const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");

function section(source, startMarker, endMarker) {
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker, start);
    assert.notEqual(start, -1, "missing source marker: " + startMarker);
    assert.notEqual(end, -1, "missing end marker: " + endMarker);
    return source.slice(start, end).trim();
}

const builtInSupportTemplates = [
    { id: "FIXED", restraints: { RFx: true, RFy: true, RFz: true, RMx: true, RMy: true, RMz: true }, displacement: { dx: 0, dy: 0, dz: 0, tx: 0, ty: 0, tz: 0 } },
    { id: "ROLLER", restraints: { RFx: false, RFy: true, RFz: false, RMx: false, RMy: false, RMz: false }, displacement: { dx: 0, dy: 0, dz: 0, tx: 0, ty: 0, tz: 0 } },
    { id: "HINGED", restraints: { RFx: true, RFy: true, RFz: false, RMx: false, RMy: false, RMz: false }, displacement: { dx: 0, dy: 0, dz: 0, tx: 0, ty: 0, tz: 0 } }
];

const validatorSource = section(mainSource, "function validatePersistedInputModel(source) {", "\nfunction resetAllEditForms()");
const thermalActionSource = section(step3ThermalSource, "function calculatePlaneThermalFixedEndActions(", "\nfunction renderStep3(");
const calculatePlaneThermalFixedEndActions = new Function("getElementEInternal",
    thermalActionSource + "\nreturn calculatePlaneThermalFixedEndActions;"
)((template) => Number(template.E_kN_m2));
const thermalVectorAssemblySource = section(step3ThermalSource,
    "function assembleThermalEquivalentNodalActions(", "\n// Return the six local fixed-end actions");
const assembleThermalEquivalentNodalActions = new Function("Matrix",
    thermalVectorAssemblySource + "\nreturn assembleThermalEquivalentNodalActions;"
)({
    mul: (A, B) => A.map((row) => [row.reduce((sum, value, index) => sum + value * B[index][0], 0)])
});
const globalLoadAssemblySource = section(step4Source,
    "function assembleGlobalLoadVector(", "\nfunction solveStep4(");
const assembleGlobalLoadVector = new Function("Matrix",
    globalLoadAssemblySource + "\nreturn assembleGlobalLoadVector;"
)({
    add: (A, B) => A.map((row, index) => [row[0] + B[index][0]])
});
const validate = new Function("AppConfig", "normalizeLegacySelfWeightModel", "normalizeLegacySupportMovementAssignments",
    validatorSource + "\nreturn validatePersistedInputModel;"
)({
    persistedModelKeys: ["nodes", "elementTemplates", "elements", "supportTemplates", "supportAssignments", "loadCases", "loads", "momentCases", "moments"],
    builtInSupportTemplates
}, (value) => value, (value) => value);

function baseModel(mode) {
    const grid = mode === "grid";
    return {
        analysisMode: mode || "plane",
        nodes: [{ id: "N1", x: 0, y: 0, z: 0 }, { id: "N2", x: 4, y: 0, z: 0 }],
        elementTemplates: [grid ? { id: "T1", I: 1, E_kN_m2: 1_000_000, G_GPa: 1, J: 1 } : { id: "T1", I: 1, E_kN_m2: 1_000_000, A: 1 }],
        elements: [{ id: "E1", templateId: "T1", startNode: "N1", endNode: "N2" }],
        supportTemplates: [], supportAssignments: [],
        loadCases: [{ id: "LC1", type: "Dead" }], loads: [],
        momentCases: [{ id: "MC1", type: "Dead" }], moments: []
    };
}

test("Plane import accepts blank ignored Mx/My when active Mz is valid", () => {
    const model = baseModel("plane");
    model.moments = [{ id: "M1", momentCaseId: "MC1", type: "Nodal Moment", nodeId: "N1", Mx: "", My: "", Mz: 5 }];
    assert.equal(validate(model), true);
});

test("Grid import still requires active Mx/My components", () => {
    const model = baseModel("grid");
    model.moments = [{ id: "M1", momentCaseId: "MC1", type: "Nodal Moment", nodeId: "N1", Mx: "", My: 5, Mz: 0 }];
    assert.throws(() => validate(model), /Mx must be a finite number/);
});

test("UDL import accepts missing end distance and end intensities using UI defaults", () => {
    const model = baseModel("plane");
    model.loads = [{ id: "L1", loadCaseId: "LC1", type: "Element UDL", elementId: "E1", distance: 1, distanceEnd: "", Fx: 0, Fy: -2 }];
    assert.equal(validate(model), true);
});

test("import rejects numeric references instead of accepting string-coercion matches", () => {
    const model = baseModel("plane");
    model.elements[0].startNode = 1;
    assert.throws(() => validate(model), /References must match an existing string ID exactly/);
});

test("custom supports cannot shadow reserved built-in support IDs", () => {
    const model = baseModel("plane");
    model.supportTemplates = [{
        id: "FIXED", description: "Custom", type: "custom", builtIn: false,
        restraints: { RFx: false, RFy: false, RFz: false, RMx: false, RMy: false, RMz: false },
        displacement: { dx: 0, dy: 0, dz: 0, tx: 0, ty: 0, tz: 0 }
    }];
    assert.throws(() => validate(model), /reserved for a built-in support/);
});

test("import rejects unsafe __proto__ entity IDs", () => {
    const model = baseModel("plane");
    model.nodes[0].id = "__proto__";
    assert.throws(() => validate(model), /reserved ID "__proto__"/);
});

test("malformed saved-library data is preserved and a save is refused", () => {
    const getLibrarySource = section(mainSource, "function getModelLibrary() {", "\nfunction getModelLibraryReadFailureMessage()");
    const readMessageSource = section(mainSource, "function getModelLibraryReadFailureMessage() {", "\nfunction setModelLibrary(");
    const saveSource = section(mainSource, "function saveCurrentModelToLibrary(silent = false) {", "\nfunction saveModel()");
    const harnessCode = [
        "let lastModelLibraryReadFailed = false;",
        "let lastModelLibraryWriteSucceeded = true;",
        "let lastModelSaveStorageFailed = false;",
        "let currentModelLibraryId = '';",
        "const stored = { structuralModels: rawValue };",
        "let writeCount = 0;",
        "const safeStorageGetItem = (key) => Object.prototype.hasOwnProperty.call(stored, key) ? stored[key] : null;",
        "const safeStorageSetItem = (key, value) => { writeCount++; stored[key] = String(value); return true; };",
        "const safeStorageRemoveItem = (key) => { writeCount++; delete stored[key]; return true; };",
        "const normalizeModelLibraryRecords = (source) => ({ library: source, changed: false });",
        "const normalizeLegacySelfWeightModel = (value) => value;",
        "const modelNameKey = (value) => String(value || '').replace(/\\s+/g, '').toLowerCase();",
        "const getPersistedInputModel = () => ({});",
        "const getModelName = () => 'Test Model';",
        "const findDuplicateModel = () => null;",
        "const createModelLibraryId = () => 'test-id';",
        "const setModelLibrary = (value) => { writeCount++; stored.structuralModels = JSON.stringify(value); lastModelLibraryWriteSucceeded = true; return value; };",
        "const renderModelLibrary = () => {};",
        "const alert = () => {};",
        "const console = { warn: () => {} };",
        "const document = { getElementById: () => null };",
        getLibrarySource,
        readMessageSource,
        saveSource,
        "return { save: () => saveCurrentModelToLibrary(true), state: () => ({ readFailed: lastModelLibraryReadFailed, saveFailed: lastModelSaveStorageFailed, writeCount, rawValue: stored.structuralModels }) };"
    ].join("\n");
    const factory = new Function("rawValue", harnessCode);
    const badValues = ["{ definitely not valid JSON", JSON.stringify({ brokenRecord: null })];
    for (const rawBad of badValues) {
        const harness = factory(rawBad);
        assert.equal(harness.save(), false);
        const state = harness.state();
        assert.equal(state.readFailed, true);
        assert.equal(state.saveFailed, true);
        assert.equal(state.writeCount, 0);
        assert.equal(state.rawValue, rawBad);
    }
});

test("application JavaScript files parse", () => {
    const files = ["assets/js/main.js", "modules/home/home.js", "modules/nodes/nodes.js", "modules/elements/elements.js", "modules/load-case/load-case.js", "modules/load/load.js", "modules/moment-case/moment-case.js", "modules/moment/moment.js", "modules/results/results.js", "modules/results/diagrams/diagrams.js"];
    for (const relativePath of files) {
        const source = fs.readFileSync(path.join(root, relativePath), "utf8");
        assert.doesNotThrow(() => new Function(source), relativePath + " should parse");
    }
});


test("import rejects nodes that share the same X/Y coordinates", () => {
    const model = baseModel("plane");
    model.nodes.push({ id: "N3", x: 4, y: 0, z: 0 });
    assert.throws(() => validate(model), /share the same X\/Y coordinates/);
});

test("next ID preserves the existing numeric suffix width", () => {
    const nextIdSource = section(mainSource, "function getNextId(currentId) {", "\nfunction val(");
    const getNextId = new Function(nextIdSource + "\nreturn getNextId;")();
    assert.equal(getNextId("N09"), "N10");
    assert.equal(getNextId("N009"), "N010");
    assert.equal(getNextId("E99"), "E100");
});

test("live node validation rejects duplicate coordinates while allowing the edited node's own coordinates", () => {
    const nodeValidationSource = section(mainSource, "function validateNodeInput(id, x, y, z, editingId = null) {", "\n// ==========================================================================\n// 4. MATRIX ALGEBRA UTILITIES");
    const model = { nodes: [{ id: "N1", x: 0, y: 0 }, { id: "N2", x: 4, y: 0 }] };
    const hasId = (items, id, editingId = null) => items.some((item) => item.id === id && item.id !== editingId);
    const requireFinite = (value, label) => Number.isFinite(Number(value)) ? null : `${label} must be finite.`;
    const validateNodeInput = new Function("model", "hasId", "requireFinite", nodeValidationSource + "\nreturn validateNodeInput;")(model, hasId, requireFinite);
    assert.match(validateNodeInput("N3", 4, 0, 0), /unique X\/Y coordinates/);
    assert.equal(validateNodeInput("N2", 4, 0, 0, "N2"), null);
});

test("moving a node cannot leave point loads, UDLs, or member moments outside the new element length", () => {
    const nodesSource = fs.readFileSync(path.join(root, "modules/nodes/nodes.js"), "utf8");
    const movementSource = section(nodesSource, "function findNodeMoveDistanceViolation(nodeId, x, y) {", "\nfunction updateNode(");
    const model = {
        nodes: [{ id: "N1", x: 0, y: 0 }, { id: "N2", x: 4, y: 0 }],
        elements: [{ id: "E1", startNode: "N1", endNode: "N2" }],
        loads: [{ id: "L1", type: "Element Point Load", elementId: "E1", distance: 3 }],
        moments: []
    };
    const findViolation = new Function("model", movementSource + "\nreturn findNodeMoveDistanceViolation;")(model);
    assert.match(findViolation("N2", 2, 0), /load "L1"/);
    assert.equal(findViolation("N2", 5, 0), null);
    model.loads = [{ id: "L2", type: "Element UDL", elementId: "E1", distance: 1, distanceEnd: 3.5 }];
    assert.match(findViolation("N2", 3, 0), /UDL "L2"/);
    model.loads = [];
    model.moments = [{ id: "M1", type: "Element Moment", elementId: "E1", distance: 3.5 }];
    assert.match(findViolation("N2", 3, 0), /moment\/torsion "M1"/);
});

test("missing self-weight values are detected; explicitly entered zero is valid", () => {
    const helperSource = section(mainSource, "function getMissingSelfWeightElement(loadCase, elements = model.elements) {", "\nfunction getModelName()");
    const model = { elements: [{ id: "E1" }, { id: "E2" }] };
    const getMissing = new Function("model", helperSource + "\nreturn getMissingSelfWeightElement;")(model);
    const loadCase = { id: "SW1", type: "Self Weight", memberSelfWeights: { E1: 2 } };
    assert.equal(getMissing(loadCase).id, "E2");
    loadCase.memberSelfWeights.E2 = 0;
    assert.equal(getMissing(loadCase), null);
    assert.equal(getMissing({ type: "Dead", memberSelfWeights: {} }), null);
});

test("changing a Self Weight load case to another type clears stale member weights", () => {
    const loadCaseSource = fs.readFileSync(path.join(root, "modules/load-case/load-case.js"), "utf8");
    const updateSource = section(loadCaseSource, "function updateLoadCase(existingId, data) {", "\ndocument.getElementById(\"loadCaseForm\")");
    const loadCase = { id: "SW1", type: "Self Weight", description: "Weights", memberSelfWeights: { E1: 3 } };
    const model = { loadCases: [loadCase], loads: [] };
    let activeLoadCaseId = "SW1";
    let invalidated = false;
    const update = new Function("model", "activeLoadCaseId", "markAnalysisInvalidated", updateSource + "\nreturn updateLoadCase;")(
        model,
        activeLoadCaseId,
        () => { invalidated = true; }
    );
    assert.equal(update("SW1", { id: "LC1", type: "Dead", description: "Dead loads" }), true);
    assert.equal(Object.prototype.hasOwnProperty.call(loadCase, "memberSelfWeights"), false);
    assert.equal(model.loadCases[0].id, "LC1");
    assert.equal(invalidated, true);
});

test("navigation no longer rerenders every model table and diagram", () => {
    const switchSource = section(mainSource, "function switchSection(id, btnEl) {", "\nfunction goHome()");
    assert.doesNotMatch(switchSource, /refreshAll\s*\(/);
});

test("Clear Model resets analysis mode and item deletion resets the matching edit form", () => {
    const clearSource = section(mainSource, "function clearModel() {", "\n// ==========================================================================\n// 7. NAVIGATION");
    assert.match(clearSource, /model\.analysisMode\s*=\s*"plane"/);
    const deleteSource = section(mainSource, "function deleteItem(collection, encodedValue, property) {", "\nfunction refreshAll()");
    for (const identifier of ["editingNodeId", "editingElementTemplateId", "editingElementId", "editingSupportTemplateId", "editingSupportAssignmentId", "editingLoadCaseId", "editingLoadId", "editingMomentCaseId", "editingMomentId"]) {
        assert.match(deleteSource, new RegExp(identifier));
    }
});

test("single-model import offers replacing without saving and does not abort on Cancel", () => {
    const importSource = section(mainSource, "function importModel(event) {", "\nfunction resetActiveModelAfterSavedModelDeletion()");
    assert.match(importSource, /Choose OK to save the current model first, or Cancel to replace it without saving/);
    assert.match(importSource, /if \(saveBeforeReplace\)\s*\{/);
    assert.doesNotMatch(importSource, /if\s*\(!saveBeforeReplace\)\s*return/);
});

test("saving no longer writes a second full-model copy to legacy storage", () => {
    const saveSource = section(mainSource, "function saveCurrentModelToLibrary(silent = false) {", "\nfunction saveModel()");
    assert.doesNotMatch(saveSource, /safeStorageSetItem\("structuralInputModel"/);
    assert.match(saveSource, /safeStorageRemoveItem\("structuralInputModel"\)/);
    assert.match(saveSource, /lastModelLibraryWriteSucceeded\s*&&/);
});

test("Plane import ignores blank Fz when the active Fx/Fy values are valid", () => {
    const model = baseModel("plane");
    model.loads = [{ id: "L1", loadCaseId: "LC1", type: "Nodal Load", nodeId: "N1", Fx: 1, Fy: -2, Fz: "" }];
    assert.equal(validate(model), true);
});

test("storage failure is reported as failure and never as a successful save", () => {
    const getLibrarySource = section(mainSource, "function getModelLibrary() {", "\nfunction getModelLibraryReadFailureMessage()");
    const readMessageSource = section(mainSource, "function getModelLibraryReadFailureMessage() {", "\nfunction setModelLibrary(");
    const saveSource = section(mainSource, "function saveCurrentModelToLibrary(silent = false) {", "\nfunction saveModel()");
    const harnessCode = [
        "let lastModelLibraryWriteSucceeded = true;",
        "let lastModelSaveStorageFailed = false;",
        "let lastModelLibraryReadFailed = false;",
        "let currentModelLibraryId = '';",
        "const stored = { structuralModels: '{}' };",
        "const alerts = [];",
        "const safeStorageGetItem = (key) => Object.prototype.hasOwnProperty.call(stored, key) ? stored[key] : null;",
        "const safeStorageSetItem = (key, value) => false;",
        "const safeStorageRemoveItem = (key) => { delete stored[key]; return true; };",
        "const normalizeModelLibraryRecords = (source) => ({ library: source, changed: false });",
        "const normalizeLegacySelfWeightModel = (value) => value;",
        "const modelNameKey = (value) => String(value || '').replace(/\\s+/g, '').toLowerCase();",
        "const getPersistedInputModel = () => ({ nodes: [{ id: 'N1' }] });",
        "const getModelName = () => 'Test Model';",
        "const findDuplicateModel = () => null;",
        "const createModelLibraryId = () => 'test-id';",
        "const setModelLibrary = (value) => { lastModelLibraryWriteSucceeded = safeStorageSetItem('structuralModels', JSON.stringify(value)); return value; };",
        "const getAvailableModelName = (name) => name;",
        "const renderModelLibrary = () => {};",
        "const alert = (message) => alerts.push(String(message));",
        "const console = { warn: () => {} };",
        "const document = { getElementById: () => ({ value: 'Test Model' }) };",
        getLibrarySource,
        readMessageSource,
        saveSource,
        "return { save: () => saveCurrentModelToLibrary(false), state: () => ({ failed: lastModelSaveStorageFailed, alerts, stored }) };"
    ].join("\n");
    const harness = new Function(harnessCode)();
    assert.equal(harness.save(), false);
    const state = harness.state();
    assert.equal(state.failed, true);
    assert.ok(state.alerts.some((message) => /NOT confirmed saved/.test(message)));
    assert.ok(state.alerts.every((message) => !/saved in browser storage/.test(message)));
});


test("Grid My diagram is described as torsion in selectors, legends, and PDF output", () => {
    assert.match(mainSource, /bmd: "Torsion \(My\)"/);
    assert.doesNotMatch(mainSource, /bmd: "Bending Moment \(My\)"/);
    assert.match(mainSource, /afd: "Torsion \(Mx\)", sfd: "Vertical Shear \(Fz\)", bmd: "Torsion \(My\)"/);
    assert.match(mainSource, /bmd: "BMD"/, "the plane-model selector must retain its original label");

    assert.match(resultsForDiagramLabelsSource, /bmd: "Torsion Diagram \(My\)"/);
    assert.match(resultsForDiagramLabelsSource, /Step 8: Grid Torsion \(Mx, My\) and Vertical Shear \(Fz\) Diagrams/);
    assert.match(resultsForDiagramLabelsSource, /bmd: "Bending Moment Diagram \(BMD\)"/, "plane-model PDF naming must remain unchanged");

    assert.match(diagramsForDiagramLabelsSource, /'Grid My torsion diagram'/);
    assert.match(diagramsForDiagramLabelsSource, /'Positive My torsion'/);
    assert.match(diagramsForDiagramLabelsSource, /'Negative My torsion'/);
    assert.match(diagramsForDiagramLabelsSource, /'Grid torsion about Y'/);
    assert.match(diagramsForDiagramLabelsSource, /Mx \/ My — reaction torsions \(kN·m\)/);
});


test("Grid diagram labels refresh at fullscreen open and corrected scripts bypass stale cache", () => {
    const helperSource = section(mainSource, "function syncDiagramModeLabels() {", "\nfunction syncAnalysisModeUI() {");
    const makeSelect = () => ({
        options: ["afd", "sfd", "bmd", "displacement"].map((value) => ({ value, textContent: value }))
    });
    const selects = {
        resultsDiagramMode: makeSelect(),
        fsModeSelect: makeSelect()
    };
    const fakeDocument = { getElementById: (id) => selects[id] || null };

    const syncGridLabels = new Function("isGridAnalysisMode", "document",
        helperSource + "\nreturn syncDiagramModeLabels;"
    )(() => true, fakeDocument);
    syncGridLabels();
    for (const select of Object.values(selects)) {
        assert.equal(select.options.find((option) => option.value === "afd").textContent, "Torsion (Mx)");
        assert.equal(select.options.find((option) => option.value === "sfd").textContent, "Vertical Shear (Fz)");
        assert.equal(select.options.find((option) => option.value === "bmd").textContent, "Torsion (My)");
    }

    const openSource = section(diagramsForDiagramLabelsSource, "function openFullScreen(source) {", "\nfunction changeFSMode(mode) {");
    assert.match(openSource, /syncDiagramModeLabels\(\)/);
    assert.ok(openSource.indexOf("syncDiagramModeLabels()") < openSource.indexOf('getElementById("fsModeSelect").value'));

    const versionByFile = {
        "assets/js/main.js": "v=20261012-temperature-loads-v1",
        "modules/elements/elements.js": "v=20261012-temperature-loads-v1",
        "modules/load/load.js": "v=20261012-temperature-loads-v2-edit-fields",
        "modules/results/step-1/step-1.js": "v=20261012-temperature-loads-v1",
        "modules/results/step-2/step-2.js": "v=20261012-element-E-kn-m2",
        "modules/results/step-3/step-3.js": "v=20261012-thermal-AT-v1",
        "modules/results/step-4/step-4.js": "v=20261012-thermal-AT-v1",
        "modules/results/diagrams/diagrams.js": "v=20261024-highlight-all-diagrams",
        "modules/results/results.js": "v=20261011-grid-my-torsion-refresh"
    };
    for (const [file, version] of Object.entries(versionByFile)) {
        assert.ok(indexSource.includes(file + "?" + version), "missing cache-busted script reference for " + file);
    }
});


test("uniform thermal action uses EA alpha delta-T and Ignore X suppresses it", () => {
    const template = { E_kN_m2: 200_000_000, A: 0.02, I: 0.00008, alpha: 12e-6, thermalDepth: 0.3 };
    const load = { type: "Uniform Temperature Change", temperatureDelta: 30 };
    const actions = calculatePlaneThermalFixedEndActions(template, load, false);
    assert.equal(actions[0], 1440);
    assert.equal(actions[3], -1440);
    assert.deepEqual(actions.slice(1, 3), [0, 0]);
    assert.deepEqual(calculatePlaneThermalFixedEndActions(template, load, true), [0, 0, 0, 0, 0, 0]);
});

test("temperature gradient creates equal-and-opposite fixed-end moments", () => {
    const template = { E_kN_m2: 200_000_000, A: 0.02, I: 0.00008, alpha: 12e-6, thermalDepth: 0.3 };
    const actions = calculatePlaneThermalFixedEndActions(template, {
        type: "Temperature Gradient", temperatureT1: 0, temperatureT2: 30
    }, true);
    assert.ok(Math.abs(actions[2] + 19.2) < 1e-10);
    assert.ok(Math.abs(actions[5] - 19.2) < 1e-10);
    assert.deepEqual([actions[0], actions[1], actions[3], actions[4]], [0, 0, 0, 0]);
});

test("temperature gradient with equal face temperatures produces no thermal moment", () => {
    const template = { E_kN_m2: 200_000_000, I: 0.00008, alpha: 12e-6, thermalDepth: 0.3 };
    const actions = calculatePlaneThermalFixedEndActions(template, {
        type: "Temperature Gradient", temperatureT1: 20, temperatureT2: 20
    }, false);
    assert.equal(Math.abs(actions[2]), 0);
    assert.equal(Math.abs(actions[5]), 0);
});

test("import accepts a valid uniform thermal load on an explicit Beam", () => {
    const model = baseModel("plane");
    model.elementTemplates[0] = { id: "T1", memberType: "beam", I: 1, E_kN_m2: 200_000_000, A: 0.02, alpha: 12e-6, thermalDepth: 0.3 };
    model.loads = [{ id: "TL1", loadCaseId: "LC1", type: "Uniform Temperature Change", elementId: "E1", temperatureDelta: 30 }];
    assert.equal(validate(model), true);
});

test("import rejects thermal loads without a positive expansion coefficient", () => {
    const model = baseModel("plane");
    model.elementTemplates[0] = { id: "T1", memberType: "frame", I: 1, E_kN_m2: 200_000_000, A: 0.02, alpha: 0, thermalDepth: 0.3 };
    model.loads = [{ id: "TL1", loadCaseId: "LC1", type: "Uniform Temperature Change", elementId: "E1", temperatureDelta: 30 }];
    assert.throws(() => validate(model), /alpha must be greater than 0/);
});

test("import accepts a valid temperature gradient and validates section depth", () => {
    const model = baseModel("plane");
    model.elementTemplates[0] = { id: "T1", memberType: "frame", I: 0.00008, E_kN_m2: 200_000_000, A: 0.02, alpha: 12e-6, thermalDepth: 0.3 };
    model.loads = [{ id: "TL1", loadCaseId: "LC1", type: "Temperature Gradient", elementId: "E1", temperatureT1: 30, temperatureT2: 10 }];
    assert.equal(validate(model), true);
    model.elementTemplates[0].thermalDepth = 0;
    assert.throws(() => validate(model), /section depth d must be greater than 0/);
});

test("Grid import rejects plane-member temperature loads", () => {
    const model = baseModel("grid");
    model.loads = [{ id: "TL1", loadCaseId: "LC1", type: "Uniform Temperature Change", elementId: "E1", temperatureDelta: 30 }];
    assert.throws(() => validate(model), /only supported for Beam \/ Truss \/ Frame models/);
});


test("thermal member actions are transformed into a separate global AT vector", () => {
    const template = { E_kN_m2: 200_000_000, A: 0.02, I: 0.00008, alpha: 12e-6, thermalDepth: 0.3 };
    const thermalAML = calculatePlaneThermalFixedEndActions(template, {
        type: "Uniform Temperature Change", temperatureDelta: 30
    }, false);
    const AT = Array.from({ length: 6 }, () => [0]);
    const identity = Array.from({ length: 6 }, (_, row) =>
        Array.from({ length: 6 }, (_, col) => row === col ? 1 : 0));
    const thermalAMS = assembleThermalEquivalentNodalActions(AT, identity, thermalAML.map((value) => [value]), [0, 1, 2, 3, 4, 5]);

    assert.equal(thermalAMS[0][0], 1440);
    assert.equal(thermalAMS[3][0], -1440);
    assert.deepEqual(AT.map((row) => row[0]), [-1440, 0, 0, 1440, 0, 0]);
    // [AT] is a dedicated vector; this assembly helper never mutates [AE].
    assert.match(step3ThermalSource, /return \{ SJ, AE, AJ, AT, html \}/);
    assert.match(step3ThermalSource, /AE\[idxs\[r\]\]\[0\] -= mechanicalAMS\[r\]\[0\]/);
});

test("Step 4 assembles AT exactly once into AC with the mechanical and prescribed vectors", () => {
    const AE = [[1], [2]];
    const AJ = [[3], [4]];
    const AD = [[5], [6]];
    const AT = [[7], [8]];
    const result = assembleGlobalLoadVector(AE, AJ, AD, AT);

    assert.deepEqual(result.physicalAC, [[4], [6]]);
    assert.deepEqual(result.AC, [[16], [20]]);
    assert.match(step4Source, /\[AC\] = \[AE\] \+ \[AJ\] \+ \[AD\] \+ \[AT\]/);
    assert.match(step4Source, /\{ m: AT, t: "\[AT\] \(Thermal Actions\)"/);
});

test("Grid Step 3 supplies a zero AT vector and does not change Grid loading", () => {
    assert.match(step3ThermalSource, /Grid models do not currently accept temperature loads, so \[AT\] is zero/);
    assert.match(step3ThermalSource, /return \{ SJ, AE, AJ, AT: Matrix\.zeros\(AE\.length, 1\), html \}/);
});

test("editing a saved temperature-gradient load restores and reveals both T1/T2 inputs", () => {
    assert.match(loadModuleSource, /id="loadTemperatureT1"/);
    assert.match(loadModuleSource, /id="loadTemperatureT2"/);
    const editSource = section(loadModuleSource, "function editLoad(encodedId) {", "function renderLoads()");
    const restoredType = editSource.indexOf('document.getElementById("loadType").value = load.type;');
    const restoredT1 = editSource.indexOf('document.getElementById("loadTemperatureT1").value = load.temperatureT1 ?? 0;');
    const restoredT2 = editSource.indexOf('document.getElementById("loadTemperatureT2").value = load.temperatureT2 ?? 0;');
    const refreshFields = editSource.indexOf("toggleLoadTarget();");
    assert.ok(restoredType >= 0 && restoredT1 > restoredType && restoredT2 > restoredT1,
        "editLoad should restore load type and both stored face temperatures");
    assert.ok(refreshFields > restoredT2,
        "editLoad must refresh conditional visibility after restoring the thermal inputs");
});



test("element ID labels respect the Element ID checkbox and disappear when all labels are unchecked", () => {
    const labelSource = section(diagramsForDiagramLabelsSource, "function getSelectedElementLabelText(el, n1, n2) {", "\nfunction buildElementPropertiesLegendRows()");
    assert.match(labelSource, /const labelValues = \{ id: String\(el\.id\), \.\.\.values \};/);
    assert.match(labelSource, /filter\(\(key\) => allowed\.includes\(key\) && labelValues\[key\]\)/);
    assert.doesNotMatch(labelSource, /return \[String\(el\.id\), \.\.\.selected\]/);
    assert.match(diagramsForDiagramLabelsSource, /if \(labelText\) \{\s+svg \+= `\<g class="fs-element-property-label"/);
    assert.match(diagramsForDiagramLabelsSource, /if \(labelText\) \{\s+svg \+= `\<g class="grid-member-id"/);
});


test("structural model element labels rotate with member angle and stay upright", () => {
    const modelLabelBlock = section(
        diagramsForDiagramLabelsSource,
        'if (mode === "model" && !isGridAnalysisMode()) {',
        "\n        }\n    });"
    );
    assert.match(modelLabelBlock, /Math\.atan2\(y2 - y1, x2 - x1\)/);
    assert.match(modelLabelBlock, /if \(labelAngle > 90\) labelAngle -= 180;/);
    assert.match(modelLabelBlock, /if \(labelAngle < -90\) labelAngle \+= 180;/);
    assert.match(modelLabelBlock, /transform="rotate\(\$\{labelAngle\.toFixed\(2\)\} \$\{midX\.toFixed\(2\)\} \$\{midY\.toFixed\(2\)\}\)"/);
});


test("member highlight hit targets are present in structural, reaction, displacement, and DOF diagrams", () => {
    const memberLoop = section(diagramsForDiagramLabelsSource, "const isInternalActionMode", "// Support symbols are shown consistently");
    assert.match(memberLoop, /class="sf-member" data-member="\$\{ei\}"/);
    assert.match(memberLoop, /mode === "afd" \|\| mode === "sfd" \|\| mode === "bmd"/);
    assert.match(memberLoop, /data-start="\$\{escapeHtml\(String\(el\.startNode\)\)\}"/);
    assert.match(memberLoop, /data-end="\$\{escapeHtml\(String\(el\.endNode\)\)\}"/);
    const dofStart = diagramsForDiagramLabelsSource.indexOf("function getDoFDiagramSVG");
    assert.notEqual(dofStart, -1, "DOF diagram renderer should exist");
    const dofSource = diagramsForDiagramLabelsSource.slice(dofStart);
    assert.match(dofSource, /class="sf-member" data-member="\$\{index\}"/);
    const focusSource = section(diagramsForDiagramLabelsSource, "function applyMemberFocus(root) {", "function handleMemberFocusTap(target)");
    assert.match(focusSource, /svg\.querySelector\("\.sf-member"\)/);
});
