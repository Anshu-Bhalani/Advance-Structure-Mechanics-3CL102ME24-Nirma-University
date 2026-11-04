/* ==========================================================================
 * load.js — Load page module
 * Load page — nodal / member loads input and table.
 * Contains this page's markup (injected into .container) and its logic.
 * ========================================================================== */

/* ---- Markup ---- */
mountModuleHTML(".container", "beforeend", `
<!-- LOADS -->
<section class="section" id="loads">
    <div class="card">
        <div class="card-header">
            <div><h3>Create Load</h3><p>Create a reusable nodal or element force definition.</p></div>
        </div>
        <div class="card-body">
            <form id="loadForm">
                <div class="grid grid-3">
                    <div class="field"><label for="loadId">Load ID</label><input id="loadId" placeholder="L1" value="L1"></div>
                    <div class="field"><label for="loadCaseSelect">Load Case ID</label><select id="loadCaseSelect"><option value="">Select load case</option></select></div>
                    <div class="field"><label for="loadType">Load Type</label><select id="loadType" onchange="toggleLoadTarget()"><option value="Element Point Load">Element Point Load</option><option value="Element UDL">Element UDL</option><option class="plane-only-load-type" value="Uniform Temperature Change">Uniform Temperature Change</option><option class="plane-only-load-type" value="Temperature Gradient">Temperature Gradient</option><option value="Nodal Load" id="loadNodalLegacyOption" hidden disabled>Nodal Load (legacy)</option></select></div>
                </div>
                <div class="restraint-box" id="loadAxisBox" style="margin-top:15px;">
                    <div class="restraint-title">Load Axis & Direction</div>
                    <div class="grid grid-2">
                        <div class="field"><label for="loadAxisSystem">Axis System</label><select id="loadAxisSystem" onchange="toggleLoadAngle()"><option value="Global">Global</option><option value="Local">Local (Elements only)</option><option value="Angled">Angled (from Global X)</option></select></div>
                        <div class="field" id="loadAngleField" style="display:none;"><label for="loadAngle">Angle (θ)</label><div class="input-wrap has-unit"><input id="loadAngle" type="text" inputmode="decimal" placeholder="0" value="0"><span class="input-unit">deg</span></div><div class="length-chip-row scientific-shortcut-row"><button type="button" class="scientific-chip" onclick="insertScientificExponent('loadAngle')">e</button></div></div>
                    </div>
                </div>
                <div id="nodalLoadTarget" class="restraint-box" style="margin-top:15px; display:none;">
                    <div class="restraint-title">Nodal Load Target</div>
                    <div class="grid grid-2">
                        <div class="field"><label for="loadNode">Node ID</label><select id="loadNode"><option value="">Select node</option></select></div>
                    </div>
                </div>
                <div id="elementLoadTarget" class="restraint-box" style="margin-top:15px;">
                    <div class="restraint-title">Element Load Target</div>
                    <div class="grid grid-3">
                        <div class="field"><label for="loadElement">Member / Element ID</label><select id="loadElement"><option value="">Select element</option></select></div>
                        <div class="field" id="loadDistanceField" style="display:none;"><label for="loadDistance" id="lblLoadDist">Start Distance (a)</label><div class="input-wrap has-unit"><input id="loadDistance" type="text" placeholder="0 (or e.g. L/2)" value="0"><span class="input-unit">m</span></div><div class="length-chip-row"><button type="button" class="length-chip" onclick="setLoadDistanceShortcut('L/4')">L/4</button><button type="button" class="length-chip" onclick="setLoadDistanceShortcut('L/3')">L/3</button><button type="button" class="length-chip" onclick="setLoadDistanceShortcut('L/2')">L/2</button><button type="button" class="length-chip" onclick="setLoadDistanceShortcut('3L/4')">3L/4</button><button type="button" class="length-chip" onclick="setLoadDistanceShortcut('L')">L</button><button type="button" class="scientific-chip" onclick="insertScientificExponent('loadDistance')">e</button></div></div>
                        <div class="field" id="loadEndDistanceField" style="display:none;"><label for="loadDistanceEnd">End Distance (b)</label><div class="input-wrap has-unit"><input id="loadDistanceEnd" type="text" placeholder="L (or e.g. 3L/4)" value=""><span class="input-unit">m</span></div><div class="length-chip-row"><button type="button" class="length-chip" onclick="setLoadDistanceEndShortcut('L/4')">L/4</button><button type="button" class="length-chip" onclick="setLoadDistanceEndShortcut('L/3')">L/3</button><button type="button" class="length-chip" onclick="setLoadDistanceEndShortcut('L/2')">L/2</button><button type="button" class="length-chip" onclick="setLoadDistanceEndShortcut('3L/4')">3L/4</button><button type="button" class="length-chip" onclick="setLoadDistanceEndShortcut('L')">L</button><button type="button" class="scientific-chip" onclick="insertScientificExponent('loadDistanceEnd')">e</button></div></div>
                    </div>
                </div>
                <div class="restraint-box" style="margin-top:15px;">
                    <div class="restraint-title" id="loadComponentsTitle">Force Components</div>
                    <p id="gridLoadSignNote" style="display:none; color:#64748b; margin:0 0 12px; font-size:0.9em;">Grid Z load sign: + outside the page / upward; − inside the page / downward.</p>
                    <div id="loadForceComponents" class="grid grid-2">
                        <div id="loadFxField" class="field"><label for="loadFx" id="lblLoadFx">F1 / Fx / Px</label><div class="input-wrap has-unit"><input id="loadFx" type="text" inputmode="decimal" placeholder="0" value="0"><span id="unitLoadFx" class="input-unit">kN</span></div><div class="length-chip-row scientific-shortcut-row"><button type="button" class="scientific-chip" onclick="insertScientificExponent('loadFx')">e</button></div></div>
                        <div id="loadFxEndField" class="field" style="display:none;"><label for="loadFxEnd" id="lblLoadFxEnd">End F1 / Fx / Px</label><div class="input-wrap has-unit"><input id="loadFxEnd" type="text" inputmode="decimal" placeholder="0" value=""><span class="input-unit">kN/m</span></div><div class="length-chip-row scientific-shortcut-row"><button type="button" class="scientific-chip" onclick="insertScientificExponent('loadFxEnd')">e</button></div></div>
                        <div id="loadFyField" class="field"><label for="loadFy" id="lblLoadFy">F2 / Fy / Py</label><div class="input-wrap has-unit"><input id="loadFy" type="text" inputmode="decimal" placeholder="0" value="0"><span id="unitLoadFy" class="input-unit">kN</span></div><div class="length-chip-row scientific-shortcut-row"><button type="button" class="scientific-chip" onclick="insertScientificExponent('loadFy')">e</button></div></div>
                        <div id="loadFyEndField" class="field" style="display:none;"><label for="loadFyEnd" id="lblLoadFyEnd">End F2 / Fy / Py</label><div class="input-wrap has-unit"><input id="loadFyEnd" type="text" inputmode="decimal" placeholder="-10" value=""><span class="input-unit">kN/m</span></div><div class="length-chip-row scientific-shortcut-row"><button type="button" class="scientific-chip" onclick="insertScientificExponent('loadFyEnd')">e</button></div></div>
                        <div id="loadFzField" class="field"><label for="loadFz" id="lblLoadFz">Fz</label><div class="input-wrap has-unit"><input id="loadFz" type="text" inputmode="decimal" placeholder="0" value="0"><span class="input-unit">kN</span></div><div class="length-chip-row scientific-shortcut-row"><button type="button" class="scientific-chip" onclick="insertScientificExponent('loadFz')">e</button></div></div>
                        <div id="loadFzEndField" class="field" style="display:none;"><label for="loadFzEnd" id="lblLoadFzEnd">End Fz</label><div class="input-wrap has-unit"><input id="loadFzEnd" type="text" inputmode="decimal" placeholder="0" value=""><span class="input-unit">kN/m</span></div><div class="length-chip-row scientific-shortcut-row"><button type="button" class="scientific-chip" onclick="insertScientificExponent('loadFzEnd')">e</button></div></div>
                    </div>
                </div>
                <div class="restraint-box" id="loadTemperatureFields" style="display:none; margin-top:15px;">
                    <div class="restraint-title">Temperature Input</div>
                    <div id="temperatureDeltaField" class="field">
                        <label for="loadTemperatureDelta">Uniform Temperature Change (ΔT)</label>
                        <div class="input-wrap has-unit"><input id="loadTemperatureDelta" type="text" inputmode="decimal" placeholder="e.g. 30" value="0"><span class="input-unit">°C</span></div>
                        <p style="color:#64748b; margin:8px 0 0; font-size:0.9em;">Free expansion: ΔL = LαΔT. If restrained, the axial thermal force magnitude is EAαΔT.</p>
                    </div>
                    <div id="temperatureGradientFields" class="grid grid-2" style="display:none;">
                        <div class="field"><label for="loadTemperatureT1">Face 1 Temperature Change (T1)</label><div class="input-wrap has-unit"><input id="loadTemperatureT1" type="text" inputmode="decimal" placeholder="e.g. 30" value="0"><span class="input-unit">°C</span></div></div>
                        <div class="field"><label for="loadTemperatureT2">Face 2 Temperature Change (T2)</label><div class="input-wrap has-unit"><input id="loadTemperatureT2" type="text" inputmode="decimal" placeholder="e.g. 10" value="0"><span class="input-unit">°C</span></div></div>
                    </div>
                    <p style="color:#64748b; margin:10px 0 0; font-size:0.9em;">The selected element template supplies α. Temperature gradients also use its section depth d. Face temperatures are changes from the reference temperature.</p>
                </div>
                <div class="form-footer">
                    <button type="button" class="btn btn-secondary" onclick="resetLoadForm()">Reset</button>
                    <button id="loadSubmitBtn" type="submit" class="btn btn-primary">Create Load</button>
                </div>
            </form>
        </div>
    </div>

    <div class="card">
        <div class="card-header"><h3>Loads</h3></div>
        <div class="card-body">
            <div class="table-wrap">
                <table>
                    <thead id="loadTableHead"><tr><th>Load ID</th><th>Load Case</th><th>Type</th><th>Axis</th><th>Target</th><th>Distance (m)</th><th>F1 / Fx (kN or kN/m)</th><th>F2 / Fy (kN or kN/m)</th><th>Fz (kN or kN/m)</th><th>Actions</th></tr></thead>
                    <tbody id="loadTable"></tbody>
                </table>
            </div>
        </div>
    </div>
</section>
`);

/* ---- Logic ---- */
// ---- Loads ----
function toggleLoadTarget() {
    const type = val("loadType");
    const isThermal = type === "Uniform Temperature Change" || type === "Temperature Gradient";
    const isElementPoint = type === "Element Point Load";
    const isUDL = type === "Element UDL";
    document.getElementById("nodalLoadTarget").style.display = type === "Nodal Load" ? "block" : "none";
    document.getElementById("elementLoadTarget").style.display = isElementPoint || isUDL || isThermal ? "block" : "none";
    document.getElementById("loadDistanceField").style.display = isElementPoint || isUDL ? "flex" : "none";
    document.getElementById("loadEndDistanceField").style.display = isUDL ? "flex" : "none";
    document.getElementById("lblLoadDist").innerText = isUDL ? "Start Distance (a)" : "Distance from Start Node (a) — 0 = start node, L = end node";
    const temperatureFields = document.getElementById("loadTemperatureFields");
    if (temperatureFields) temperatureFields.style.display = isThermal ? "block" : "none";
    const deltaField = document.getElementById("temperatureDeltaField");
    if (deltaField) deltaField.style.display = type === "Uniform Temperature Change" ? "block" : "none";
    const gradientFields = document.getElementById("temperatureGradientFields");
    if (gradientFields) gradientFields.style.display = type === "Temperature Gradient" ? "grid" : "none";
    syncLoadInputModeUI();
    toggleLoadAngle();
    if (typeof syncAnalysisModeUI === "function") syncAnalysisModeUI();
}

// Changes only the Grid load-input presentation. Stored BTF fields and the
// shared solver's internal load types remain compatible with existing models.
function syncLoadInputModeUI() {
    const gridMode = typeof isGridAnalysisMode === "function" && isGridAnalysisMode();
    const typeSelect = document.getElementById("loadType");
    const pointOption = typeSelect && Array.from(typeSelect.options).find((option) => option.value === "Element Point Load");
    if (pointOption) pointOption.textContent = gridMode ? "Point Load" : "Element Point Load";

    const setDisplay = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.style.display = value;
    };
    const type = typeSelect ? typeSelect.value : "Nodal Load";
    const isThermal = type === "Uniform Temperature Change" || type === "Temperature Gradient";
    typeSelect?.querySelectorAll(".plane-only-load-type").forEach((option) => {
        option.hidden = gridMode;
        option.disabled = gridMode;
    });
    setDisplay("loadAxisBox", gridMode || isThermal ? "none" : "block");
    setDisplay("loadForceComponents", isThermal ? "none" : "grid");
    setDisplay("loadFxField", gridMode || isThermal ? "none" : "block");
    setDisplay("loadFyField", gridMode || isThermal ? "none" : "block");
    const isUDLType = type === "Element UDL";
    setDisplay("loadFxEndField", gridMode || isThermal || !isUDLType ? "none" : "block");
    setDisplay("loadFyEndField", gridMode || isThermal || !isUDLType ? "none" : "block");
    setDisplay("loadFzField", gridMode && !isThermal ? "block" : "none");
    setDisplay("loadFzEndField", gridMode && !isThermal && isUDLType ? "block" : "none");
    setDisplay("gridLoadSignNote", gridMode ? "block" : "none");


    const title = document.getElementById("loadComponentsTitle");
    if (title) title.textContent = gridMode ? "Grid Load Magnitude (Fz)" : "Force Components";
    const isUDL = type === "Element UDL";
    const fx = document.getElementById("lblLoadFx");
    const fy = document.getElementById("lblLoadFy");
    const fz = document.getElementById("lblLoadFz");
    const fxEnd = document.getElementById("lblLoadFxEnd");
    const fyEnd = document.getElementById("lblLoadFyEnd");
    const fzEnd = document.getElementById("lblLoadFzEnd");
    if (fx) fx.textContent = isUDL ? "Start F1" : "F1 / Fx / Px";
    if (fy) fy.textContent = isUDL ? "Start F2" : "F2 / Fy / Py";
    if (fz) fz.textContent = isUDL ? "Start Fz" : "Fz";
    if (fxEnd) fxEnd.textContent = "End F1 / Fx / Px";
    if (fyEnd) fyEnd.textContent = "End F2 / Fy / Py";
    if (fzEnd) fzEnd.textContent = "End Fz";
    const ux = document.getElementById("unitLoadFx");
    const uy = document.getElementById("unitLoadFy");
    if (ux) ux.textContent = isUDL ? "kN/m" : "kN";
    if (uy) uy.textContent = isUDL ? "kN/m" : "kN";
    const uz = document.getElementById("unitLoadFz");
    if (uz) uz.textContent = isUDL ? "kN/m" : "kN";
    const fzEndUnit = document.querySelector("#loadFzEndField .input-unit");
    if (fzEndUnit) fzEndUnit.textContent = "kN/m";

    const targetTitle = document.querySelector("#nodalLoadTarget .restraint-title");
    if (targetTitle) targetTitle.textContent = gridMode ? "Nodal Load Target" : "Nodal Load Target";
    const elementTitle = document.querySelector("#elementLoadTarget .restraint-title");
    if (elementTitle) elementTitle.textContent = gridMode ? "Grid Element Load Target" : "Element Load Target";
}

function toggleLoadAngle() {
    const axisSelect = document.getElementById("loadAxisSystem");
    const type = val("loadType");
    if (typeof isGridAnalysisMode === "function" && isGridAnalysisMode()) {
        document.getElementById("loadAngleField").style.display = "none";
        return;
    }
    const axis = val("loadAxisSystem");
    document.getElementById("loadAngleField").style.display = axis === "Angled" ? "flex" : "none";
    if (axis === "Local" && type === "Nodal Load") {
        alert("Local axis is only available for Element loads. Reverting to Global.");
        document.getElementById("loadAxisSystem").value = "Global";
    }
}

// Fills the Distance (a) field with a fractional-length formula (e.g. "L/2")
// so mobile users aren't forced to type "L" on a numeric-only keypad.
function setLoadDistanceShortcut(formula) {
    document.getElementById("loadDistance").value = formula;
}

// Same idea as setLoadDistanceShortcut, but for the UDL "End Distance (b)"
// field so it can also be filled with a fractional-length formula (e.g. "L/2").
function setLoadDistanceEndShortcut(formula) {
    document.getElementById("loadDistanceEnd").value = formula;
}

let editingLoadId = null;

function createLoad(data) {
    model.loads.push(data);
    markAnalysisInvalidated();
}

function updateLoad(existingId, data) {
    const load = model.loads.find((l) => l.id === existingId);
    if (!load) return false;
    // Remove any prior thermal-input fields when a load is edited to a
    // different type, so switching load types cannot preserve stale values.
    ["temperatureDelta", "temperatureT1", "temperatureT2"].forEach((key) => delete load[key]);
    Object.assign(load, data);
    markAnalysisInvalidated();
    return true;
}

document.getElementById("loadForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = val("loadId");
    if (!id) return alert("Load ID is required.");
    if (hasId(model.loads, id, editingLoadId)) return alert("Load ID already exists.");
    const loadCaseId = val("loadCaseSelect");
    const caseError = requireReference(model.loadCases, loadCaseId, "Load Case");
    if (caseError) return alert(caseError);
    const type = val("loadType");
    const gridMode = typeof isGridAnalysisMode === "function" && isGridAnalysisMode();
    const temperatureLoad = type === "Uniform Temperature Change" || type === "Temperature Gradient";
    if (temperatureLoad) {
        if (gridMode) return alert("Temperature loads are supported only in Beam / Truss / Frame models.");
        const elementId = val("loadElement");
        let error = requireReference(model.elements, elementId, "Load Element");
        if (error) return alert(error);
        const element = model.elements.find((item) => item.id === elementId);
        const template = model.elementTemplates.find((item) => item.id === element.templateId);
        const alpha = Number(template?.alpha);
        if (!Number.isFinite(alpha) || alpha <= 0) return alert("Enter a positive thermal expansion coefficient α in the element template first.");
        let data;
        if (type === "Uniform Temperature Change") {
            const rawDelta = val("loadTemperatureDelta");
            if (rawDelta === "") return alert("Uniform temperature change ΔT is required.");
            const temperatureDelta = num("loadTemperatureDelta");
            error = requireFinite(temperatureDelta, "Uniform Temperature Change ΔT");
            if (error) return alert(error);
            if (!Number.isFinite(Number(template?.A)) || Number(template.A) <= 0) {
                return alert("Uniform axial thermal effects require a positive cross-sectional area A on the element template.");
            }
            data = { id, loadCaseId, type, elementId, temperatureDelta, axisSystem: "Global", angle: 0 };
        } else {
            const rawT1 = val("loadTemperatureT1"), rawT2 = val("loadTemperatureT2");
            if (rawT1 === "" || rawT2 === "") return alert("Both face temperature changes T1 and T2 are required.");
            const temperatureT1 = num("loadTemperatureT1"), temperatureT2 = num("loadTemperatureT2");
            error = requireFinite(temperatureT1, "Face 1 Temperature Change T1") || requireFinite(temperatureT2, "Face 2 Temperature Change T2");
            if (error) return alert(error);
            if (!(Number(template?.I) > 0)) return alert("Temperature gradients require a member with I > 0; a truss has I = 0 in this solver.");
            if (!(Number(template?.thermalDepth) > 0)) return alert("Enter a positive section depth d in the element template before applying a temperature gradient.");
            data = { id, loadCaseId, type, elementId, temperatureT1, temperatureT2, axisSystem: "Global", angle: 0 };
        }
        if (editingLoadId !== null) {
            const updated = updateLoad(editingLoadId, data);
            if (!updated) { resetLoadForm(); return; }
        } else {
            createLoad(data);
        }
        resetLoadForm();
        document.getElementById("loadId").value = getNextId(id);
        refreshAll();
        return;
    }
    if (!["Nodal Load", "Element Point Load", "Element UDL"].includes(type)) return alert("Invalid Load Type.");
    const axisSystem = gridMode ? "Global" : val("loadAxisSystem");
    // An angle is meaningful only for an Angled load. Do not turn invalid
    // text into zero through `|| 0`; validate the raw parsed value whenever
    // the selected axis system actually uses it.
    const angle = gridMode || axisSystem !== "Angled" ? 0 : num("loadAngle");
    let error = !gridMode && axisSystem === "Angled" ? requireFinite(angle, "Load Angle") : null;
    if (error) return alert(error);
    const Fx = gridMode ? 0 : num("loadFx"), Fy = gridMode ? 0 : num("loadFy"), Fz = gridMode ? num("loadFz") : 0;
    const componentsToValidate = gridMode ? [[Fz, "Fz"]] : [[Fx, "Fx / F1"], [Fy, "Fy / F2"]];
    for (const [value, label] of componentsToValidate) { error = requireFinite(value, label); if (error) return alert(error); }
    let FzEnd = gridMode ? Fz : 0;
    let nodeId = "", elementId = "", distance = 0, distanceEnd = "";
    if (type === "Nodal Load") {
        nodeId = val("loadNode");
        error = requireReference(model.nodes, nodeId, "Load Node");
        if (error) return alert(error);
        if (axisSystem === "Local") return alert("Local axis is only available for Element loads.");
    } else {
        elementId = val("loadElement");
        error = requireReference(model.elements, elementId, "Load Element");
        if (error) return alert(error);
        const distResult = parseLengthInputStrict(val("loadDistance"), elementId, "Start Distance (a)");
        if (!distResult.ok) return alert(distResult.message);
        distance = distResult.value;
        if (distance < 0 || distance > distResult.length) return alert("Start Distance (a) must satisfy 0 ≤ a ≤ L.");
        if (type === "Element UDL") {
            const rawEnd = val("loadDistanceEnd");
            const endResult = rawEnd === "" ? { ok: true, value: distResult.length, length: distResult.length } : parseLengthInputStrict(rawEnd, elementId, "End Distance (b)");
            if (!endResult.ok) return alert(endResult.message);
            distanceEnd = endResult.value;
            if (distanceEnd < 0 || distanceEnd > distResult.length) return alert("End Distance (b) must satisfy 0 ≤ b ≤ L.");
            if (!(distance < distanceEnd)) return alert("UDL interval must satisfy 0 ≤ a < b ≤ L.");
            const FxEnd = gridMode ? 0 : (val("loadFxEnd") === "" ? Fx : num("loadFxEnd"));
            const FyEnd = gridMode ? 0 : (val("loadFyEnd") === "" ? Fy : num("loadFyEnd"));
            FzEnd = gridMode ? (val("loadFzEnd") === "" ? Fz : num("loadFzEnd")) : 0;
            const endComponentsToValidate = gridMode ? [[FzEnd, "End Fz"]] : [[FxEnd, "End Fx / F1"], [FyEnd, "End Fy / F2"]];
            for (const [value, label] of endComponentsToValidate) { error = requireFinite(value, label); if (error) return alert(error); }
        }
    }
    const data = { id, loadCaseId, type, nodeId, elementId, axisSystem, angle, distance, distanceEnd, Fx, Fy, Fz,
        FxEnd: type === "Element UDL" ? (gridMode ? 0 : (val("loadFxEnd") === "" ? Fx : num("loadFxEnd"))) : "",
        FyEnd: type === "Element UDL" ? (gridMode ? 0 : (val("loadFyEnd") === "" ? Fy : num("loadFyEnd"))) : "",
        FzEnd: type === "Element UDL" ? FzEnd : "" };
    if (editingLoadId !== null) {
        const updated = updateLoad(editingLoadId, data);
        if (!updated) { resetLoadForm(); return; }
    } else {
        createLoad(data);
    }
    resetLoadForm();
    document.getElementById("loadId").value = getNextId(id);
    refreshAll();
});
function resetLoadForm() {
    document.getElementById("loadForm").reset();
    editingLoadId = null;
    document.getElementById("loadSubmitBtn").textContent = "Create Load";
    toggleLoadTarget();
}
function editLoad(encodedId) {
    const id = decodeURIComponent(encodedId);
    const load = model.loads.find((l) => l.id === id);
    if (!load) return;
    editingLoadId = load.id;
    document.getElementById("loadId").value = load.id;
    document.getElementById("loadCaseSelect").value = load.loadCaseId || "";
    document.getElementById("loadType").value = load.type;
    document.getElementById("loadAxisSystem").value = load.axisSystem || "Global";
    document.getElementById("loadAngle").value = load.angle ?? 0;
    document.getElementById("loadNode").value = load.nodeId || "";
    document.getElementById("loadElement").value = load.elementId || "";
    document.getElementById("loadDistance").value = load.distance ?? 0;
    document.getElementById("loadDistanceEnd").value = load.distanceEnd ?? "";
    document.getElementById("loadFx").value = load.Fx ?? 0;
    document.getElementById("loadFy").value = load.Fy ?? 0;
    document.getElementById("loadFz").value = load.Fz ?? 0;
    document.getElementById("loadFxEnd").value = load.FxEnd ?? "";
    document.getElementById("loadFyEnd").value = load.FyEnd ?? "";
    document.getElementById("loadFzEnd").value = load.FzEnd ?? "";
    document.getElementById("loadTemperatureDelta").value = load.temperatureDelta ?? 0;
    document.getElementById("loadTemperatureT1").value = load.temperatureT1 ?? 0;
    document.getElementById("loadTemperatureT2").value = load.temperatureT2 ?? 0;
    document.getElementById("loadSubmitBtn").textContent = "Update Load";
    // Re-display the controls associated with the restored type. This is
    // required for thermal edits so the T1/T2 fields are visible again.
    toggleLoadTarget();
}
function renderLoads() {
    const tbody = document.getElementById("loadTable");
    const gridMode = typeof isGridAnalysisMode === "function" && isGridAnalysisMode();
    const thead = document.getElementById("loadTableHead");
    if (thead) {
        thead.innerHTML = gridMode
            ? `<tr><th>Load ID</th><th>Load Case</th><th>Type</th><th>Target</th><th>Distance (m)</th><th>Fz (kN or kN/m)</th><th>Actions</th></tr>`
            : `<tr><th>Load ID</th><th>Load Case</th><th>Type</th><th>Axis</th><th>Target</th><th>Distance (m)</th><th>F1 / Fx (kN or kN/m)</th><th>F2 / Fy (kN or kN/m)</th><th>Fz (kN or kN/m)</th><th>Actions</th></tr>`;
    }
    if (!model.loads.length) return showEmpty("loadTable", gridMode ? 7 : 10);
    tbody.innerHTML = model.loads.map((l) => {
        const target = l.type === "Nodal Load" ? `Node ${escapeHtml(l.nodeId)}` : `Element ${escapeHtml(l.elementId)}`;
        let dist = "-";
        if (l.type === "Element Point Load") dist = `${escapeHtml(l.distance)} m`;
        else if (l.type === "Element UDL") dist = `${escapeHtml(l.distance)}m to ${l.distanceEnd !== undefined && l.distanceEnd !== "" ? escapeHtml(l.distanceEnd) : "L"}m`;
        const typeLabel = gridMode && l.type === "Element Point Load" ? "Point Load" : l.type;
        if (gridMode) {
            const magnitude = l.type === "Element UDL"
                ? `${escapeHtml(l.Fz)} to ${l.FzEnd !== undefined && l.FzEnd !== "" ? escapeHtml(l.FzEnd) : escapeHtml(l.Fz)}`
                : escapeHtml(l.Fz);
            return `<tr data-sort-collection="loads" data-sort-id="${escapeHtml(encodeInlineArgument(l.id))}"><td>${sortHandle(l.id)}${escapeHtml(l.id)}</td><td>${escapeHtml(l.loadCaseId)}</td><td><span class="badge badge-blue">${escapeHtml(typeLabel)}</span></td><td>${target}</td><td>${dist}</td><td>${magnitude}</td><td><div class="table-actions"><button type="button" class="icon-btn" aria-label="Edit load ${escapeHtml(l.id)}" title="Edit load ${escapeHtml(l.id)}" onclick="editLoad('${encodeInlineArgument(l.id)}')">✎</button><button type="button" class="icon-btn" aria-label="Delete load ${escapeHtml(l.id)}" title="Delete load ${escapeHtml(l.id)}" onclick="deleteItem('loads','${encodeInlineArgument(l.id)}','id')">×</button></div></td></tr>`;
        }
        if (l.type === "Uniform Temperature Change" || l.type === "Temperature Gradient") {
            const thermalText = l.type === "Uniform Temperature Change"
                ? `ΔT = ${escapeHtml(l.temperatureDelta)} °C`
                : `T1 = ${escapeHtml(l.temperatureT1)} °C; T2 = ${escapeHtml(l.temperatureT2)} °C`;
            return `<tr data-sort-collection="loads" data-sort-id="${escapeHtml(encodeInlineArgument(l.id))}"><td>${sortHandle(l.id)}${escapeHtml(l.id)}</td><td>${escapeHtml(l.loadCaseId)}</td><td><span class="badge badge-blue">${escapeHtml(l.type)}</span></td><td>—</td><td>${target}</td><td>—</td><td colspan="3">${thermalText}</td><td><div class="table-actions"><button type="button" class="icon-btn" aria-label="Edit load ${escapeHtml(l.id)}" title="Edit load ${escapeHtml(l.id)}" onclick="editLoad('${encodeInlineArgument(l.id)}')">✎</button><button type="button" class="icon-btn" aria-label="Delete load ${escapeHtml(l.id)}" title="Delete load ${escapeHtml(l.id)}" onclick="deleteItem('loads','${encodeInlineArgument(l.id)}','id')">×</button></div></td></tr>`;
        }
        const fxStr = l.type === "Element UDL" ? `${escapeHtml(l.Fx)} to ${l.FxEnd !== undefined && l.FxEnd !== "" ? escapeHtml(l.FxEnd) : escapeHtml(l.Fx)}` : escapeHtml(l.Fx);
        const fyStr = l.type === "Element UDL" ? `${escapeHtml(l.Fy)} to ${l.FyEnd !== undefined && l.FyEnd !== "" ? escapeHtml(l.FyEnd) : escapeHtml(l.Fy)}` : escapeHtml(l.Fy);
        const fzStr = l.type === "Element UDL" ? `${escapeHtml(l.Fz)} to ${l.FzEnd !== undefined && l.FzEnd !== "" ? escapeHtml(l.FzEnd) : escapeHtml(l.Fz)}` : escapeHtml(l.Fz);
        const axisStr = l.axisSystem === "Angled" ? `Angled (${l.angle}º)` : escapeHtml(l.axisSystem || "Global");
        return `<tr data-sort-collection="loads" data-sort-id="${escapeHtml(encodeInlineArgument(l.id))}"><td>${sortHandle(l.id)}${escapeHtml(l.id)}</td><td>${escapeHtml(l.loadCaseId)}</td><td><span class="badge badge-blue">${escapeHtml(l.type)}</span></td><td><span class="badge badge-gray">${axisStr}</span></td><td>${target}</td><td>${dist}</td><td>${fxStr}</td><td>${fyStr}</td><td>${fzStr}</td><td><div class="table-actions"><button type="button" class="icon-btn" aria-label="Edit load ${escapeHtml(l.id)}" title="Edit load ${escapeHtml(l.id)}" onclick="editLoad('${encodeInlineArgument(l.id)}')">✎</button><button type="button" class="icon-btn" aria-label="Delete load ${escapeHtml(l.id)}" title="Delete load ${escapeHtml(l.id)}" onclick="deleteItem('loads','${encodeInlineArgument(l.id)}','id')">×</button></div></td></tr>`;
    }).join("");
}
