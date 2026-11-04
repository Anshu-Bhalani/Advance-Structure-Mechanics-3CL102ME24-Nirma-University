/* ==========================================================================
 * dashboard.js — Dashboard page module
 * Dashboard page — summary statistics of the current model.
 * Contains this page's markup (injected into .container) and its logic.
 * ========================================================================== */

/* ---- Markup ---- */
mountModuleHTML(".container", "beforeend", `
<!-- DASHBOARD -->
<section class="section" id="dashboard">
    <div class="stat-grid">
        <div class="stat"><div class="stat-label">NODES</div><div class="stat-value" id="statNodes">0</div></div>
        <div class="stat"><div class="stat-label">ELEMENTS</div><div class="stat-value" id="statElements">0</div></div>
        <div class="stat"><div class="stat-label">SUPPORTS</div><div class="stat-value" id="statSupports">0</div></div>
        <div class="stat"><div class="stat-label">LOADS</div><div class="stat-value" id="statLoads">0</div></div>
        <div class="stat"><div class="stat-label" id="statMomentsLabel">MOMENTS</div><div class="stat-value" id="statMoments">0</div></div>
    </div>

    <div class="card">
        <div class="card-header">
            <div>
                <h3>Input Model Workflow</h3>
                <p>Define the model in the following order.</p>
            </div>
        </div>
        <div class="card-body">
            <div class="model-note">
                <strong>Recommended input sequence:</strong><br><br>
                1. Create Nodes → define X, Y and Z coordinates.<br>
                2. Create Element Templates → <span id="dashboardElementTemplateInstruction">define I, E and A. Set each member's Self Weight (kN/m) in a Self Weight load case.</span><br>
                3. Assign Elements → connect start and end nodes.<br>
                4. Create Support Templates → define restraints and prescribed displacements.<br>
                5. Assign Supports → apply support definitions to nodes.<br>
                6. Create Load Cases → define Dead, Live or Self Weight cases.<br>
                7. Create Loads → apply element forces (distance 0 or L loads a node).<br>
                8. <span id="dashboardMomentCaseInstruction">Create Moment Cases → define Dead, Live or Self Weight cases.</span><br>
                9. <span id="dashboardMomentInstruction">Create Moments → apply element moments (distance 0 or L acts at a node).</span><br><br>
                10. Go to the <b>Results</b> tab to run the Stiffness Method solver.<br><br>
                <strong>Note:</strong> <span id="dashboardModeNote">Z coordinates and Z moments are ignored in 2D Plane Frame Analysis. Length (L) is automatically calculated via node coordinates.</span>
            </div>
        </div>
    </div>
</section>
`);

/* ---- Logic ---- */
function updateStats() {
    const isGrid = !!(model && model.analysisMode === "grid");
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    // Dashboard wording follows the fixed solver type of the current model.
    setText("statMomentsLabel", isGrid ? "TORSIONS" : "MOMENTS");
    setText("dashboardElementTemplateInstruction", isGrid
        ? "define I, J, E and G."
        : "define I, E and A. Set each member's Self Weight (kN/m) in a Self Weight load case.");
    setText("dashboardMomentCaseInstruction", isGrid
        ? "Create Torsion Cases → define Dead, Live or Self Weight cases."
        : "Create Moment Cases → define Dead, Live or Self Weight cases.");
    setText("dashboardMomentInstruction", isGrid
        ? "Create Torsions → apply element torsions (distance 0 or L acts at a node)."
        : "Create Moments → apply element moments (distance 0 or L acts at a node).");
    setText("dashboardModeNote", isGrid
        ? "Grid loads act along Z; torsion uses Mx (+ right / − left) and My (+ up / − down). Length (L) is automatically calculated from node coordinates."
        : "Z coordinates and Z moments are ignored in 2D Plane Frame Analysis. Length (L) is automatically calculated via node coordinates.");

    document.getElementById("statNodes").textContent = model.nodes.length;
    document.getElementById("statElements").textContent = model.elements.length;
    document.getElementById("statSupports").textContent = model.supportAssignments.length;
    document.getElementById("statLoads").textContent = model.loads.length;
    document.getElementById("statMoments").textContent = model.moments.length;
}
