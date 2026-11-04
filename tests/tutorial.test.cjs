"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

// Load the two tutorial definition files with a stub engine that just records them.
const definitions = [];
for (const file of ["modules/tutorial/tutorial-beginner.js", "modules/tutorial/tutorial-grid.js"]) {
    const sandbox = { window: { StructuralTutorial: { register: (def) => definitions.push(def) } } };
    vm.runInNewContext(read(file), sandbox, { filename: file });
}

const BUILT_IN_SUPPORTS = ["FIXED", "ROLLER", "HINGED"];
const KINDS = ["nodes", "elementTemplates", "elements", "supportAssignments", "loadCases", "loads", "momentCases", "moments"];

test("the old Driver.js tour is gone and the tutorial files are wired in and precached", () => {
    const index = read("index.html");
    const worker = read("service-worker.js");
    assert.ok(!fs.existsSync(path.join(root, "modules/tour")), "modules/tour must be removed");
    assert.ok(!fs.existsSync(path.join(root, "assets/vendor/driver")), "Driver.js must be removed");
    assert.ok(!/driver|tour\.(js|css)/i.test(index + worker), "no reference to the old tour may remain");
    for (const file of ["tutorial.js", "tutorial-beginner.js", "tutorial-grid.js", "tutorial.css"]) {
        assert.ok(index.includes("modules/tutorial/" + file), file + " must be linked in index.html");
        assert.ok(worker.includes('"modules/tutorial/' + file + '"'), file + " must be precached");
    }
    // The engine must load before the definitions that register with it.
    assert.ok(index.indexOf("tutorial.js") < index.indexOf("tutorial-beginner.js"));
    assert.ok(index.indexOf("tutorial.js") < index.indexOf("tutorial-grid.js"));
});

test("both tutorials are registered with unique ids and the right solver types", () => {
    assert.equal(JSON.stringify(definitions.map((d) => d.id).sort()), JSON.stringify(["beginner", "grid"]));
    assert.equal(definitions.find((d) => d.id === "beginner").mode, "plane");
    assert.equal(definitions.find((d) => d.id === "grid").mode, "grid");
});

for (const def of definitions) {
    test(`${def.id}: model data is self-consistent`, () => {
        const d = def.data;
        const ids = (list) => list.map((x) => x.id);
        for (const kind of KINDS.concat(["supportTemplates"])) {
            assert.ok(Array.isArray(d[kind]), kind + " must be an array");
            assert.equal(new Set(ids(d[kind])).size, d[kind].length, "duplicate ids in " + kind);
        }
        const nodeById = Object.fromEntries(d.nodes.map((n) => [n.id, n]));
        const templateIds = ids(d.elementTemplates);
        const length = {};
        for (const el of d.elements) {
            assert.ok(templateIds.includes(el.templateId), el.id + " uses an unknown template");
            assert.ok(nodeById[el.startNode] && nodeById[el.endNode], el.id + " uses an unknown node");
            length[el.id] = Math.hypot(nodeById[el.endNode].x - nodeById[el.startNode].x, nodeById[el.endNode].y - nodeById[el.startNode].y);
            assert.ok(length[el.id] > 0, el.id + " has zero length");
        }
        for (const sa of d.supportAssignments) {
            assert.ok(BUILT_IN_SUPPORTS.includes(sa.supportId), sa.id + " must use a built-in support");
            assert.ok(nodeById[sa.nodeId], sa.id + " uses an unknown node");
        }
        assert.equal(new Set(d.supportAssignments.map((s) => s.nodeId)).size, d.supportAssignments.length, "one support per node");
        for (const ld of d.loads) {
            assert.ok(ids(d.loadCases).includes(ld.loadCaseId), ld.id + " uses an unknown load case");
            assert.ok(length[ld.elementId], ld.id + " uses an unknown element");
            assert.ok(ld.distance >= 0 && ld.distance <= length[ld.elementId], ld.id + " distance outside the member");
            if (ld.type === "Element UDL") assert.ok(ld.distance < ld.distanceEnd && ld.distanceEnd <= length[ld.elementId]);
        }
        for (const mo of d.moments) {
            assert.ok(ids(d.momentCases).includes(mo.momentCaseId), mo.id + " uses an unknown moment case");
            assert.ok(length[mo.elementId] !== undefined, mo.id + " uses an unknown element");
            assert.ok(mo.distance >= 0 && mo.distance <= length[mo.elementId], mo.id + " distance outside the member");
        }
        assert.ok(d.loadCases.length >= 1 && d.momentCases.length >= 1, "a run needs a load case and a moment case");
    });

    test(`${def.id}: typed-input hints, notes and steps refer to real items`, () => {
        const exists = (key) => {
            const [kind, id] = key.split(".");
            return (def.data[kind] || []).some((x) => x.id === id);
        };
        Object.keys(def.inputs).forEach((key) => assert.ok(exists(key), "input hint for missing item " + key));
        Object.keys(def.notes).forEach((key) => assert.ok(exists(key), "note for missing item " + key));
        const stepIds = def.steps.map((s) => s.id);
        assert.equal(new Set(stepIds).size, stepIds.length, "duplicate step ids");
        assert.ok(stepIds.includes(def.analyseStepId), "analyseStepId must be a step");
        assert.equal(def.steps[0].card, true, "the first step is the welcome card");
        assert.equal(def.steps[def.steps.length - 1].card, true, "the last step is the summary card");
        assert.equal(def.steps.filter((s) => s.createModel).length, 1, "exactly one create-model step");
        def.steps.forEach((s) => {
            assert.ok(s.title && s.body, s.id + " needs a title and a body");
            if (s.task) {
                assert.ok(KINDS.includes(s.task.kind), s.id + " has an unknown task kind");
                assert.ok(def.data[s.task.kind].length > 0, s.id + " task has nothing to create");
            }
        });
        // Every collection of the answer key is built by exactly one step, in the required order.
        const built = def.steps.filter((s) => s.task).map((s) => s.task.kind);
        const expected = KINDS.filter((k) => def.data[k].length);
        assert.equal(JSON.stringify(built), JSON.stringify(expected));
    });
}
