/* ==========================================================================
 * moment.js — Moment page module
 * Moment page — nodal / member moments input and table.
 * Contains this page's markup (injected into .container) and its logic.
 * ========================================================================== */

/* ---- Markup ---- */
mountModuleHTML(".container", "beforeend", `
<!-- MOMENTS -->
<section class="section" id="moments">
    <div class="card">
        <div class="card-header">
            <div><h3 id="momentFormTitle">Create Moment</h3><p id="momentFormDescription">Create a reusable element moment definition. Distance 0 or L places it at a node.</p></div>
        </div>
        <div class="card-body">
            <form id="momentForm">
                <div class="grid grid-3">
                    <div class="field"><label for="momentId" id="momentIdLabel">Moment ID</label><input id="momentId" placeholder="M1" value="M1"></div>
                    <div class="field"><label for="momentCaseSelect" id="momentCaseSelectLabel">Moment Case ID</label><select id="momentCaseSelect"><option value="">Select moment case</option></select></div>
                    <div class="field"><label for="momentType" id="momentTypeLabel">Moment Type</label><select id="momentType" onchange="toggleMomentTarget()"><option value="Element Moment">Element Moment</option><option value="Nodal Moment" id="momentNodalLegacyOption" hidden disabled>Nodal Moment (legacy)</option></select></div>
                </div>
                <div id="nodalMomentTarget" class="restraint-box" style="margin-top:15px; display:none;">
                    <div class="restraint-title" id="nodalMomentTargetTitle">Nodal Moment Target</div>
                    <div class="grid grid-2">
                        <div class="field"><label for="momentNode">Node ID</label><select id="momentNode"><option value="">Select node</option></select></div>
                    </div>
                </div>
                <div id="elementMomentTarget" class="restraint-box" style="margin-top:15px;">
                    <div class="restraint-title" id="elementMomentTargetTitle">Element Moment Target</div>
                    <div class="grid grid-2">
                        <div class="field"><label for="momentElement">Member / Element ID</label><select id="momentElement"><option value="">Select element</option></select></div>
                        <div class="field" id="momentDistanceField" style="display:none;"><label for="momentDistance">Distance from Start Node (a) — 0 = start node, L = end node</label><div class="input-wrap has-unit"><input id="momentDistance" type="text" placeholder="0 (or e.g. L/2)" value="0"><span class="input-unit">m</span></div><div class="length-chip-row"><button type="button" class="length-chip" onclick="setMomentDistanceShortcut('L/4')">L/4</button><button type="button" class="length-chip" onclick="setMomentDistanceShortcut('L/3')">L/3</button><button type="button" class="length-chip" onclick="setMomentDistanceShortcut('L/2')">L/2</button><button type="button" class="length-chip" onclick="setMomentDistanceShortcut('3L/4')">3L/4</button><button type="button" class="length-chip" onclick="setMomentDistanceShortcut('L')">L</button><button type="button" class="scientific-chip" onclick="insertScientificExponent('momentDistance')">e</button></div></div>
                    </div>
                </div>
                <div class="restraint-box" style="margin-top:15px;">
                    <div class="restraint-title" id="momentComponentsTitle">Moment Components</div>
                    <p id="gridTorsionSignNote" style="display:none; color:#64748b; margin:0 0 12px; font-size:0.9em;">Grid torsion signs: My is + up / − down; Mx is + right / − left.</p>
                    <div id="momentComponentsGrid" class="grid grid-3">
                        <div id="momentXField" class="field"><label for="momentX" id="lblMomentX">Mx</label><div class="input-wrap has-unit"><input id="momentX" type="text" inputmode="decimal" placeholder="0" value="0"><span class="input-unit">kN·m</span></div><div class="length-chip-row scientific-shortcut-row"><button type="button" class="scientific-chip" onclick="insertScientificExponent('momentX')">e</button></div></div>
                        <div id="momentYField" class="field"><label for="momentY" id="lblMomentY">My</label><div class="input-wrap has-unit"><input id="momentY" type="text" inputmode="decimal" placeholder="0" value="0"><span class="input-unit">kN·m</span></div><div class="length-chip-row scientific-shortcut-row"><button type="button" class="scientific-chip" onclick="insertScientificExponent('momentY')">e</button></div></div>
                        <div id="momentZField" class="field"><label for="momentZ" id="lblMomentZ">Mz (Rotation)</label><div class="input-wrap has-unit"><input id="momentZ" type="text" inputmode="decimal" placeholder="0" value="0"><span class="input-unit">kN·m</span></div><div class="length-chip-row scientific-shortcut-row"><button type="button" class="scientific-chip" onclick="insertScientificExponent('momentZ')">e</button></div></div>
                    </div>
                </div>
                <div class="form-footer">
                    <button type="button" class="btn btn-secondary" onclick="resetMomentForm()">Reset</button>
                    <button id="momentSubmitBtn" type="submit" class="btn btn-primary">Create Moment</button>
                </div>
            </form>
        </div>
    </div>

    <div class="card">
        <div class="card-header"><h3 id="momentTableTitle">Moments</h3></div>
        <div class="card-body">
            <div class="table-wrap">
                <table>
                    <thead id="momentTableHead"><tr><th>Moment ID</th><th>Moment Case</th><th>Type</th><th>Target</th><th>Mx (kN·m)</th><th>My (kN·m)</th><th>Mz (kN·m)</th><th>Actions</th></tr></thead>
                    <tbody id="momentTable"></tbody>
                </table>
            </div>
        </div>
    </div>
</section>
`);

/* ---- Logic ---- */
// ---- Moments ----
// Same idea as setLoadDistanceShortcut, but for the Element Moment
// "Distance from Start Node (a)" field.
function setMomentDistanceShortcut(formula) {
    document.getElementById("momentDistance").value = formula;
}

function toggleMomentTarget() {
    const type = val("momentType");
    document.getElementById("nodalMomentTarget").style.display =
        type === "Nodal Moment" ? "block" : "none";
    document.getElementById("elementMomentTarget").style.display =
        type === "Element Moment" ? "block" : "none";
    document.getElementById("momentDistanceField").style.display =
        type === "Element Moment" ? "flex" : "none";
    syncMomentInputModeUI();
    if (typeof syncAnalysisModeUI === "function") syncAnalysisModeUI();
}

// Grid torsions share the solver's existing Mx/My data fields and internal
// nodal/element moment types, while presenting only the two Grid DOF directions.
function syncMomentInputModeUI() {
    const gridMode = typeof isGridAnalysisMode === "function" && isGridAnalysisMode();
    const typeSelect = document.getElementById("momentType");
    if (typeSelect) {
        const nodalOption = Array.from(typeSelect.options).find((option) => option.value === "Nodal Moment");
        const elementOption = Array.from(typeSelect.options).find((option) => option.value === "Element Moment");
        if (nodalOption) nodalOption.textContent = gridMode ? "Nodal Torsion" : "Nodal Moment";
        if (elementOption) elementOption.textContent = gridMode ? "Element Torsion" : "Element Moment";
    }
    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    const setDisplay = (id, display) => { const el = document.getElementById(id); if (el) el.style.display = display; };
    setText("momentFormTitle", gridMode ? "Create Torsion" : "Create Moment");
    setText("momentFormDescription", gridMode ? "Create a reusable element torsion definition. Distance 0 or L places it at a node." : "Create a reusable element moment definition. Distance 0 or L places it at a node.");
    setText("momentIdLabel", gridMode ? "Torsion ID" : "Moment ID");
    setText("momentCaseSelectLabel", gridMode ? "Torsion Case ID" : "Moment Case ID");
    const casePlaceholder = document.querySelector("#momentCaseSelect option[value='']");
    if (casePlaceholder) casePlaceholder.textContent = gridMode ? "Select torsion case" : "Select moment case";
    setText("momentTypeLabel", gridMode ? "Torsion Type" : "Moment Type");
    setText("nodalMomentTargetTitle", gridMode ? "Nodal Torsion Target" : "Nodal Moment Target");
    setText("elementMomentTargetTitle", gridMode ? "Element Torsion Target" : "Element Moment Target");
    setText("momentComponentsTitle", gridMode ? "Torsion Magnitudes" : "Moment Components");
    setText("momentSubmitBtn", editingMomentId !== null ? (gridMode ? "Update Torsion" : "Update Moment") : (gridMode ? "Create Torsion" : "Create Moment"));
    setText("gridTorsionSignNote", "Grid torsion signs: My is + up / − down; Mx is + right / − left.");
    setDisplay("gridTorsionSignNote", gridMode ? "block" : "none");
    setDisplay("momentZField", gridMode ? "none" : "block");
    setDisplay("momentXField", gridMode ? "block" : "none");
    setDisplay("momentYField", gridMode ? "block" : "none");
    const componentGrid = document.getElementById("momentComponentsGrid");
    if (componentGrid) componentGrid.style.gridTemplateColumns = gridMode ? "repeat(2, minmax(0, 1fr))" : "";
    setText("lblMomentX", "Mx — Right / Left (+ right, − left)");
    setText("lblMomentY", "My — Up / Down (+ up, − down)");
    setText("lblMomentZ", "Mz (Rotation)");
    setText("momentTableTitle", gridMode ? "Torsions" : "Moments");
    const tableHead = document.getElementById("momentTableHead");
    if (tableHead) tableHead.innerHTML = gridMode
        ? `<tr><th>Torsion ID</th><th>Torsion Case</th><th>Type</th><th>Target</th><th>Distance (m)</th><th>Mx — Right/Left (kN·m)</th><th>My — Up/Down (kN·m)</th><th>Actions</th></tr>`
        : `<tr><th>Moment ID</th><th>Moment Case</th><th>Type</th><th>Target</th><th>Mx (kN·m)</th><th>My (kN·m)</th><th>Mz (kN·m)</th><th>Actions</th></tr>`;
}

let editingMomentId = null;

function createMoment(data) {
    model.moments.push(data);
    markAnalysisInvalidated();
}

function updateMoment(existingId, data) {
    const moment = model.moments.find((m) => m.id === existingId);
    if (!moment) return false;
    Object.assign(moment, data);
    markAnalysisInvalidated();
    return true;
}

document.getElementById("momentForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const gridMode = typeof isGridAnalysisMode === "function" && isGridAnalysisMode();
    const id = val("momentId");
    if (!id) return alert(gridMode ? "Torsion ID is required." : "Moment ID is required.");
    if (hasId(model.moments, id, editingMomentId)) return alert(gridMode ? "Torsion ID already exists." : "Moment ID already exists.");
    const momentCaseId = val("momentCaseSelect");
    const caseError = requireReference(model.momentCases, momentCaseId, gridMode ? "Torsion Case" : "Moment Case");
    if (caseError) return alert(caseError);
    const type = val("momentType");
    if (!["Nodal Moment", "Element Moment"].includes(type)) return alert(gridMode ? "Invalid torsion type." : "Invalid Moment Type.");
    const Mx = gridMode ? num("momentX") : 0, My = gridMode ? num("momentY") : 0, Mz = gridMode ? 0 : num("momentZ");
    const componentsToValidate = gridMode ? [[Mx, "Mx (Right/Left torsion)"], [My, "My (Up/Down torsion)"]] : [[Mz, "Mz"]];
    for (const [value, label] of componentsToValidate) { const error = requireFinite(value, label); if (error) return alert(error); }
    let nodeId = "", elementId = "", distance = 0;
    if (type === "Nodal Moment") {
        nodeId = val("momentNode");
        const error = requireReference(model.nodes, nodeId, gridMode ? "Torsion Node" : "Moment Node");
        if (error) return alert(error);
    } else {
        elementId = val("momentElement");
        const error = requireReference(model.elements, elementId, gridMode ? "Torsion Element" : "Moment Element");
        if (error) return alert(error);
        const distResult = parseLengthInputStrict(val("momentDistance"), elementId, gridMode ? "Torsion Distance (a)" : "Moment Distance (a)");
        if (!distResult.ok) return alert(distResult.message);
        distance = distResult.value;
        if (distance < 0 || distance > distResult.length) return alert(`${gridMode ? "Torsion" : "Moment"} Distance (a) must satisfy 0 ≤ a ≤ L.`);
    }
    const data = { id, momentCaseId, type, nodeId, elementId, distance, Mx, My, Mz };
    if (editingMomentId !== null) {
        const updated = updateMoment(editingMomentId, data);
        if (!updated) { resetMomentForm(); return; }
    } else {
        createMoment(data);
    }
    resetMomentForm();
    document.getElementById("momentId").value = getNextId(id);
    refreshAll();
});
function resetMomentForm() {
    document.getElementById("momentForm").reset();
    editingMomentId = null;
    document.getElementById("momentSubmitBtn").textContent = "Create Moment";
    toggleMomentTarget();
}
function editMoment(encodedId) {
    const id = decodeURIComponent(encodedId);
    const moment = model.moments.find((m) => m.id === id);
    if (!moment) return;
    editingMomentId = moment.id;
    document.getElementById("momentId").value = moment.id;
    document.getElementById("momentCaseSelect").value = moment.momentCaseId || "";
    document.getElementById("momentType").value = moment.type;
    toggleMomentTarget();
    document.getElementById("momentNode").value = moment.nodeId || "";
    document.getElementById("momentElement").value = moment.elementId || "";
    document.getElementById("momentDistance").value = moment.distance ?? 0;
    document.getElementById("momentX").value = moment.Mx ?? 0;
    document.getElementById("momentY").value = moment.My ?? 0;
    document.getElementById("momentZ").value = moment.Mz ?? 0;
    document.getElementById("momentSubmitBtn").textContent = typeof isGridAnalysisMode === "function" && isGridAnalysisMode() ? "Update Torsion" : "Update Moment";
    syncMomentInputModeUI();
}
function renderMoments() {
    const tbody = document.getElementById("momentTable");
    const gridMode = typeof isGridAnalysisMode === "function" && isGridAnalysisMode();
    syncMomentInputModeUI();
    if (!model.moments.length) return showEmpty("momentTable", 8);
    tbody.innerHTML = model.moments.map((m) => {
        const targetName = m.type === "Nodal Moment" ? `Node ${escapeHtml(m.nodeId)}` : `Element ${escapeHtml(m.elementId)}`;
        const dist = m.type === "Element Moment" ? `${escapeHtml(m.distance)} m` : "-";
        if (gridMode) {
            const typeLabel = m.type === "Nodal Moment" ? "Nodal Torsion" : "Element Torsion";
            return `<tr data-sort-collection="moments" data-sort-id="${escapeHtml(encodeInlineArgument(m.id))}"><td>${sortHandle(m.id)}${escapeHtml(m.id)}</td><td>${escapeHtml(m.momentCaseId)}</td><td><span class="badge badge-orange">${typeLabel}</span></td><td>${targetName}</td><td>${dist}</td><td>${escapeHtml(m.Mx ?? 0)}</td><td>${escapeHtml(m.My ?? 0)}</td><td><div class="table-actions"><button type="button" class="icon-btn" aria-label="Edit moment ${escapeHtml(m.id)}" title="Edit moment ${escapeHtml(m.id)}" onclick="editMoment('${encodeInlineArgument(m.id)}')">✎</button><button type="button" class="icon-btn" aria-label="Delete moment ${escapeHtml(m.id)}" title="Delete moment ${escapeHtml(m.id)}" onclick="deleteItem('moments','${encodeInlineArgument(m.id)}','id')">×</button></div></td></tr>`;
        }
        const target = `${targetName} / dist: ${dist}`;
        return `<tr data-sort-collection="moments" data-sort-id="${escapeHtml(encodeInlineArgument(m.id))}"><td>${sortHandle(m.id)}${escapeHtml(m.id)}</td><td>${escapeHtml(m.momentCaseId)}</td><td><span class="badge badge-orange">${escapeHtml(m.type)}</span></td><td>${target}</td><td>${escapeHtml(m.Mx)}</td><td>${escapeHtml(m.My)}</td><td>${escapeHtml(m.Mz)}</td><td><div class="table-actions"><button type="button" class="icon-btn" aria-label="Edit moment ${escapeHtml(m.id)}" title="Edit moment ${escapeHtml(m.id)}" onclick="editMoment('${encodeInlineArgument(m.id)}')">✎</button><button type="button" class="icon-btn" aria-label="Delete moment ${escapeHtml(m.id)}" title="Delete moment ${escapeHtml(m.id)}" onclick="deleteItem('moments','${encodeInlineArgument(m.id)}','id')">×</button></div></td></tr>`;
    }).join("");
}
