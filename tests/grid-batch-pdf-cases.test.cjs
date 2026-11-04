"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const homeSource = fs.readFileSync(path.join(root, "modules/home/home.js"), "utf8");
const start = homeSource.indexOf("function chooseUnambiguousBatchCases(modelData) {");
const end = homeSource.indexOf("// runAnalysisCore uses a mode-specific success message", start);
assert.notEqual(start, -1, "batch case selector should exist");
assert.notEqual(end, -1, "batch case selector end marker should exist");
const helperSource = homeSource.slice(start, end);
const buildHelpers = new Function(
    "normalizeLegacySelfWeightModel",
    helperSource + "\nreturn { chooseUnambiguousBatchCases, chooseBatchCaseCombinations };"
);
const { chooseBatchCaseCombinations } = buildHelpers((model) => model);

const successStart = homeSource.indexOf("function isBatchAnalysisSuccessMessage(message) {");
const successEnd = homeSource.indexOf("// Loads a model's input data into the working model", successStart);
assert.notEqual(successStart, -1, "silent batch success recognizer should exist");
assert.notEqual(successEnd, -1, "silent batch success recognizer end marker should exist");
const isBatchAnalysisSuccessMessage = new Function(
    homeSource.slice(successStart, successEnd) + "\nreturn isBatchAnalysisSuccessMessage;"
)();

function gridModel() {
    return {
        analysisMode: "grid",
        elements: [{ id: "E1" }, { id: "E2" }],
        loadCases: [
            { id: "LC1", type: "Dead" },
            { id: "LC2", type: "Live" },
            { id: "SW1", type: "Self Weight", memberSelfWeights: { E1: 2, E2: 0 } }
        ],
        loads: [
            { id: "L1", loadCaseId: "LC1" },
            { id: "L2", loadCaseId: "LC2" }
        ],
        momentCases: [{ id: "MC1" }, { id: "MC2" }],
        moments: [
            { id: "M1", momentCaseId: "MC1" },
            { id: "M2", momentCaseId: "MC2" }
        ]
    };
}

test("Grid batch PDF plans every applicable load/torsion case combination", () => {
    const result = chooseBatchCaseCombinations(gridModel());
    assert.equal(result.ok, true);
    assert.equal(result.choices.length, 6);
    assert.deepEqual(result.choices.map(({ loadCaseId, momentCaseId }) => [loadCaseId, momentCaseId]), [
        ["LC1", "MC1"], ["LC1", "MC2"],
        ["LC2", "MC1"], ["LC2", "MC2"],
        ["SW1", "MC1"], ["SW1", "MC2"]
    ]);
});

test("Grid batch PDF does not duplicate a Self Weight case that also has explicit loads", () => {
    const model = gridModel();
    model.loads.push({ id: "L3", loadCaseId: "SW1" });
    const result = chooseBatchCaseCombinations(model);
    assert.equal(result.ok, true);
    assert.equal(result.choices.length, 6);
    assert.equal(result.choices.filter((choice) => choice.loadCaseId === "SW1").length, 2);
});

test("Grid batch PDF keeps the one-case model path to one report", () => {
    const model = gridModel();
    model.loadCases = [{ id: "LC1", type: "Dead", memberSelfWeights: {} }];
    model.loads = [{ id: "L1", loadCaseId: "LC1" }];
    model.momentCases = [{ id: "MC1" }];
    model.moments = [{ id: "M1", momentCaseId: "MC1" }];
    const result = chooseBatchCaseCombinations(model);
    assert.equal(result.ok, true);
    assert.deepEqual(result.choices.map(({ loadCaseId, momentCaseId }) => [loadCaseId, momentCaseId]), [["LC1", "MC1"]]);
});

test("Plane-model batch PDF preserves the existing ambiguity safeguard", () => {
    const model = gridModel();
    model.analysisMode = "plane";
    const result = chooseBatchCaseCombinations(model);
    assert.equal(result.ok, false);
    assert.match(result.message, /cannot safely guess between multiple load cases/);
});

test("Grid batch PDF includes applicable self-weight when there are no explicit loads", () => {
    const model = gridModel();
    model.loads = [];
    model.loadCases = [
        { id: "LC1", type: "Dead" },
        { id: "SW1", type: "Self Weight", memberSelfWeights: { E1: 2, E2: 0 } }
    ];
    model.moments = [];
    const result = chooseBatchCaseCombinations(model);
    assert.equal(result.ok, true);
    assert.deepEqual(result.choices.map(({ loadCaseId, momentCaseId }) => [loadCaseId, momentCaseId]), [["SW1", ""]]);
});

test("silent batch export recognizes both plane and Grid success messages", () => {
    assert.equal(isBatchAnalysisSuccessMessage("Analysis completed successfully using the LPW-3 Stiffness Method approach."), true);
    assert.equal(isBatchAnalysisSuccessMessage("Grid analysis completed successfully using the Grid Stiffness Method."), true);
    assert.equal(isBatchAnalysisSuccessMessage("Analysis results were computed, but the global equilibrium check failed."), false);
});


test("Grid batch PDF refuses to use zero for a Self Weight element that was never configured", () => {
    const model = gridModel();
    model.loadCases = [{ id: "SW1", type: "Self Weight", memberSelfWeights: { E1: 2 } }];
    model.loads = [];
    model.moments = [];
    const result = chooseBatchCaseCombinations(model);
    assert.equal(result.ok, false);
    assert.match(result.message, /Self Weight case "SW1".*element "E2"/);
});

test("Plane batch PDF also refuses incomplete per-element Self Weight data", () => {
    const model = gridModel();
    model.analysisMode = "plane";
    model.loadCases = [{ id: "SW1", type: "Self Weight", memberSelfWeights: { E1: 2 } }];
    model.loads = [];
    model.moments = [];
    const result = chooseBatchCaseCombinations(model);
    assert.equal(result.ok, false);
    assert.match(result.message, /Self Weight case "SW1".*element "E2"/);
});

test("Batch PDF flags a missing Self Weight even when all configured weights are zero", () => {
    for (const mode of ["plane", "grid"]) {
        const model = gridModel();
        model.analysisMode = mode;
        model.loadCases = [{ id: "SW1", type: "Self Weight", memberSelfWeights: { E1: 0 } }];
        model.loads = [];
        model.moments = [];
        const result = chooseBatchCaseCombinations(model);
        assert.equal(result.ok, false, mode);
        assert.match(result.message, /Self Weight case "SW1".*element "E2"/);
    }
});
