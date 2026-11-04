/* ==========================================================================
 * diagrams.js — Results part 9: diagrams
 * Everything related to drawing: live model diagram card, Reaction + Combined
 * (AFD / SFD / BMD / Displacement) diagram cards, the shared SVG diagram engine
 * (getStructureSVG + utilities), DoF diagram, member focus, pinch-zoom / pan and the
 * full-screen diagram modal.
 * ========================================================================== */

/* ---- Markup ---- */
/* Live model diagram card: first element inside .container (visible on every page) */
mountModuleHTML(".container", "afterbegin", `
<!-- LIVE DIAGRAM SVG UI (Always visible at top) -->
<div class="card" id="liveModelDiagramCard">
    <div class="card-header">
        <h3>Live Structural Model Diagram</h3>
        <p>Updates instantly as you add or edit components.</p>
    </div>
    <div class="card-body canvas-container">
        <div id="structureSVGSmall" style="width: 100%; height: 350px; background: white; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; position: relative;"></div>
    </div>
    <button class="btn btn-secondary" style="margin-top: 15px; width: 100%;" onclick="openFullScreen('model')">🔍 Open Full Structure Diagram</button>
</div>
`);

/* Reaction + Combined result diagram cards: inside #resultsContent, right after the equilibrium card */
mountModuleHTML("#resultsContent .equilibrium-card", "afterend", `
<!-- DIAGRAM SVG UI : Reaction Diagram -->
<div class="card">
    <div class="card-header">
        <div>
            <h3>Reaction Diagram</h3>
            <p>Structure showing calculated support reactions.</p>
        </div>
    </div>
    <div class="card-body canvas-container">
        <div id="reactionSVGSmall" style="width: 100%; height: 350px; background: white; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; position: relative;"></div>
    </div>
    <button class="btn btn-secondary" style="margin-top: 15px; width: 100%;" onclick="openFullScreen('reactions')">🔍 Open Full Screen Diagram</button>
</div>

<!-- DIAGRAM SVG UI : Combined Results Diagram -->
<div class="card">
    <div class="card-header">
        <div>
            <h3>Analysis Diagrams</h3>
            <p>Derived using member end actions [AM] and intermediate loads.</p>
        </div>
        <select id="resultsDiagramMode" onchange="updateResultsDiagram()" style="width: auto; height: 32px; font-size: 12px; padding: 0 10px; border-radius: 6px; border: 1px solid #cbd5e1; outline: none; background: #f8fafc;">
            <option value="afd">AFD</option>
            <option value="sfd" selected>SFD</option>
            <option value="bmd">BMD</option>
            <option value="displacement">Displacement</option>
        </select>
    </div>
    <div class="card-body canvas-container">
        <div id="resultsSVGSmall" style="width: 100%; height: 350px; background: white; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; position: relative;"></div>
    </div>
    <button class="btn btn-secondary" style="margin-top: 15px; width: 100%;" onclick="openFullScreen('results')">🔍 Open Full Screen Diagram</button>
</div>
`);

/* Full-screen diagram modal: sibling of .app */
mountModuleHTML(".app", "afterend", `
<!-- FULL SCREEN DIAGRAM MODAL -->
<div id="fsModal" class="fs-modal">
    <div class="fs-modal-header">
        <div class="fs-toolbar">
            <select id="fsModeSelect" onchange="changeFSMode(this.value)">
                <option value="model">Structure Model</option>
                <option value="model3d" id="fsModel3DOption" hidden disabled>Structure Model (3D)</option>
                <option value="dof">DoF & Numbering Diagram</option>
                <option value="reactions">Reaction Diagram</option>
                <option value="afd">AFD</option>
                <option value="sfd">SFD</option>
                <option value="bmd">BMD</option>
                <option value="displacement">Displacement</option>
            </select>
        </div>
        <button type="button" class="fs-close" aria-label="Close full-screen diagram" title="Close full-screen diagram" onclick="closeFullScreen()">×</button>
    </div>
    <div class="fs-body">
        <div class="fs-nav-tools" id="fsNavTools" role="toolbar" aria-label="Canvas navigation controls">
            <button type="button" class="fs-nav-btn" id="fsNavZoomBtn" data-tool="zoom" aria-pressed="false" title="Zoom In / Out (Ctrl + mouse wheel, or pinch)" aria-label="Zoom In / Out toggle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="6"/><line x1="21" y1="21" x2="14.5" y2="14.5"/><line x1="7.5" y1="10" x2="12.5" y2="10"/><line x1="10" y1="7.5" x2="10" y2="12.5"/></svg>
            </button>
            <button type="button" class="fs-nav-btn" id="fsNavPanBtn" data-tool="pan" aria-pressed="false" title="Pan Mode (right-click or middle-click + drag, or one-finger drag)" aria-label="Pan Mode toggle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
            </button>
            <button type="button" class="fs-nav-btn" id="fsNavHighlightBtn" data-tool="highlight" aria-pressed="false" title="Member Highlight (click / tap a member)" aria-label="Member Highlight toggle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="20" x2="20" y2="4"/><circle cx="4" cy="20" r="2" fill="currentColor"/><circle cx="20" cy="4" r="2" fill="currentColor"/><line x1="4" y1="4" x2="9" y2="4" opacity="0.5"/><line x1="15" y1="20" x2="20" y2="20" opacity="0.5"/></svg>
            </button>
            <div class="fs-label-picker" id="fsLabelPicker">
                <button type="button" class="fs-nav-btn fs-label-toggle" id="fsLabelToggle" aria-expanded="false" aria-controls="fsLabelOptions" title="Choose element labels">Labels ▾</button>
                <div class="fs-label-options" id="fsLabelOptions" hidden>
                    <strong>Show on elements</strong>
                    <label><input type="checkbox" value="id" checked> Element ID</label>
                    <label><input type="checkbox" value="length"> Length (m)</label>
                    <label><input type="checkbox" value="angle"> Angle between elements (°)</label>
                    <label class="fs-label-area-option"><input type="checkbox" value="area"> Area A (m²)</label>
                    <label><input type="checkbox" value="inertia" checked> Inertia I (m⁴)</label>
                    <label class="fs-label-grid-option"><input type="checkbox" value="torsion"> Torsion constant J (m⁴)</label>
                    <label><input type="checkbox" value="elasticity"> Elastic modulus E</label>
                    <label class="fs-label-grid-option"><input type="checkbox" value="shear"> Shear modulus G</label>
                    <strong class="fs-label-section">Show loads &amp; moments</strong>
                    <label><input type="checkbox" data-label-group="load" value="point" checked> Point load</label>
                    <label><input type="checkbox" data-label-group="load" value="nodal" checked> Nodal load</label>
                    <label><input type="checkbox" data-label-group="load" value="udl" checked> UDL</label>
                    <label><input type="checkbox" data-label-group="load" value="elementMoment" checked> Element moment</label>
                    <label><input type="checkbox" data-label-group="load" value="nodalMoment" checked> Nodal moment</label>
                    <strong class="fs-label-section">Show on supports</strong>
                    <label><input type="checkbox" data-label-group="support" value="id"> Support ID</label>
                    <label><input type="checkbox" data-label-group="support" value="description"> Description</label>
                    <label><input type="checkbox" data-label-group="support" value="restraints"> Restrained DoF</label>
                </div>
            </div>
        </div>
        <div id="fsSVG"></div>
    </div>
</div>
`);

/* ---- Logic ---- */
let inlineModelDiagramRedrawTimer = null;

function scheduleInlineModelDiagramRedraw() {
    if (inlineModelDiagramRedrawTimer !== null) {
        clearTimeout(inlineModelDiagramRedrawTimer);
    }
    inlineModelDiagramRedrawTimer = setTimeout(() => {
        inlineModelDiagramRedrawTimer = null;
        renderInlineModelDiagram();
    }, 80);
}

// ==========================================================================

function showHeavyDiagramPlaceholder(containerId, title = "Large model — inline diagram paused") {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div style="
            height:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            flex-direction:column;
            gap:8px;
            padding:20px;
            text-align:center;
            color:#64748b;
            font-family:Arial,sans-serif;
        ">
            <div style="font-size:26px;">⚡</div>
            <div style="font-size:14px;font-weight:800;color:#334155;">
                ${title}
            </div>
            <div style="font-size:11px;line-height:1.5;max-width:420px;">
                ${model.nodes.length} nodes detected. This inline diagram is hidden
                to keep the page responsive. Use <b>Open Full Screen Diagram</b>
                to render the complete diagram.
            </div>
        </div>`;
}

function renderInlineModelDiagram() {
    const container = document.getElementById("structureSVGSmall");
    if (!container) return;

    const nodeCount = model.nodes.length;
    const INLINE_DIAGRAM_NODE_LIMIT = 10;

    if (nodeCount > INLINE_DIAGRAM_NODE_LIMIT) {
        container.innerHTML = `
            <div style="
                height:100%;
                display:flex;
                align-items:center;
                justify-content:center;
                flex-direction:column;
                gap:8px;
                padding:20px;
                text-align:center;
                color:#64748b;
                font-family:Arial,sans-serif;
            ">
                <div style="font-size:26px;">⚡</div>
                <div style="font-size:14px;font-weight:800;color:#334155;">
                    Large model — inline diagram paused
                </div>
                <div style="font-size:11px;line-height:1.5;max-width:420px;">
                    ${nodeCount} nodes detected. The inline diagram is hidden
                    to keep the page responsive. Open <b>Full Structure Diagram</b>
                    to render the complete model.
                </div>
            </div>`;
        return;
    }

    drawDiagramSVG("structureSVGSmall", "model");
}

// 9. STRUCTURE DIAGRAM (SVG) RENDERING
// Draws the model / AFD / SFD / BMD / reactions diagrams as inline SVG.
// ==========================================================================
function getBoundingBox() {
    let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
    model.nodes.forEach((n) => {
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.y > maxY) maxY = n.y;
    });
    return { minX, maxX, minY, maxY };
}

// Dynamic diagram baseline scaling:
// The shortest real structural member is treated as the visual baseline.
// That minimum member is forced to occupy 200 px in every proportional
// diagram that uses the shared structure renderer. Every longer member and
// every annotation drawn in the same SVG coordinate system then scales by
// exactly the same factor, keeping the complete visual system proportional.
//
// Structure Model already uses this method directly in drawDiagramSVG().
// Reactions / AFD / SFD / BMD / Displacement use it through the shared
// calculateAutoFit() path. DoF/Numbering is intentionally NOT affected:
// it has its own dedicated schematic renderer.
function getMinimumElementLength() {
    let minL = Infinity;

    model.elements.forEach((el) => {
        if (!el) return;

        const n1 = model.nodes.find((n) => n.id === el.startNode);
        const n2 = model.nodes.find((n) => n.id === el.endNode);
        if (!n1 || !n2) return;

        const dx = Number(n2.x) - Number(n1.x);
        const dy = Number(n2.y) - Number(n1.y);
        const L = Math.hypot(dx, dy);

        if (Number.isFinite(L) && L > 1e-9) {
            minL = Math.min(minL, L);
        }
    });

    return Number.isFinite(minL) ? minL : null;
}

function calculateAutoFit(width, height, mode = "model") {
    if (model.nodes.length === 0) return { scale: 100, offsetX: width / 2, offsetY: height / 2 };

    let bb = getBoundingBox();
    let dX = bb.maxX - bb.minX;
    if (dX === 0) dX = 1;
    let dY = bb.maxY - bb.minY;
    if (dY === 0) dY = 1;

    // The reaction diagram places labelled cards outside the structure's own
    // bounding box, so it needs more breathing room than the other diagram
    // modes to keep those cards from being clipped at the SVG edge.
    const paddingX = mode === "reactions" ? 130 : 80;
    const paddingY = mode === "reactions" ? 130 : 80;
    let scaleX = (width - 2 * paddingX) / dX;
    let scaleY = (height - 2 * paddingY) / dY;

    // First calculate the original fit scale. This is the reference scale
    // that previously made a 7 m member readable.
    let fitScale = Math.min(scaleX, scaleY);
    if (!Number.isFinite(fitScale) || fitScale <= 0) fitScale = 100;

    // Shared proportional baseline for result/reaction diagrams. It is a
    // target, not an absolute guarantee: when the shortest member would force
    // the full model outside the viewport, prefer the fit scale to avoid
    // clipping long members or node labels.
    const minElementLength = getMinimumElementLength();
    const baselineScale =
        minElementLength && Number.isFinite(minElementLength) && minElementLength > 0
            ? AppConfig.sharedDiagramBaselinePx / minElementLength
            : fitScale;
    let scale = Math.min(baselineScale, fitScale);

    // Keep a finite upper safety bound for malformed/extreme coordinate data.
    const MAX_DIAGRAM_SCALE = 1500;
    if (scale > MAX_DIAGRAM_SCALE) scale = MAX_DIAGRAM_SCALE;

    let midX = (bb.minX + bb.maxX) / 2;
    let midY = (bb.minY + bb.maxY) / 2;

    let offsetX = width / 2 - midX * scale;
    let offsetY = height / 2 + midY * scale;

    return { scale, offsetX, offsetY };
}

// ==========================================================================
// UNIVERSAL DIAGRAM LABEL ENGINE
// Every diagram (Live/model view, AFD, SFD, BMD, Displacement, Reactions,
// DoF/Numbering) funnels ALL of its text labels through this single engine
// instead of writing <text> straight into the SVG string. Each caller just
// "queues" a label describing what it wants to show and, optionally, the
// point on the drawing it refers to (its anchor). Once a diagram has queued
// every label it needs, resolve() runs once and:
//   1. Works out each label's real on-screen footprint from its text length,
//      font size and rotation (so short and long labels are treated fairly).
//   2. Nudges any labels whose footprints overlap apart from one another
//      using an iterative separation pass, in every direction, until nothing
//      overlaps (or the iteration budget is used up on very dense models).
//   3. Clamps every label back inside the visible canvas so nothing ends up
//      drawn off-screen (a common cause of "invisible" text).
//   4. Draws every label LAST, after all lines/fills/paths, so a label can
//      never be hidden underneath a diagram curve or fill that was drawn
//      after it — and adds a soft white halo behind the text so it stays
//      legible over member lines, curves, and fills of any color.
//   5. If a label had to move noticeably away from the point it describes,
//      a thin dashed leader line is drawn back to that point so it is never
//      ambiguous which value/label belongs to which node, load, or curve.
// This is intentionally generic (addText for simple labels, addBlock for
// pre-built multi-line boxes like the reaction cards) so it works the same
// way for every diagram type without special-casing any one of them.
// ==========================================================================
function createLabelLayer() {
    const items = [];

    function estimateTextWidth(text, fontSize, fontWeight) {
        const str = String(text);
        const bold = fontWeight === "bold" || fontWeight === "700" || fontWeight === "800" || fontWeight === "600";
        const factor = bold ? 0.62 : 0.56;
        return Math.max(str.length * fontSize * factor, fontSize * 0.6);
    }

    function rotatedHalfExtents(w, h, angleDeg) {
        if (!angleDeg) return { hw: w / 2, hh: h / 2 };
        const rad = (angleDeg * Math.PI) / 180;
        const cos = Math.abs(Math.cos(rad));
        const sin = Math.abs(Math.sin(rad));
        return { hw: (w * cos + h * sin) / 2, hh: (w * sin + h * cos) / 2 };
    }

    // Queue a single-line text label. (x, y) is the SVG baseline position it
    // would use in isolation; (anchorX, anchorY) is the point in the drawing
    // it describes (defaults to x, y) used only for the optional leader line.
    function addText(opts) {
        const {
            x, y, text, fontSize = 11, fontWeight = "bold", color = "#1e293b",
            textAnchor = "start", angle = 0, anchorX, anchorY, halo = true,
            leader = true, leaderColor, padding = 3, lockPosition = false, memberKey,
            ownerMember, ownerNode,
        } = opts;
        const w = estimateTextWidth(text, fontSize, fontWeight) + padding * 2;
        const h = fontSize * 1.3 + padding * 2;
        const ext = rotatedHalfExtents(w, h, angle);

        let cx;
        if (textAnchor === "middle") cx = x;
        else if (textAnchor === "end") cx = x - w / 2 + padding;
        else cx = x + w / 2 - padding;
        let cy = y - fontSize * 0.32;

        items.push({
            type: "text", text, fontSize, fontWeight, color, textAnchor, angle,
            halfW: ext.hw, halfH: ext.hh, boxW: w, boxH: h, cx, cy, padding,
            anchorX: anchorX !== undefined ? anchorX : x,
            anchorY: anchorY !== undefined ? anchorY : y,
            halo, leader, leaderColor: leaderColor || color, lockPosition, memberKey,
            ownerMember, ownerNode,
        });
    }

    // Queue an arbitrary pre-sized block (e.g. a multi-line reaction card)
    // that knows how to render itself at a given center via render(cx, cy).
    // It still takes part in overlap avoidance with every other label.
    function addBlock(opts) {
        const { x, y, w, h, anchorX, anchorY, render, leader = true, leaderColor = "#94a3b8", ownerMember, ownerNode } = opts;
        items.push({
            type: "block", boxW: w, boxH: h, halfW: w / 2, halfH: h / 2,
            cx: x, cy: y, render, ownerMember, ownerNode,
            anchorX: anchorX !== undefined ? anchorX : x,
            anchorY: anchorY !== undefined ? anchorY : y,
            leader, leaderColor,
        });
    }

    // Fixed, non-text obstacles (e.g. node markers) that labels must stay
    // clear of. Obstacles never move; only labels are pushed away from them.
    const obstacles = [];
    function addObstacle(cx, cy, halfW, halfH) {
        obstacles.push({ cx, cy, halfW, halfH });
    }

    function resolve(bounds, options = {}) {
        const iterations = options.iterations || 300;
        const gap = options.gap ?? 3;

        for (let iter = 0; iter < iterations; iter++) {
            let moved = false;
            for (let i = 0; i < items.length && obstacles.length; i++) {
                const a = items[i];
                if (a.lockPosition) continue;
                for (let k = 0; k < obstacles.length; k++) {
                    const o = obstacles[k];
                    const dx = a.cx - o.cx, dy = a.cy - o.cy;
                    const overlapX = a.halfW + o.halfW + gap - Math.abs(dx);
                    const overlapY = a.halfH + o.halfH + gap - Math.abs(dy);
                    if (overlapX > 0 && overlapY > 0) {
                        moved = true;
                        if (overlapX < overlapY) a.cx += (dx === 0 ? 1 : Math.sign(dx)) * (overlapX + 0.4);
                        else a.cy += (dy === 0 ? -1 : Math.sign(dy)) * (overlapY + 0.4);
                    }
                }
            }
            for (let i = 0; i < items.length; i++) {
                for (let j = i + 1; j < items.length; j++) {
                    const a = items[i], b = items[j];
                    if (a.lockPosition || b.lockPosition) continue;
                    const dx = b.cx - a.cx, dy = b.cy - a.cy;
                    const overlapX = a.halfW + b.halfW + gap - Math.abs(dx);
                    const overlapY = a.halfH + b.halfH + gap - Math.abs(dy);
                    if (overlapX > 0 && overlapY > 0) {
                        moved = true;
                        if (overlapX < overlapY) {
                            const push = overlapX / 2 + 0.4;
                            const dir = dx === 0 ? (i < j ? -1 : 1) : Math.sign(dx);
                            a.cx -= dir * push;
                            b.cx += dir * push;
                        } else {
                            const push = overlapY / 2 + 0.4;
                            const dir = dy === 0 ? (i < j ? -1 : 1) : Math.sign(dy);
                            a.cy -= dir * push;
                            b.cy += dir * push;
                        }
                    }
                }
            }
            if (!moved) break;
        }

        if (bounds) {
            items.forEach((it) => {
                const minX = bounds.minX + it.halfW + 2, maxX = bounds.maxX - it.halfW - 2;
                const minY = bounds.minY + it.halfH + 2, maxY = bounds.maxY - it.halfH - 2;
                if (minX <= maxX) it.cx = Math.min(Math.max(it.cx, minX), maxX);
                if (minY <= maxY) it.cy = Math.min(Math.max(it.cy, minY), maxY);
            });
        }

        let out = "";
        items.forEach((it) => {
            const dist = Math.hypot(it.cx - it.anchorX, it.cy - it.anchorY);
            const movedFar = dist > (it.type === "text" ? 9 : 6);
            // Label-to-diagram connector lines are intentionally omitted.
            if (it.type === "block") {
                // Highlight tool: tag the block with the member / node it belongs to.
                if (it.ownerMember !== undefined) out += `<g class="sf-own-member" data-member="${escapeHtml(String(it.ownerMember))}">${it.render(it.cx, it.cy)}</g>`;
                else if (it.ownerNode !== undefined) out += `<g class="sf-own-node" data-own-node="${escapeHtml(String(it.ownerNode))}">${it.render(it.cx, it.cy)}</g>`;
                else out += it.render(it.cx, it.cy);
            } else {
                const baseX = it.textAnchor === "middle" ? it.cx : it.textAnchor === "end" ? it.cx + it.boxW / 2 - it.padding : it.cx - it.boxW / 2 + it.padding;
                const baseY = it.cy + it.fontSize * 0.32;
                const anchorAttr = it.textAnchor && it.textAnchor !== "start" ? ` text-anchor="${it.textAnchor}"` : "";
                const rotateAttr = it.angle ? ` transform="rotate(${it.angle} ${baseX.toFixed(2)} ${baseY.toFixed(2)})"` : "";
                const haloAttr = it.halo ? ` paint-order="stroke" stroke="white" stroke-width="${it.memberKey !== undefined ? 4 : 3}" stroke-linejoin="round"` : "";
                const memberAttr = it.memberKey !== undefined ? ` class="sf-label" data-member="${escapeHtml(it.memberKey)}"`
                    : it.ownerMember !== undefined ? ` class="sf-label" data-member="${escapeHtml(String(it.ownerMember))}"`
                    : it.ownerNode !== undefined ? ` class="sf-own-node" data-own-node="${escapeHtml(String(it.ownerNode))}"` : "";
                out += `<text${memberAttr} x="${baseX.toFixed(2)}" y="${baseY.toFixed(2)}" fill="${it.color}" font-family="Arial" font-size="${it.fontSize}" font-weight="${it.fontWeight}"${it.memberKey !== undefined ? ' text-rendering="geometricPrecision"' : ""}${anchorAttr}${rotateAttr}${haloAttr}>${escapeHtml(it.text)}</text>`;
            }
        });
        return out;
    }

    return { addText, addBlock, addObstacle, resolve };
}

// ==========================================================================
// 10. SVG RENDERING UTILITIES
// Low-level, purely-geometric SVG fragment builders used by the diagram
// engine below. None of these know anything about the stiffness solver —
// they only turn already-computed numbers into markup.
// ==========================================================================
function getGlobalLoadComponentsForDraw(ld, el) {
    let Fx = ld.Fx || 0,
        Fy = ld.Fy || 0;
    let Fx2 = ld.FxEnd !== undefined && ld.FxEnd !== "" ? Number(ld.FxEnd) : Fx;
    let Fy2 = ld.FyEnd !== undefined && ld.FyEnd !== "" ? Number(ld.FyEnd) : Fy;
    let g1 = { x: Fx, y: Fy },
        g2 = { x: Fx2, y: Fy2 };

    if (ld.axisSystem === "Local" && el) {
        // el.cx/el.cy (direction cosines) are only populated once "Run
        // Analysis" has executed. For the live preview diagram they may
        // still be undefined, which produced NaN projections. Recompute
        // them here directly from the element's node coordinates instead,
        // guarding against a zero-length element to avoid a division by 0.
        let n1 = model.nodes.find((n) => n.id === el.startNode);
        let n2 = model.nodes.find((n) => n.id === el.endNode);
        let cx = 1,
            cy = 0;
        if (n1 && n2) {
            let dx = n2.x - n1.x,
                dy = n2.y - n1.y;
            let L = Math.hypot(dx, dy);
            if (L > 0) {
                cx = dx / L;
                cy = dy / L;
            }
        }
        g1.x = Fx * cx - Fy * cy;
        g1.y = Fx * cy + Fy * cx;
        g2.x = Fx2 * cx - Fy2 * cy;
        g2.y = Fx2 * cy + Fy2 * cx;
    } else if (ld.axisSystem === "Angled") {
        let rad = ((ld.angle || 0) * Math.PI) / 180;
        g1.x = Fx * Math.cos(rad) - Fy * Math.sin(rad);
        g1.y = Fx * Math.sin(rad) + Fy * Math.cos(rad);
        g2.x = Fx2 * Math.cos(rad) - Fy2 * Math.sin(rad);
        g2.y = Fx2 * Math.sin(rad) + Fy2 * Math.cos(rad);
    }
    return { g1, g2 };
}

function drawSVGArrow(fromx, fromy, tox, toy, color) {
    const headlen = 10;
    const dx = tox - fromx;
    const dy = toy - fromy;
    const angle = Math.atan2(dy, dx);
    const p1x = tox - headlen * Math.cos(angle - Math.PI / 6);
    const p1y = toy - headlen * Math.sin(angle - Math.PI / 6);
    const p2x = tox - headlen * Math.cos(angle + Math.PI / 6);
    const p2y = toy - headlen * Math.sin(angle + Math.PI / 6);
    return `<line x1="${fromx}" y1="${fromy}" x2="${tox}" y2="${toy}" stroke="${color}" stroke-width="2"/>
                <polyline points="${p1x},${p1y} ${tox},${toy} ${p2x},${p2y}" fill="none" stroke="${color}" stroke-width="2"/>`;
}

// Draw a clear circular moment arrow with the arrowhead tangent to the arc.
// Positive Mz is shown anticlockwise on the screen; negative Mz is shown clockwise.
function drawMomentArrow(cx, cy, radius, anticlockwise, color) {
    const startDeg = anticlockwise ? 135 : -135;
    const endDeg = anticlockwise ? -135 : 135;
    const steps = 32;
    const points = [];

    for (let i = 0; i <= steps; i++) {
        const deg = startDeg + ((endDeg - startDeg) * i) / steps;
        const rad = (deg * Math.PI) / 180;
        points.push({
            x: cx + radius * Math.cos(rad),
            y: cy + radius * Math.sin(rad),
        });
    }

    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`;
    }

    const lineTip = points[points.length - 1];
    const prev = points[points.length - 2];
    const vx = lineTip.x - prev.x;
    const vy = lineTip.y - prev.y;
    const vLen = Math.hypot(vx, vy) || 1;
    const ux = vx / vLen;
    const uy = vy / vLen;
    const tip = { x: lineTip.x + ux * 2, y: lineTip.y + uy * 2 };
    const headLen = Math.min(12, radius * 0.42);
    const headWidth = Math.min(7, radius * 0.30);
    const bx = tip.x - ux * headLen;
    const by = tip.y - uy * headLen;
    const px = -uy;
    const py = ux;

    const p1 = `${tip.x.toFixed(2)},${tip.y.toFixed(2)}`;
    const p2 = `${(bx + px * headWidth).toFixed(2)},${(by + py * headWidth).toFixed(2)}`;
    const p3 = `${(bx - px * headWidth).toFixed(2)},${(by - py * headWidth).toFixed(2)}`;

    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<polygon points="${p1} ${p2} ${p3}" fill="${color}"/>`;
}

function getSupportVisualType(sa) {
    const template = model.supportTemplates.find((s) => s.id === sa.supportId);
    if (!template) return "custom";
    if (template.type === "fixed" || template.builtIn && template.id === "FIXED") return "fixed";
    if (template.type === "roller" || template.builtIn && template.id === "ROLLER") return "roller";
    if (template.type === "hinged" || template.builtIn && template.id === "HINGED") return "hinged";
    return "custom";
}

function drawSupportSymbol(x, y, type) {
    // Compact support markers: intentionally small so they identify the
    // restraint type without obscuring nodes, loads, dimensions, or labels.
    const triangleTop = y + 1;
    if (type === "fixed" || type === "custom") {
        const fill = type === "fixed" ? "#111827" : "#8b5a2b";
        const stroke = type === "fixed" ? "#030712" : "#6f451f";
        const baseY = y + 14;
        return `
                <rect x="${x - 7}" y="${baseY}" width="14" height="11" rx="1.5" fill="${fill}" stroke="${stroke}" stroke-width="1"/>
            `;
    }

    const color = type === "roller" ? "#16a34a" : "#2563eb";
    let out = `<polygon points="${x},${triangleTop} ${x - 8},${y + 12} ${x + 8},${y + 12}" fill="${color}" stroke="${color}" stroke-width="1"/>`;
    if (type === "roller") {
        const wheelY = y + 15;
        out += `<circle cx="${x - 4}" cy="${wheelY}" r="2" fill="white" stroke="${color}" stroke-width="1"/>`;
        out += `<circle cx="${x + 4}" cy="${wheelY}" r="2" fill="white" stroke="${color}" stroke-width="1"/>`;
        out += `<line x1="${x - 10}" y1="${y + 18}" x2="${x + 10}" y2="${y + 18}" stroke="${color}" stroke-width="1.2"/>`;
        for (let gx = x - 9; gx <= x + 9; gx += 6) {
            out += `<line x1="${gx}" y1="${y + 18}" x2="${gx - 3}" y2="${y + 21}" stroke="${color}" stroke-width="0.8"/>`;
        }
    } else {
        out += `<line x1="${x - 10}" y1="${y + 15}" x2="${x + 10}" y2="${y + 15}" stroke="${color}" stroke-width="1.2"/>`;
        for (let gx = x - 9; gx <= x + 9; gx += 6) {
            out += `<line x1="${gx}" y1="${y + 15}" x2="${gx - 3}" y2="${y + 18}" stroke="${color}" stroke-width="0.8"/>`;
        }
    }
    return out;
}

// ==========================================================================
// 11. DIAGRAM ENGINE
// getStructureSVG() is the shared rendering engine behind every structural
// diagram (Structure Model, Reactions, AFD, SFD, BMD, Displacement) — the
// six modes share one continuous coordinate system, label-collision pass,
// and node/support drawing, so they are driven by a single `mode` switch
// rather than six independently-scrolled copies of that shared machinery.
// Inside getStructureSVG, each mode's own drawing logic is a nested,
// individually-named function (drawModelModeLoadsAndMoments,
// drawDisplacementDiagram, drawReactionsDiagram, drawInternalActionDiagram)
// declared as closures so they can share the coordinate transform (tx/ty),
// the SVG accumulator, and the label-collision layer without re-deriving or
// re-passing them — the top-level body of getStructureSVG is then just the
// ordered sequence of "which phase runs for this mode".
// The named, independent entry point for each diagram (as used everywhere
// else in this file, and matching the diagram naming used elsewhere in this
// codebase) is the render*Diagram() family defined right after it — callers
// outside this section should use those, not getStructureSVG directly.
// ==========================================================================
// Axial force, shear force, and bending moment at a distance `x` along a
// member's local axis, given its already-solved member-end plot data `pd`
// (see solveStep8 / el.plotData). Pure function of (pd, x) — used by both
// the AFD/SFD/BMD max-magnitude scan and the actual diagram point sampling
// inside getStructureSVG below, so the internal-action formula exists in
// exactly one place instead of two identical copies.
function calculateInternalActionsAtPosition(pd, x) {
    if (pd.grid || isGridAnalysisMode()) {
        // Grid end-action order is [Mx, My, Fz] at each end. These reusable
        // diagrams project the three member quantities onto AFD/SFD/BMD:
        // AFD -> torsion Mx, SFD -> vertical shear Fz, BMD -> bending My.
        let torsion = Number(pd.fx1) || 0;
        let shear = Number(pd.fy1) || 0;
        let bending = -(Number(pd.mz1) || 0) + shear * x;

        (pd.gridUDLs || []).forEach((udl) => {
            if (!(x > udl.a)) return;
            const span = udl.b - udl.a;
            if (!(span > 0)) return;
            const len = Math.min(x, udl.b) - udl.a;
            if (!(len > 0)) return;
            const q1 = Number(udl.q1) || 0;
            const qEnd = q1 + ((Number(udl.q2) || 0) - q1) * (len / span);
            shear += ((q1 + qEnd) / 2) * len;
            const vRect = q1 * len;
            const mRect = vRect * (x - (udl.a + len / 2));
            const vTri = 0.5 * (qEnd - q1) * len;
            const mTri = vTri * (x - (udl.a + (2 * len) / 3));
            bending += mRect + mTri;
        });

        (pd.gridPointLoads || []).forEach((load) => {
            if (x > load.a) {
                const fz = Number(load.Fz) || 0;
                shear += fz;
                bending += fz * (x - load.a);
            }
        });
        (pd.gridPointTorsions || []).forEach((moment) => {
            if (x > moment.a) torsion -= Number(moment.Mx) || 0;
        });
        (pd.gridPointMoments || []).forEach((moment) => {
            if (x > moment.a) bending -= Number(moment.My) || 0;
        });
        return { A: torsion, V: shear, M: bending };
    }

    let A_ax = pd.fx1;
    let V = pd.fy1;
    let M = -pd.mz1 + pd.fy1 * x;

    // Add overall self-weight
    A_ax += pd.wx * x;
    V += pd.wy * x;
    M += (pd.wy * x * x) / 2;

    // Complex Custom Partial UDLs
    pd.localUDLs.forEach((udl) => {
        let wx1 = udl.Fx1 * pd.cx + udl.Fy1 * pd.cy;
        let wy1 = -udl.Fx1 * pd.cy + udl.Fy1 * pd.cx;
        let wx2 = udl.Fx2 * pd.cx + udl.Fy2 * pd.cy;
        let wy2 = -udl.Fx2 * pd.cy + udl.Fy2 * pd.cx;

        if (x > udl.a) {
            let L_udl = udl.b - udl.a;
            let len = Math.min(x, udl.b) - udl.a;

            let w1_x = wx1;
            let w2_x = wx1 + ((wx2 - wx1) * len) / L_udl;
            A_ax += ((w1_x + w2_x) / 2) * len;

            let w1_y = wy1;
            let w2_y = wy1 + ((wy2 - wy1) * len) / L_udl;
            V += ((w1_y + w2_y) / 2) * len;

            let V_rect = w1_y * len;
            let M_rect = V_rect * (x - (udl.a + len / 2));
            let V_tri = 0.5 * (w2_y - w1_y) * len;
            let M_tri = V_tri * (x - (udl.a + (2 * len) / 3));

            M += M_rect + M_tri;
        }
    });

    pd.pointLoads.forEach((pl) => {
        if (x > pl.a) {
            A_ax += pl.Px;
            V += pl.Py;
            M += pl.Py * (x - pl.a);
        }
    });

    pd.localPointMoments.forEach((pm) => {
        if (x > pm.a) {
            M -= pm.Mz;
        }
    });

    return { A: A_ax, V, M };
}

// Scans all nodal/element loads for their largest global magnitude, and all
// nodal moments for the largest |Mz|. Used only by the "model" diagram mode
// to auto-scale load-arrow lengths and moment-arc radii so magnitude stays
// visually comparable across a load/moment case. Pure function of `model` —
// no DOM access, no SVG string building.
function computeMaxLoadAndMomentMagnitudes() {
    let maxLoad = 0;
    let maxMoment = 0;
    model.loads.forEach((ld) => {
        let el = model.elements.find((e) => e.id === ld.elementId);
        let comps = getGlobalLoadComponentsForDraw(ld, el);
        let mag1 = Math.hypot(comps.g1.x, comps.g1.y);
        let mag2 = Math.hypot(comps.g2.x, comps.g2.y);
        if (mag1 > maxLoad) maxLoad = mag1;
        if (mag2 > maxLoad) maxLoad = mag2;
    });
    model.moments.forEach((m) => {
        let mag = Math.abs(m.Mz || 0);
        if (mag > maxMoment) maxMoment = mag;
    });
    return { maxLoad, maxMoment };
}

// Scans every solved element's plot data (see solveStep8 / el.plotData) at a
// dense set of candidate positions — plus just before/after every point
// load, point moment, and UDL boundary, where axial/shear/moment can jump —
// to find the largest |axial|, |shear|, and |moment| anywhere in the
// structure. calculateInternalActionsAtPosition() above remains the single
// source of truth for the internal-action formula itself; this function only
// decides WHERE to sample it for the purpose of auto-scaling the AFD/SFD/BMD
// diagrams. Pure function of `model` — no DOM access, no SVG string building.
function computeInternalActionExtremes() {
    let maxA = 0,
        maxV = 0,
        maxM = 0;
    model.elements.forEach((el) => {
        if (!el.plotData) return;
        let pd = el.plotData;
        let xs = [];
        for (let i = 0; i <= 50; i++) xs.push((i / 50) * pd.L);
        pd.pointLoads.forEach((pl) => {
            xs.push(pl.a - 1e-6);
            xs.push(pl.a + 1e-6);
        });
        pd.localPointMoments.forEach((pm) => {
            xs.push(pm.a - 1e-6);
            xs.push(pm.a + 1e-6);
        });
        pd.localUDLs.forEach((udl) => {
            xs.push(udl.a);
            xs.push(udl.b);
        });
        xs.sort((a, b) => a - b);

        xs.forEach((x) => {
            const { A: A_ax, V, M } = calculateInternalActionsAtPosition(pd, x);
            if (Math.abs(A_ax) > maxA) maxA = Math.abs(A_ax);
            if (Math.abs(V) > maxV) maxV = Math.abs(V);
            if (Math.abs(M) > maxM) maxM = Math.abs(M);
        });
    });
    return { maxA, maxV, maxM };
}

function getStructureSVG(width, height, camera, mode = "model") {
    if (model.nodes.length === 0) {
        return `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}"><text x="20" y="30" fill="#94a3b8" font-family="Arial" font-size="14">No nodes to draw.</text></svg>`;
    }

    let hasAnalysisData = analysisState.status === "valid" && model.elements.length > 0 && model.elements.some((el) => el && el.plotData);
    if (
        (mode === "afd" || mode === "sfd" || mode === "bmd" || mode === "displacement" || mode === "reactions") &&
        !hasAnalysisData
    ) {
        const message = analysisState.status === "invalidated"
            ? "Model changed since last analysis — Run Analysis again."
            : "Run Analysis first to view this diagram.";
        return `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}"><text x="20" y="30" fill="#94a3b8" font-family="Arial" font-size="14">${message}</text></svg>`;
    }

    const svgIntrinsicSize = camera && camera.intrinsicCanvas;
    let svg = svgIntrinsicSize
        ? `<svg width="${Math.ceil(width)}" height="${Math.ceil(height)}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" data-sf-mode="${mode}" style="background: white; display:block;">`
        : `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" data-sf-mode="${mode}" style="background: white;">`;

    // Every text label this diagram draws (node IDs, member lengths, load/
    // moment values, displacement values, diagram peak values, reaction
    // cards, ...) is queued here and placed without overlap once, at the
    // very end of this function. See createLabelLayer() above.
    const labelLayer = createLabelLayer();

    function tx(x) {
        return camera.offsetX + x * camera.scale;
    }
    function ty(y) {
        return camera.offsetY - y * camera.scale;
    }

    let bb = getBoundingBox();
    let maxDim = Math.max(bb.maxX - bb.minX || 1, bb.maxY - bb.minY || 1);

    let maxLoad = 0,
        maxMoment = 0;
    if (mode === "model") {
        ({ maxLoad, maxMoment } = computeMaxLoadAndMomentMagnitudes());
    }

    let maxA = 0,
        maxV = 0,
        maxM = 0;
    if (mode === "afd" || mode === "sfd" || mode === "bmd") {
        ({ maxA, maxV, maxM } = computeInternalActionExtremes());
    }

    let scaleA = maxA > 0 ? (0.15 * maxDim) / maxA : 0;
    let scaleV = maxV > 0 ? (0.15 * maxDim) / maxV : 0;
    let scaleM = maxM > 0 ? (0.15 * maxDim) / maxM : 0;

    let elStroke = mode === "model" || mode === "reactions" ? "#4f8df7" : "#cbd5e1";
    let textStroke = mode === "model" || mode === "reactions" ? "#64748b" : "#94a3b8";
    if (mode === "displacement") {
        elStroke = "#cbd5e1";
        textStroke = "#94a3b8";
    }

    const isInternalActionMode = mode === "afd" || mode === "sfd" || mode === "bmd";
    // Compact node marker used only by the AFD / SFD / BMD views.
    const actionNodeRadius = 7;

    // Member Highlight tool support for the non-AFD/SFD/BMD diagrams.
    // Every load / moment / support / reaction / displacement graphic is tagged
    // with the member (class sf-own-member, data-member = element index) or the
    // joint (class sf-own-node, data-own-node = node id) it belongs to, purely as
    // markup attributes. Drawing, geometry and solver data are unchanged.
    // Load / moment value labels can be switched off individually from the Labels menu.
    const addLoadLabel = (key, opts) => {
        if (fsLoadLabelKeys.includes(key)) labelLayer.addText(opts);
    };
    // Which Labels-menu option controls a load / moment record. Unchecking an option
    // hides that whole load or moment (arrows, UDL shape, moment arc and its value).
    const loadTypeKey = (type) => {
        const t = String(type || "");
        if (t === "Nodal Load") return "nodal";
        if (t === "Element UDL") return "udl";
        if (t === "Element Point Load" || t === "Element Load" || t === "Point Load") return "point";
        return null;
    };
    const momentTypeKey = (type) => {
        const t = String(type || "");
        if (t === "Nodal Moment" || t === "Nodal Torsion") return "nodalMoment";
        if (t === "Element Moment" || t === "Element Torsion") return "elementMoment";
        return null;
    };
    const loadOptionOn = (key) => key === null || fsLoadLabelKeys.includes(key);
    const memberIdx = (elementId) => {
        const i = model.elements.findIndex((e) => String(e.id) === String(elementId));
        return i >= 0 ? i : undefined;
    };
    function ownWrap(start, kind, key) {
        if (isInternalActionMode || key === undefined || key === null || svg.length <= start) return;
        const attr = kind === "member"
            ? `class="sf-own-member" data-member="${escapeHtml(String(key))}"`
            : `class="sf-own-node" data-own-node="${escapeHtml(String(key))}"`;
        svg = svg.slice(0, start) + `<g ${attr}>` + svg.slice(start) + `</g>`;
    }

    // Leader lines + anchor dots for AFD/SFD/BMD values. Kept apart from the
    // main markup so they can be drawn ABOVE the node markers (see below).
    let actionOverlaySvg = "";

    model.elements.forEach((el, ei) => {
        let n1 = model.nodes.find((n) => n.id === el.startNode);
        let n2 = model.nodes.find((n) => n.id === el.endNode);
        if (n1 && n2) {
            let x1 = tx(n1.x),
                y1 = ty(n1.y),
                x2 = tx(n2.x),
                y2 = ty(n2.y);
            const elementStrokeWidth = mode === "model" ? 9 : 3;
            // Every structural member gets the same invisible hit target so the
            // fullscreen highlight tool can select it in every diagram mode.
            if (isInternalActionMode) {
                svg += `<g class="sf-member" data-member="${ei}" data-start="${escapeHtml(String(el.startNode))}" data-end="${escapeHtml(String(el.endNode))}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(0,0,0,0)" stroke-width="16" pointer-events="stroke"/><line class="sf-member-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${elStroke}" stroke-width="${elementStrokeWidth}"/></g>`;
            } else {
                svg += `<g class="sf-member" data-member="${ei}" data-start="${escapeHtml(String(el.startNode))}" data-end="${escapeHtml(String(el.endNode))}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(0,0,0,0)" stroke-width="16" pointer-events="stroke"/><line class="sf-member-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${elStroke}" stroke-width="${elementStrokeWidth}"/></g>`;
            }
            if (mode === "model" && !isGridAnalysisMode()) {
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;
                // Rotate the label with the member in screen coordinates. Normalize
                // the angle so labels remain readable rather than upside down.
                let labelAngle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
                if (labelAngle > 90) labelAngle -= 180;
                if (labelAngle < -90) labelAngle += 180;
                const labelText = getSelectedElementLabelText(el, n1, n2);
                if (labelText) {
                    svg += `<g class="fs-element-property-label" data-member="${ei}" pointer-events="none" transform="rotate(${labelAngle.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)})"><text x="${midX.toFixed(2)}" y="${midY.toFixed(2)}" dy="1.5px" text-anchor="middle" dominant-baseline="middle" fill="#111827" font-family="Arial" font-size="8" font-weight="700">${escapeHtml(labelText)}</text></g>`;
                }
            }
        }
    });

    // "Angle between elements" label option: at every node where two or more
    // elements meet, show the angle BETWEEN each pair of neighbouring elements
    // (not the angle from the global axis). Right / straight / reflex angles
    // (90, 180, 270, 360 deg) are obvious, so they are never labelled.
    if (mode === "model" && fsElementLabelKeys.includes("angle")) {
        const OBVIOUS = [90, 180, 270, 360];
        const TOL = 0.05;
        model.nodes.forEach((n) => {
            const cx = tx(n.x), cy = ty(n.y);
            const dirs = [];
            const lens = [];
            model.elements.forEach((el) => {
                let other = null;
                if (String(el.startNode) === String(n.id)) other = model.nodes.find((m) => String(m.id) === String(el.endNode));
                else if (String(el.endNode) === String(n.id)) other = model.nodes.find((m) => String(m.id) === String(el.startNode));
                if (!other) return;
                const dx = Number(other.x) - Number(n.x), dy = Number(other.y) - Number(n.y);
                if (Math.hypot(dx, dy) < 1e-9) return;
                let a = Math.atan2(dy, dx) * 180 / Math.PI;
                if (a < 0) a += 360;
                if (dirs.some((d) => Math.min(Math.abs(d - a), 360 - Math.abs(d - a)) < 1e-6)) return;
                dirs.push(a);
                lens.push(Math.hypot(tx(other.x) - cx, ty(other.y) - cy));
            });
            if (dirs.length < 2) return;
            const order = dirs.map((a, i) => i).sort((i, j) => dirs[i] - dirs[j]);
            const pairs = [];
            for (let k = 0; k < order.length; k++) {
                const a1 = dirs[order[k]];
                let a2 = dirs[order[(k + 1) % order.length]];
                let gap = a2 - a1;
                if (gap <= 0) gap += 360;
                pairs.push({ a1, gap, minLen: Math.min(lens[order[k]], lens[order[(k + 1) % order.length]]) });
            }
            // Two elements only: the single angle between them is the smaller one.
            const shown = dirs.length === 2
                ? [pairs.reduce((best, q) => (q.gap < best.gap ? q : best))]
                : pairs;
            shown.forEach((q) => {
                if (q.gap < TOL || OBVIOUS.some((v) => Math.abs(q.gap - v) < TOL)) return;
                // Reflex gaps (> 180 deg) are the outside of the joint, not an
                // angle "between" two elements, so they are not drawn.
                if (dirs.length > 2 && q.gap > 180) return;
                const r = Math.max(18, Math.min(30, q.minLen * 0.4));
                const rad = (v) => v * Math.PI / 180;
                const pt = (ang, rr) => [cx + rr * Math.cos(rad(ang)), cy - rr * Math.sin(rad(ang))];
                // The members are drawn ~9px wide, so start/finish the arc at the
                // members' EDGES (not their centre lines): the arc then sits in
                // the opening between the two blue lines without overlapping them.
                let inset = Math.asin(Math.min(1, 5.5 / r)) * 180 / Math.PI;
                const minSpan = Math.min(10, q.gap * 0.5);
                if (q.gap - 2 * inset < minSpan) inset = Math.max(0, (q.gap - minSpan) / 2);
                const sa = q.a1 + inset, ea = q.a1 + q.gap - inset;
                const [sx, sy] = pt(sa, r);
                const [ex, ey] = pt(ea, r);
                svg += `<path class="fs-angle-arc" d="M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${(ea - sa) > 180 ? 1 : 0} 0 ${ex.toFixed(2)} ${ey.toFixed(2)}" fill="none" stroke="#7c3aed" stroke-width="1.6" stroke-linecap="round" pointer-events="none"/>`;
                const [lx, ly] = pt(q.a1 + q.gap / 2, r + 15);
                labelLayer.addText({
                    x: lx, y: ly + 3, text: `${Number(q.gap.toFixed(2))}°`,
                    fontSize: 10, fontWeight: "bold", color: "#6d28d9", textAnchor: "middle",
                    anchorX: cx, anchorY: cy, leader: false, halo: true, ownerNode: n.id,
                });
            });
        });
    }

    // Support symbols are shown consistently in every structural/result
    // diagram so the restrained boundary condition remains identifiable.
    model.supportAssignments.forEach((sa) => {
        let n = model.nodes.find((node) => node.id === sa.nodeId);
        if (n) {
            const supportType = getSupportVisualType(sa);
            const supportY =
                (supportType === "roller" || supportType === "hinged") ? ty(n.y) + 8 : ty(n.y) - 5;
            const supStart = svg.length;
            svg += drawSupportSymbol(tx(n.x), supportY, supportType);
            ownWrap(supStart, "node", sa.nodeId);
            if (mode === "model" && fsSupportLabelKeys.length) {
                const supText = getSelectedSupportLabelText(sa);
                if (supText) {
                    const supX = tx(n.x), supNodeY = ty(n.y);
                    labelLayer.addText({
                        x: supX, y: supportY + 38, text: supText,
                        fontSize: 10, fontWeight: "bold", color: "#334155", textAnchor: "middle",
                        anchorX: supX, anchorY: supNodeY, leader: false, halo: true, ownerNode: sa.nodeId,
                    });
                }
            }
        }
    });

    // Renders every input load and moment for the plain "model" diagram:
    // nodal loads, element point loads, element UDLs (including linearly-
    // varying and angled/local-axis variants), and nodal/element moments.
    // Kept as one function (mirroring the original inline block) because
    // every branch shares the same `svg`/`labelLayer` accumulators and the
    // same `maxLoad`/`maxMoment` auto-scale factors computed just above in
    // getStructureSVG — splitting further would mean threading half a dozen
    // shared values through extra parameters for no real gain in clarity.
    function drawModelModeLoadsAndMoments() {
        // Grid loads act normal to the XY plane (Fz), and Grid torsions use
        // Mx / My. They must not pass through the BTF-only Fx / Fy / Mz
        // renderer below, which would silently omit them from the model view.
        function drawGridLoadsAndTorsions() {
            const gridLoads = Array.isArray(model.loads) ? model.loads : [];
            const gridTorsions = Array.isArray(model.moments) ? model.moments : [];
            let maxFz = 0;
            let maxGridTorsion = 0;
            gridLoads.forEach((ld) => {
                const fz = Math.abs(Number(ld.Fz) || 0);
                maxFz = Math.max(maxFz, fz, Math.abs(Number(ld.FzEnd) || 0));
            });
            gridTorsions.forEach((m) => {
                maxGridTorsion = Math.max(maxGridTorsion, Math.abs(Number(m.Mx) || 0), Math.abs(Number(m.My) || 0));
            });

            const ratioOf = (value, maxValue) => maxValue > 0
                ? Math.max(0, Math.min(1, Math.abs(Number(value) || 0) / maxValue))
                : 0;
            const loadRadius = (value) => 2.8 + 2.6 * Math.sqrt(ratioOf(value, maxFz));
            const amount = (value) => formatNum(Math.abs(Number(value) || 0));
            // Negative loads are red; positive loads are light green. The
            // filled/open circle convention remains: filled = into the page,
            // open = out of the page.
            const gridLoadColor = (value) => Number(value) < 0 ? '#ef4444' : '#4ade80';

            // Filled red circle means Fz into the page; open light-green circle
            // means Fz out of the page. An optional radius lets a nodal load be
            // centered on the joint while leaving a colored ring around the
            // node marker, whose ID/coordinates remain on the top drawing layer.
            function drawGridLoadSymbol(x, y, fz, load, detail, radiusOverride = null, colorOverride = null) {
                const value = Number(fz) || 0;
                if (Math.abs(value) <= 1e-12) return 0;
                const intoPage = value < 0;
                const radius = radiusOverride !== null && radiusOverride !== undefined && Number.isFinite(Number(radiusOverride)) ? Number(radiusOverride) : loadRadius(value);
                const haloRadius = radius + 1.35;
                const ownStart = svg.length;
                const color = colorOverride || gridLoadColor(value);
                const id = String(load.id ?? '');
                const label = `${id ? `Load ${id}: ` : ''}${detail}; ${amount(value)} kN${intoPage ? ', into the page' : ', out of the page'}`;
                svg += `<g class="grid-diagram-symbol grid-load-symbol ${intoPage ? 'grid-load-into-page' : 'grid-load-out-of-page'}" data-grid-load-id="${escapeHtml(id)}" role="button" tabindex="0" aria-pressed="false" aria-label="${escapeHtml(label)}"><title>${escapeHtml(label)}</title>
                    <circle class="grid-symbol-hit" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(haloRadius + 5).toFixed(2)}" fill="transparent" stroke="transparent"/>
                    <circle class="grid-symbol-halo" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${haloRadius.toFixed(2)}" fill="#ffffff" stroke="#ffffff" stroke-width="1.5"/>
                    <circle class="grid-symbol-core" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius.toFixed(2)}" fill="${intoPage ? color : '#ffffff'}" stroke="${color}" stroke-width="${Math.max(1.1, radius * 0.28).toFixed(2)}"/>
                </g>`;
                if (String(load.type || '') === 'Nodal Load') ownWrap(ownStart, "node", load.nodeId);
                else ownWrap(ownStart, "member", memberIdx(load.elementId));
                return radius;
            }

            // Point along an element in screen coordinates. Grid load circles
            // deliberately use normalOffset=0 so they sit ON the blue member.
            function gridElementPoint(el, distance, normalOffset = 0) {
                const n1 = model.nodes.find((n) => String(n.id) === String(el.startNode));
                const n2 = model.nodes.find((n) => String(n.id) === String(el.endNode));
                if (!n1 || !n2) return null;
                const dx = Number(n2.x) - Number(n1.x);
                const dy = Number(n2.y) - Number(n1.y);
                const L = Math.hypot(dx, dy);
                if (L <= 1e-12) return null;
                const t = Math.max(0, Math.min(1, (Number(distance) || 0) / L));
                const x1 = tx(n1.x), y1 = ty(n1.y);
                const x2 = tx(n2.x), y2 = ty(n2.y);
                const sx = x1 + t * (x2 - x1);
                const sy = y1 + t * (y2 - y1);
                const screenL = Math.hypot(x2 - x1, y2 - y1);
                const nx = screenL > 1e-12 ? (y2 - y1) / screenL : 0;
                const ny = screenL > 1e-12 ? -(x2 - x1) / screenL : -1;
                return { x: sx + nx * normalOffset, y: sy + ny * normalOffset, baseX: sx, baseY: sy, n1, n2, L, t, nx, ny, x1, y1, x2, y2 };
            }

            // Choose a visually clear side of a joint for the nodal-load
            // magnitude label. No arrow is drawn for Grid nodal loads.
            function nodeLoadDirection(node) {
                const nx = tx(node.x), ny = ty(node.y);
                let vx = 0, vy = 0;
                model.elements.forEach((el) => {
                    const a = model.nodes.find((n) => String(n.id) === String(el.startNode));
                    const b = model.nodes.find((n) => String(n.id) === String(el.endNode));
                    if (!a || !b) return;
                    let other = null;
                    if (String(a.id) === String(node.id)) other = b;
                    else if (String(b.id) === String(node.id)) other = a;
                    if (!other) return;
                    const ox = tx(other.x) - nx, oy = ty(other.y) - ny;
                    const d = Math.hypot(ox, oy);
                    if (d > 1e-9) { vx += ox / d; vy += oy / d; }
                });
                // Point the label away from attached members.
                vx = -vx; vy = -vy;
                let d = Math.hypot(vx, vy);
                if (d < 0.2) { vx = -0.7071; vy = 0.7071; d = Math.hypot(vx, vy); }
                return { x: vx / d, y: vy / d };
            }

            // Single shaft, two stacked chevron heads pointing in the signed
            // torsion direction. Shaft length and thickness scale by magnitude.
            let currentTorsionOwner = null;
            function drawGridDoubleArrow(x, y, ux, uy, value, id, targetLabel, color, labelSide) {
                if (Math.abs(value) <= 1e-12) return;
                const r = ratioOf(value, maxGridTorsion);
                const length = 14 + 17 * Math.sqrt(r);
                const width = 1.8 + r * 0.9;
                const headLength = 5 + r * 1.8;
                const halfWidth = 3.1 + r * 1.5;
                const gap = 6 + r * 1.5;
                const ex = x + ux * length;
                const ey = y + uy * length;
                const px = -uy, py = ux;
                const head = (hx, hy) => {
                    const bx = hx - ux * headLength;
                    const by = hy - uy * headLength;
                    return `M ${(bx + px * halfWidth).toFixed(2)} ${(by + py * halfWidth).toFixed(2)} L ${hx.toFixed(2)} ${hy.toFixed(2)} L ${(bx - px * halfWidth).toFixed(2)} ${(by - py * halfWidth).toFixed(2)}`;
                };
                const hx2 = ex - ux * gap, hy2 = ey - uy * gap;
                const idText = String(id ?? '');
                const description = `${idText ? `Torsion ${idText}: ` : ''}${amount(value)} kN·m, ${targetLabel}`;
                const hitRadius = length / 2 + halfWidth + 8;
                const torsionOwnStart = svg.length;
                svg += `<g class="grid-diagram-symbol grid-torsion-symbol" data-grid-torsion-id="${escapeHtml(idText)}" role="button" tabindex="0" aria-pressed="false" aria-label="${escapeHtml(description)}"><title>${escapeHtml(description)}</title><circle class="grid-symbol-hit" cx="${((x + ex) / 2).toFixed(2)}" cy="${((y + ey) / 2).toFixed(2)}" r="${hitRadius.toFixed(2)}" fill="transparent" stroke="transparent"/><path d="M ${x.toFixed(2)} ${y.toFixed(2)} L ${ex.toFixed(2)} ${ey.toFixed(2)}" fill="none" stroke="${color}" stroke-width="${width.toFixed(2)}" stroke-linecap="round"/><path d="${head(ex, ey)} ${head(hx2, hy2)}" fill="none" stroke="${color}" stroke-width="${width.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
                // Keep the torsion value tied to the arrow end. The shared
                // collision-avoidance label layer can otherwise move nodal
                // torsion text far away when a load is present at the same joint.
                let labelX, labelY, textAnchor;
                if (labelSide === 'left' || labelSide === 'right') {
                    labelX = ex + ux * 5;
                    labelY = ey - 7;
                    textAnchor = labelSide === 'right' ? 'start' : 'end';
                } else {
                    labelX = ex + 8;
                    labelY = ey + (uy < 0 ? 0 : 10);
                    textAnchor = 'start';
                }
                const torsionLabelKey = currentTorsionOwner && currentTorsionOwner.kind === "member" ? "elementMoment" : "nodalMoment";
                if (fsLoadLabelKeys.includes(torsionLabelKey)) svg += `<text class="grid-torsion-value" x="${labelX.toFixed(2)}" y="${labelY.toFixed(2)}" text-anchor="${textAnchor}" dominant-baseline="middle" font-family="Arial" font-size="10" font-weight="700" fill="${color}" stroke="#ffffff" stroke-width="2.6" stroke-linejoin="round" paint-order="stroke fill" pointer-events="none">${amount(value)} kN·m</text>`;
                if (currentTorsionOwner) ownWrap(torsionOwnStart, currentTorsionOwner.kind, currentTorsionOwner.key);
            }

            gridLoads.forEach((ld) => {
                const fz = Number(ld.Fz) || 0;
                const type = String(ld.type || '');
                if (Math.abs(fz) <= 1e-12 && type !== 'Element UDL') return;
                if (!loadOptionOn(loadTypeKey(type))) return;

                if (type === 'Nodal Load') {
                    const node = model.nodes.find((n) => String(n.id) === String(ld.nodeId));
                    if (!node || Math.abs(fz) <= 1e-12) return;
                    const nodeX = tx(node.x), nodeY = ty(node.y);
                    const nodeRadius = 9.3333333333;
                    // Use the exact same magnitude-scaled circle radius as an
                    // element point load. Keep it concentric with the joint so
                    // the orange node marker naturally covers its center; the
                    // red/light-green magnitude label identifies the nodal load.
                    drawGridLoadSymbol(nodeX, nodeY, fz, ld,
                        `Nodal load at node ${ld.nodeId}`);

                    // Put only the magnitude beside the joint. If a torsion is
                    // applied at the same node, use the opposite side from its
                    // arrow direction to reduce label overlap. No load arrow is
                    // drawn for Grid nodal loads.
                    let direction = nodeLoadDirection(node);
                    const nodalTorsion = gridTorsions.filter((m) =>
                        String(m.nodeId) === String(node.id) &&
                        (m.type === 'Nodal Moment' || m.type === 'Nodal Torsion' || !m.elementId)
                    );
                    let torsionX = 0, torsionY = 0;
                    nodalTorsion.forEach((m) => {
                        torsionX += Math.sign(Number(m.Mx) || 0);
                        torsionY -= Math.sign(Number(m.My) || 0); // screen Y is inverted
                    });
                    const torsionLength = Math.hypot(torsionX, torsionY);
                    if (torsionLength > 1e-9) {
                        torsionX /= torsionLength; torsionY /= torsionLength;
                        if (direction.x * torsionX + direction.y * torsionY > 0.1) {
                            direction = { x: -direction.x, y: -direction.y };
                        }
                    }
                    const labelDistance = nodeRadius + 9;
                    const labelX = nodeX + direction.x * labelDistance;
                    const labelY = nodeY + direction.y * labelDistance + 2;
                    const textAnchor = direction.x > 0.25 ? 'start' : direction.x < -0.25 ? 'end' : 'middle';
                    addLoadLabel("nodal", {
                        x: labelX, y: labelY, text: `${amount(fz)} kN`,
                        fontSize: 10, fontWeight: 'bold', color: gridLoadColor(fz),
                        textAnchor, anchorX: nodeX, anchorY: nodeY,
                        leader: false, halo: true, ownerNode: ld.nodeId,
                    });
                    return;
                }

                if (type === 'Element Point Load' || type === 'Element Load' || type === 'Point Load') {
                    const el = model.elements.find((e) => String(e.id) === String(ld.elementId));
                    if (!el || Math.abs(fz) <= 1e-12) return;
                    const point = gridElementPoint(el, ld.distance, 0);
                    if (!point) return;
                    // Element point loads are purple (matching the existing
                    // BTF moment color), distinct from red/green nodal loads.
                    const pointLoadColor = '#8b5cf6';
                    const radius = drawGridLoadSymbol(point.x, point.y, fz, ld,
                        `Point load on element ${ld.elementId} at ${formatNum(Number(ld.distance) || 0)} m`,
                        null, pointLoadColor);
                    addLoadLabel("point", {
                        x: point.x + point.nx * (radius + 10),
                        y: point.y + point.ny * (radius + 8) - 2,
                        text: `${amount(fz)} kN`, fontSize: 10, fontWeight: 'bold',
                        color: pointLoadColor,
                        textAnchor: point.nx > 0.25 ? 'start' : point.nx < -0.25 ? 'end' : 'middle',
                        anchorX: point.x, anchorY: point.y, leader: false, halo: true, ownerMember: memberIdx(ld.elementId),
                    });
                    return;
                }

                if (type === 'Element UDL') {
                    const el = model.elements.find((e) => String(e.id) === String(ld.elementId));
                    if (!el) return;
                    const n1 = model.nodes.find((n) => String(n.id) === String(el.startNode));
                    const n2 = model.nodes.find((n) => String(n.id) === String(el.endNode));
                    if (!n1 || !n2) return;
                    const L = Math.hypot(Number(n2.x) - Number(n1.x), Number(n2.y) - Number(n1.y));
                    if (L <= 1e-12) return;
                    const a = Math.max(0, Math.min(L, Number(ld.distance) || 0));
                    const rawEnd = ld.distanceEnd === '' || ld.distanceEnd == null ? L : Number(ld.distanceEnd);
                    const b = Math.max(0, Math.min(L, Number.isFinite(rawEnd) ? rawEnd : L));
                    if (!(b > a)) return;
                    const q1 = Number(ld.Fz) || 0;
                    const q2 = ld.FzEnd !== '' && ld.FzEnd != null && Number.isFinite(Number(ld.FzEnd)) ? Number(ld.FzEnd) : q1;
                    const count = Math.max(5, Math.min(9, Math.round((b - a) / L * 8) + 3));
                    let middlePoint = null;
                    for (let i = 0; i <= count; i++) {
                        const ratio = i / count;
                        const dist = a + (b - a) * ratio;
                        const value = q1 + (q2 - q1) * ratio;
                        const point = gridElementPoint(el, dist, 0);
                        if (!point) continue;
                        drawGridLoadSymbol(point.x, point.y, value, ld,
                            `Distributed load on element ${ld.elementId}, ${formatNum(a)}–${formatNum(b)} m`, null, '#111827');
                        if (i === Math.floor(count / 2)) middlePoint = point;
                    }
                    if (middlePoint && (Math.abs(q1) > 1e-12 || Math.abs(q2) > 1e-12)) {
                        const intensity = Math.abs(q1 - q2) <= 1e-12
                            ? `${amount(q1)} kN/m`
                            : `${amount(q1)} → ${amount(q2)} kN/m`;
                        addLoadLabel("udl", {
                            x: middlePoint.x + middlePoint.nx * 20,
                            y: middlePoint.y + middlePoint.ny * 20 - 3,
                            text: intensity, fontSize: 10, fontWeight: 'bold', color: '#111827',
                            textAnchor: middlePoint.nx > 0.25 ? 'start' : middlePoint.nx < -0.25 ? 'end' : 'middle',
                            anchorX: middlePoint.x, anchorY: middlePoint.y, leader: false, halo: true, ownerMember: memberIdx(ld.elementId),
                        });
                    }
                }
            });

            // Grid torsions use signed directional arrows: positive Mx points
            // right, negative Mx left; positive My points up, negative My down.
            // Each directional arrow has one shaft and a double-chevron head.
            gridTorsions.forEach((m) => {
                const mx = Number(m.Mx) || 0;
                const my = Number(m.My) || 0;
                const isNodal = m.type === 'Nodal Moment' || m.type === 'Nodal Torsion' || (!!m.nodeId && !m.elementId);
                const isElement = m.type === 'Element Moment' || m.type === 'Element Torsion' || (!!m.elementId && !m.nodeId);
                if ((!isNodal && !isElement) || (Math.abs(mx) <= 1e-12 && Math.abs(my) <= 1e-12)) return;
                if (!loadOptionOn(isNodal ? 'nodalMoment' : 'elementMoment')) return;
                let point = null;
                if (isNodal) {
                    const node = model.nodes.find((n) => String(n.id) === String(m.nodeId));
                    if (!node) return;
                    point = { x: tx(node.x), y: ty(node.y) };
                } else {
                    const el = model.elements.find((e) => String(e.id) === String(m.elementId));
                    if (!el) return;
                    point = gridElementPoint(el, m.distance, 0);
                    if (!point) return;
                }
                const id = String(m.id ?? '');
                currentTorsionOwner = isNodal ? { kind: "node", key: m.nodeId } : { kind: "member", key: memberIdx(m.elementId) };
                const targetLabel = isNodal ? `at node ${m.nodeId}` : `on element ${m.elementId} at ${formatNum(Number(m.distance) || 0)} m`;
                if (Math.abs(mx) > 1e-12) {
                    const dir = mx > 0 ? 1 : -1;
                    // Start at the actual node/element point so the horizontal
                    // arrow visibly grows from the joint instead of floating.
                    drawGridDoubleArrow(point.x, point.y, dir, 0, mx, id, `${targetLabel}, horizontal direction`, '#7c3aed', dir > 0 ? 'right' : 'left');
                }
                if (Math.abs(my) > 1e-12) {
                    const dir = my > 0 ? -1 : 1; // SVG y-axis is inverted.
                    // For nodal torsion this begins at the node centre; the
                    // node marker is painted afterwards and stays on top.
                    drawGridDoubleArrow(point.x, point.y, 0, dir, my, id, `${targetLabel}, vertical direction`, '#0f766e', dir < 0 ? 'up' : 'down');
                }
            });

            // Element identifiers are redrawn after all load/torsion markers so
            // they stay readable over UDL circles. Node circles and coordinates
            // are still rendered later by the shared topmost node-marker layer.
            if (mode === 'model') {
                model.elements.forEach((el) => {
                    const n1 = model.nodes.find((n) => String(n.id) === String(el.startNode));
                    const n2 = model.nodes.find((n) => String(n.id) === String(el.endNode));
                    if (!n1 || !n2) return;
                    const x1 = tx(n1.x), y1 = ty(n1.y), x2 = tx(n2.x), y2 = ty(n2.y);
                    const len = Math.hypot(x2 - x1, y2 - y1);
                    if (len <= 1e-9) return;
                    const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
                    let angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
                    if (angle > 90) angle -= 180;
                    if (angle < -90) angle += 180;
                    const labelText = getSelectedElementLabelText(el, n1, n2);
                    if (labelText) {
                        svg += `<g class="grid-member-id" data-member="${model.elements.indexOf(el)}" pointer-events="none" transform="translate(${midX.toFixed(2)} ${midY.toFixed(2)}) rotate(${angle.toFixed(2)})"><text x="0" y="0.3" text-anchor="middle" dominant-baseline="middle" fill="#111827" font-family="Arial" font-size="8" font-weight="800">${escapeHtml(labelText)}</text></g>`;
                    }
                });
            }
        }

        if (isGridAnalysisMode()) {
            drawGridLoadsAndTorsions();
            return;
        }

        // Plane-mode Beam / Truss / Frame drawing logic below is intentionally
        // left unchanged; it continues to use Fx / Fy and Mz.
        model.loads.forEach((ld) => {
                if (!loadOptionOn(loadTypeKey(ld.type))) return;
                let isUDL = ld.type === "Element UDL";
                let color = isUDL ? "#f97316" : "#ef4444";

                if (ld.type === "Nodal Load") {
                    let comps = getGlobalLoadComponentsForDraw(ld, null);
                    let fx = comps.g1.x,
                        fy = comps.g1.y;
                    let mag = Math.hypot(fx, fy);
                    if (mag == 0) return;
                    let displayMag = Number(mag.toFixed(2));
                    let arrowLen = maxLoad > 0 ? 25 + (mag / maxLoad) * 30 : 40;
                    let dirX = fx / mag,
                        dirY = -fy / mag;

                    let n = model.nodes.find((node) => node.id === ld.nodeId);
                    if (n) {
                        let x = tx(n.x),
                            y = ty(n.y);

                        // Keep nodal-load graphics just above the joint so the
                        // arrowhead never enters or sits on top of the node circle.
                        // The same screen-space offset is used for vertical,
                        // horizontal and angled nodal loads.
                        const NODE_LOAD_OFFSET_Y = 11.3333333333;
                        const loadX = x;
                        const loadY = y - NODE_LOAD_OFFSET_Y;
                        let tx_tail = loadX - dirX * arrowLen,
                            ty_tail = loadY - dirY * arrowLen;
                        const nlStart = svg.length;
                        svg += drawSVGArrow(tx_tail, ty_tail, loadX, loadY, color);
                        ownWrap(nlStart, "node", ld.nodeId);
                        addLoadLabel("nodal", {
                            x: tx_tail + 2, y: ty_tail + 8, text: `${displayMag} kN`,
                            fontSize: 11, fontWeight: "bold", color,
                            anchorX: tx_tail, anchorY: ty_tail, leader: false, halo: false, ownerNode: ld.nodeId,
                        });
                    }
                } else if (ld.type === "Element Point Load" || ld.type === "Element Load") {
                    let el = model.elements.find((e) => e.id === ld.elementId);
                    if (el) {
                        let comps = getGlobalLoadComponentsForDraw(ld, el);
                        let fx = comps.g1.x,
                            fy = comps.g1.y;
                        let mag = Math.hypot(fx, fy);
                        if (mag == 0) return;
                        let displayMag = Number(mag.toFixed(2));
                        let arrowLen = maxLoad > 0 ? 25 + (mag / maxLoad) * 45 : 40;
                        let dirX = fx / mag,
                            dirY = -fy / mag;

                        let n1 = model.nodes.find((n) => n.id === el.startNode);
                        let n2 = model.nodes.find((n) => n.id === el.endNode);
                        if (n1 && n2) {
                            let L = Math.hypot(n2.x - n1.x, n2.y - n1.y);
                            let a = ld.distance || 0,
                                t = L > 0 ? a / L : 0.5;
                            if (t < 0) t = 0;
                            if (t > 1) t = 1;
                            let sx = tx(n1.x) + t * (tx(n2.x) - tx(n1.x)),
                                sy = ty(n1.y) + t * (ty(n2.y) - ty(n1.y)) - 6.5;
                            let tx_tail = sx - dirX * arrowLen,
                                ty_tail = sy - dirY * arrowLen;
                            const plStart = svg.length;
                            svg += drawSVGArrow(tx_tail, ty_tail, sx, sy, color);
                            ownWrap(plStart, "member", memberIdx(ld.elementId));
                            addLoadLabel("point", {
                                x: tx_tail, y: ty_tail - 5, text: `${displayMag} kN`,
                                fontSize: 11, fontWeight: "bold", color,
                                anchorX: tx_tail, anchorY: ty_tail, leaderColor: color, ownerMember: memberIdx(ld.elementId),
                            });
                        }
                    }
                } else if (ld.type === "Element UDL") {
                    let el = model.elements.find((e) => e.id === ld.elementId);
                    if (el) {
                        let n1 = model.nodes.find((n) => n.id === el.startNode);
                        let n2 = model.nodes.find((n) => n.id === el.endNode);
                        if (n1 && n2) {
                            let L = Math.hypot(n2.x - n1.x, n2.y - n1.y);
                            let a = ld.distance || 0;
                            let b =
                                ld.distanceEnd !== undefined && ld.distanceEnd !== ""
                                    ? Number(ld.distanceEnd)
                                    : L;

                            // Draw the UDL using its actual GLOBAL direction.
                            // For Angled loads, the entered angle is measured counter-clockwise
                            // from global +X; therefore every arrow must use that rotated
                            // direction in the diagram, independent of the member angle.
                            const g1 = getGlobalLoadComponentsForDraw(ld, el).g1;
                            const g2 = getGlobalLoadComponentsForDraw(ld, el).g2;
                            let Fx1 = g1.x,
                                Fy1 = g1.y;
                            let Fx2 = g2.x,
                                Fy2 = g2.y;

                            let t_start = L > 0 ? a / L : 0;
                            let t_end = L > 0 ? b / L : 1;
                            if (t_start < 0) t_start = 0;
                            if (t_end > 1) t_end = 1;
                            if (t_start >= t_end) return;

                            const udlOwnStart = svg.length;
                            let numArrows = 6,
                                tailX = [],
                                tailY = [],
                                pathD = "";

                            // The UDL top line is defined by arrow heights, not by the
                            // fixed minimum arrow length used for ordinary point loads.
                            // Take the first arrow height as the reference, then linearly
                            // interpolate that height by distance so every arrow lies on
                            // the same UDL slope and a zero-magnitude end reaches zero.
                            const startMag = Math.hypot(Fx1, Fy1);
                            const endMag = Math.hypot(Fx2, Fy2);
                            const firstArrowLen = startMag > 0
                                ? (maxLoad > 0 ? 25 + (startMag / maxLoad) * 45 : 40)
                                : 0;
                            const lastArrowLen = endMag > 0
                                ? (maxLoad > 0 ? 25 + (endMag / maxLoad) * 45 : 40)
                                : 0;

                            for (let i = 0; i <= numArrows; i++) {
                                let t_local = i / numArrows;
                                let t = t_start + t_local * (t_end - t_start);
                                let sx = tx(n1.x) + t * (tx(n2.x) - tx(n1.x));
                                let sy = ty(n1.y) + t * (ty(n2.y) - ty(n1.y)) - 6.5;

                                let curFx = Fx1 + t_local * (Fx2 - Fx1);
                                let curFy = Fy1 + t_local * (Fy2 - Fy1);
                                const mag = Math.hypot(curFx, curFy);

                                if (mag > 0) {
                                    // SVG uses +Y downward, while structural global +Y is upward.
                                    // Convert the real global load vector to screen direction only here.
                                    const dirX = curFx / mag;
                                    const dirY = -curFy / mag;
                                    const arrowLen = firstArrowLen + (lastArrowLen - firstArrowLen) * t_local;
                                    let tx_tail = sx - dirX * arrowLen,
                                        ty_tail = sy - dirY * arrowLen;
                                    tailX.push(tx_tail);
                                    tailY.push(ty_tail);
                                    svg += drawSVGArrow(tx_tail, ty_tail, sx, sy, color);
                                    if (i === 0) pathD += `M ${tx_tail} ${ty_tail} `;
                                    else pathD += `L ${tx_tail} ${ty_tail} `;
                                } else if (i === numArrows) {
                                    // A zero-intensity endpoint is part of the same straight
                                    // UDL taper, so its arrow height is exactly zero and the
                                    // slope line terminates at the actual zero-magnitude point.
                                    pathD += `L ${sx} ${sy} `;
                                }
                            }
                            if (tailX.length > 0) {
                                svg += `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="2"/>`;
                                ownWrap(udlOwnStart, "member", memberIdx(ld.elementId));

                                // For a varying UDL, place each end magnitude at its
                                // corresponding end of the load diagram rather than
                                // combining both values into one centered label.
                                // The label for the larger magnitude is above the
                                // visually highest end; the smaller magnitude is below
                                // the visually lowest end. No connecting arrow is used.
                                if (Math.abs(startMag - endMag) > 1e-12) {
                                    const startT = t_start;
                                    const endT = t_end;
                                    const startSx = tx(n1.x) + startT * (tx(n2.x) - tx(n1.x));
                                    const startSy = ty(n1.y) + startT * (ty(n2.y) - ty(n1.y)) - 6.5;
                                    const endSx = tx(n1.x) + endT * (tx(n2.x) - tx(n1.x));
                                    const endSy = ty(n1.y) + endT * (ty(n2.y) - ty(n1.y)) - 6.5;

                                    const startArrowLen = firstArrowLen;
                                    const endArrowLen = lastArrowLen;

                                    const startDirX = startMag > 0 ? Fx1 / startMag : 0;
                                    const startDirY = startMag > 0 ? -Fy1 / startMag : 0;
                                    const endDirX = endMag > 0 ? Fx2 / endMag : 0;
                                    const endDirY = endMag > 0 ? -Fy2 / endMag : 0;

                                    const startPoint = {
                                        x: startSx - startDirX * startArrowLen,
                                        y: startSy - startDirY * startArrowLen
                                    };
                                    const endPoint = {
                                        x: endSx - endDirX * endArrowLen,
                                        y: endSy - endDirY * endArrowLen
                                    };

                                    const highMag = Math.max(startMag, endMag);
                                    const lowMag = Math.min(startMag, endMag);
                                    const highPoint = startMag >= endMag ? startPoint : endPoint;
                                    const lowPoint = startMag >= endMag ? endPoint : startPoint;

                                    // Keep the UDL magnitude labels aligned with the actual
                                    // slope of the UDL load diagram. Normalize the angle so
                                    // the text stays readable rather than appearing upside down.
                                    let udlLabelAngle = Math.atan2(
                                        endPoint.y - startPoint.y,
                                        endPoint.x - startPoint.x,
                                    ) * 180 / Math.PI;
                                    if (udlLabelAngle > 90) udlLabelAngle -= 180;
                                    if (udlLabelAngle <= -90) udlLabelAngle += 180;

                                    addLoadLabel("udl", {
                                        x: highPoint.x,
                                        y: highPoint.y - 8,
                                        text: `${Number(highMag.toFixed(2))} kN/m`,
                                        fontSize: 11, fontWeight: "bold", color, angle: udlLabelAngle,
                                        anchorX: highPoint.x, anchorY: highPoint.y,
                                        leader: false, leaderColor: color, ownerMember: memberIdx(ld.elementId),
                                    });

                                    addLoadLabel("udl", {
                                        x: lowPoint.x,
                                        y: lowPoint.y - 11,
                                        text: `${Number(lowMag.toFixed(2))} kN/m`,
                                        fontSize: 11, fontWeight: "bold", color, angle: udlLabelAngle,
                                        anchorX: lowPoint.x, anchorY: lowPoint.y,
                                        leader: false, leaderColor: color, ownerMember: memberIdx(ld.elementId),
                                    });
                                } else {
                                    const mx_tail = (tailX[0] + tailX[tailX.length - 1]) / 2;
                                    const my_tail = (tailY[0] + tailY[tailY.length - 1]) / 2;
                                    // The constant UDL follows the same straight load-diagram
                                    // line, so align its single magnitude label to that slope.
                                    let udlLabelAngle = Math.atan2(
                                        tailY[tailY.length - 1] - tailY[0],
                                        tailX[tailX.length - 1] - tailX[0],
                                    ) * 180 / Math.PI;
                                    if (udlLabelAngle > 90) udlLabelAngle -= 180;
                                    if (udlLabelAngle <= -90) udlLabelAngle += 180;
                                    addLoadLabel("udl", {
                                        x: mx_tail - 20, y: my_tail - 8, text: `${Number(startMag.toFixed(2))} kN/m`,
                                        fontSize: 11, fontWeight: "bold", color, angle: udlLabelAngle,
                                        anchorX: mx_tail, anchorY: my_tail, leader: false, leaderColor: color, ownerMember: memberIdx(ld.elementId),
                                    });
                                }
                            }
                        }
                    }
                }
            });

        model.moments.forEach((m) => {
            const mz = Number(m.Mz) || 0;
            if (mz === 0) return;
            if (!loadOptionOn(momentTypeKey(m.type))) return;
            const r = maxMoment > 0 ? 9.3333333333 + (Math.abs(mz) / maxMoment) * 4.4444444445 : 12;
            const color = "#8b5cf6";
            const anticlockwise = mz > 0;

            if (m.type === "Nodal Moment") {
                const n = model.nodes.find((node) => node.id === m.nodeId);
                if (n) {
                    const x = tx(n.x);
                    const y = ty(n.y);
                    const nmStart = svg.length;
                    svg += drawMomentArrow(x, y, r, anticlockwise, color);
                    ownWrap(nmStart, "node", m.nodeId);
                    addLoadLabel("nodalMoment", {
                        x: x + r - 1, y: y + r - 20.6666666667, text: `${Number(Math.abs(mz).toFixed(2))} kN·m`,
                        fontSize: 11, fontWeight: "bold", color,
                        anchorX: x, anchorY: y, leader: false, leaderColor: color, ownerNode: m.nodeId,
                    });
                }
            } else if (m.type === "Element Moment") {
                const el = model.elements.find((e) => e.id === m.elementId);
                if (el) {
                    const n1 = model.nodes.find((n) => n.id === el.startNode);
                    const n2 = model.nodes.find((n) => n.id === el.endNode);
                    if (n1 && n2) {
                        const L = Math.hypot(n2.x - n1.x, n2.y - n1.y);
                        let a = Number(m.distance) || 0;
                        const t = L > 0 ? Math.max(0, Math.min(1, a / L)) : 0.5;
                        const x = tx(n1.x) + t * (tx(n2.x) - tx(n1.x));
                        const y = ty(n1.y) + t * (ty(n2.y) - ty(n1.y));
                        const emStart = svg.length;
                        svg += drawMomentArrow(x, y, r, anticlockwise, color);
                        ownWrap(emStart, "member", memberIdx(m.elementId));
                        addLoadLabel("elementMoment", {
                            x: x + r + 2, y: y + r - 30, text: `${Number(Math.abs(mz).toFixed(2))} kN·m`,
                            fontSize: 11, fontWeight: "bold", color,
                            anchorX: x, anchorY: y, leader: false, leaderColor: color, ownerMember: memberIdx(m.elementId),
                        });
                    }
                }
            }
        });
    }

    if (mode === "model") {
        drawModelModeLoadsAndMoments();
    }

    if (mode === "displacement") {
        drawDisplacementDiagram();
    }

    // Draws the "displacement" (deformed shape) diagram: scales every
    // solved nodal translation by a fixed visual envelope (28% of the
    // structure's largest dimension) so the deformation stays readable
    // regardless of actual magnitude, then interpolates a smooth deformed
    // shape along each element using its local translations and end
    // rotations (cubic Hermite shape functions), and overlays the
    // undeformed structure as a dashed reference outline.
    function drawDisplacementDiagram() {
        const disp = model.nodeDisplacements || {};
        let maxDisp = 0;
        Object.values(disp).forEach((d) => {
            if (!d) return;
            const mag = isGridAnalysisMode()
                ? Math.abs(Number(d.deltaZ) || 0)
                : Math.hypot(Number(d.ux) || 0, Number(d.uy) || 0);
            if (mag > maxDisp) maxDisp = mag;
        });

        if (maxDisp <= 1e-14) {
            svg += `<text x="${width / 2}" y="${height / 2}" fill="#64748b" font-family="Arial" font-size="14" font-weight="600" text-anchor="middle">All calculated nodal translations are zero — no visible deformation.</text>`;
        } else {
            // Keep deformation visually readable while preserving the actual
            // relative deformation pattern. The scale is visualization-only.
            const deformationScale = (0.28 * maxDim) / maxDisp;

            const screenPoint = (x, y) => ({ x: tx(x), y: ty(y) });
            const interpolateDeformedPoint = (n1, n2, t, L, cx, cy, d1, d2) => {
                // Grid's solved ΔZ is normal to the XY layout. The shared 2D
                // diagram projects it onto the displayed Y direction and uses
                // the member-local θY component to preserve the bending shape.
                if (isGridAnalysisMode()) {
                    const w1 = Number(d1.deltaZ) || 0;
                    const w2 = Number(d2.deltaZ) || 0;
                    const slope1 = -(Number(d1.thetaX) || 0) * cy + (Number(d1.thetaY) || 0) * cx;
                    const slope2 = -(Number(d2.thetaX) || 0) * cy + (Number(d2.thetaY) || 0) * cx;
                    const H1 = 1 - 3 * t * t + 2 * t * t * t;
                    const H2 = L * (t - 2 * t * t + t * t * t);
                    const H3 = 3 * t * t - 2 * t * t * t;
                    const H4 = L * (-t * t + t * t * t);
                    return {
                        x: n1.x + (n2.x - n1.x) * t,
                        y: n1.y + (n2.y - n1.y) * t + (H1 * w1 + H2 * slope1 + H3 * w2 + H4 * slope2) * deformationScale,
                    };
                }
                const u1 = (d1.ux || 0) * cx + (d1.uy || 0) * cy;
                const v1 = -(d1.ux || 0) * cy + (d1.uy || 0) * cx;
                const u2 = (d2.ux || 0) * cx + (d2.uy || 0) * cy;
                const v2 = -(d2.ux || 0) * cy + (d2.uy || 0) * cx;
                const th1 = d1.rz || 0;
                const th2 = d2.rz || 0;

                // Linear axial interpolation + cubic Hermite bending shape
                // functions for transverse displacement.
                const N1 = 1 - t;
                const N2 = t;
                const H1 = 1 - 3 * t * t + 2 * t * t * t;
                const H2 = L * (t - 2 * t * t + t * t * t);
                const H3 = 3 * t * t - 2 * t * t * t;
                const H4 = L * (-t * t + t * t * t);

                const u = (N1 * u1 + N2 * u2) * deformationScale;
                const v = (H1 * v1 + H2 * th1 + H3 * v2 + H4 * th2) * deformationScale;

                const baseX = n1.x + (n2.x - n1.x) * t;
                const baseY = n1.y + (n2.y - n1.y) * t;
                return {
                    x: baseX + u * cx - v * cy,
                    y: baseY + u * cy + v * cx,
                };
            };

            // Original geometry as a quiet reference.
            model.elements.forEach((el) => {
                const n1 = model.nodes.find((n) => n.id === el.startNode);
                const n2 = model.nodes.find((n) => n.id === el.endNode);
                if (!n1 || !n2) return;
                const p1 = screenPoint(n1.x, n1.y);
                const p2 = screenPoint(n2.x, n2.y);
                const refStart = svg.length;
                svg += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6 4"/>`;
                ownWrap(refStart, "member", model.elements.indexOf(el));
            });

            // Deformed shape, sampled finely enough to make frame bending
            // smooth instead of a simple straight-node displacement plot.
            model.elements.forEach((el) => {
                const n1 = model.nodes.find((n) => n.id === el.startNode);
                const n2 = model.nodes.find((n) => n.id === el.endNode);
                const d1 = disp[n1?.id];
                const d2 = disp[n2?.id];
                if (!n1 || !n2 || !d1 || !d2) return;

                const dx = n2.x - n1.x;
                const dy = n2.y - n1.y;
                const L = Math.hypot(dx, dy);
                if (L <= 1e-12) return;
                const cx = dx / L;
                const cy = dy / L;

                let path = "";
                const samples = 48;
                for (let i = 0; i <= samples; i++) {
                    const t = i / samples;
                    const p = interpolateDeformedPoint(n1, n2, t, L, cx, cy, d1, d2);
                    const sp = screenPoint(p.x, p.y);
                    path += `${i === 0 ? "M" : "L"} ${sp.x} ${sp.y} `;
                }
                const defStart = svg.length;
                svg += `<path d="${path}" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>`;

                // A few deformation vectors make the scale and direction obvious.
                for (let i = 0; i <= 4; i++) {
                    const t = i / 4;
                    const base = { x: n1.x + dx * t, y: n1.y + dy * t };
                    const p = interpolateDeformedPoint(n1, n2, t, L, cx, cy, d1, d2);
                    const deltaX = p.x - base.x;
                    const deltaY = p.y - base.y;
                    const mag = Math.hypot(deltaX, deltaY);
                    if (mag <= 1e-10) continue;
                    const b = screenPoint(base.x, base.y);
                    const q = screenPoint(p.x, p.y);
                    svg += drawSVGArrow(b.x, b.y, q.x, q.y, "#60a5fa").replace(/stroke-width="2"/g, 'stroke-width="1.2"');
                }
                ownWrap(defStart, "member", model.elements.indexOf(el));
            });

            // Deformed joint locations and displacement labels.
            model.nodes.forEach((n) => {
                const d = disp[n.id];
                if (!d) return;
                const projectedOffset = isGridAnalysisMode()
                    ? (Number(d.deltaZ) || 0) * deformationScale
                    : (Number(d.uy) || 0) * deformationScale;
                const p = screenPoint(n.x + (isGridAnalysisMode() ? 0 : (d.ux || 0) * deformationScale), n.y + projectedOffset);
                const original = screenPoint(n.x, n.y);
                const dnStart = svg.length;
                svg += `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#2563eb" stroke="#1e3a8a" stroke-width="1"/>`;
                svg += `<line x1="${original.x}" y1="${original.y}" x2="${p.x}" y2="${p.y}" stroke="#93c5fd" stroke-width="1" stroke-dasharray="3 3"/>`;
                ownWrap(dnStart, "node", n.id);
                const mag = isGridAnalysisMode() ? Math.abs(Number(d.deltaZ) || 0) : Math.hypot(d.ux || 0, d.uy || 0);
                labelLayer.addText({
                    x: p.x + 8, y: p.y - 8, text: `${n.id}: ${formatNum(mag)}`,
                    fontSize: 10, fontWeight: "700", color: "#1d4ed8",
                    anchorX: p.x, anchorY: p.y, leaderColor: "#1d4ed8", ownerNode: n.id,
                });
            });

        }
    }

    if (mode === "reactions") {
        drawReactionsDiagram();
    }

    // Draws the "reactions" diagram: for every support, a leader line to a
    // label card listing GLOBAL Rx/Ry/Mz and LOCAL (member-axis) Fx′/Fy′/Mz′,
    // laid out via the shared label-collision engine (labelLayer) so cards
    // never overlap the structure or each other, at any zoom level.
    function drawReactionsDiagram() {
        // Reactions are solved in GLOBAL coordinates. The diagram reports
        // both GLOBAL and LOCAL reaction components so the plotted values
        // can be matched directly to the two coordinate systems shown in
        // the final reaction table. In 2D, Mz is invariant under in-plane
        // axis rotation, so Global Mz = Local Mz.
        //
        // Pure label-box layout (STAAD Pro / Bentley style): no arrows or
        // arcs are drawn at the joint at all. Each support only gets a
        // dashed leader line to a value card listing Rx/Ry/Mz. Card
        // positions are pushed out into open space, then run through a
        // simple separation pass so no two cards can ever land on top of
        // one another - this holds for any number of supports at any angle.
        const frameNodes = model.nodes.filter(Boolean);
        const frameCenter = frameNodes.length
            ? {
                  x: frameNodes.reduce((sum, node) => sum + node.x, 0) / frameNodes.length,
                  y: frameNodes.reduce((sum, node) => sum + node.y, 0) / frameNodes.length,
              }
            : { x: 0, y: 0 };

        const cards = [];

        model.supportAssignments.forEach((sa) => {
            const n = model.nodes.find((node) => node.id === sa.nodeId);
            if (!n) return;

            const local = getReactionLocalComponents(sa);
            const globalFx = Number(sa.rx) || 0;
            const globalFy = Number(sa.ry) || 0;
            const globalMz = Number(sa.rz) || 0;
            const nodeX = tx(n.x);
            const nodeY = ty(n.y);

            const lines = [];
            if (isGridAnalysisMode()) {
                if (Math.abs(globalFx) > 1e-5) lines.push({ text: `Mx = ${Number(globalFx.toFixed(2))} kN·m`, color: "#7c3aed" });
                if (Math.abs(globalFy) > 1e-5) lines.push({ text: `My = ${Number(globalFy.toFixed(2))} kN·m`, color: "#7c3aed" });
                if (Math.abs(globalMz) > 1e-5) lines.push({ text: `Fz = ${Number(globalMz.toFixed(2))} kN`, color: "#2563eb" });
            } else {
                if (Math.abs(globalFx) > 1e-5 || Math.abs(globalFy) > 1e-5) {
                    lines.push({ text: `Global Fx = ${Number(globalFx.toFixed(2))} kN`, color: "#2563eb" });
                    lines.push({ text: `Global Fy = ${Number(globalFy.toFixed(2))} kN`, color: "#2563eb" });
                }
                if (Math.abs(globalMz) > 1e-5) {
                    lines.push({ text: `Global Mz = ${Number(globalMz.toFixed(2))} kN·m`, color: "#7c3aed" });
                }
            }
            if (lines.length === 0) return;

            // --- Outward direction, used to push the label card into open
            // space (away from the structure's own centroid on screen) -----
            const worldDx = n.x - frameCenter.x;
            const worldDy = n.y - frameCenter.y;
            let ox = worldDx, oy = -worldDy;
            let omag = Math.hypot(ox, oy);
            if (omag < 1e-6) { ox = 0; oy = 1; omag = 1; }
            ox /= omag; oy /= omag;

            cards.push({ nodeX, nodeY, ox, oy, lines, nodeId: sa.nodeId });
        });

        // --- Size each card to fit exactly the text it needs to show -------
        const lineHeight = 14, padX = 8, padY = 6, charWidth = 5.4;
        cards.forEach((c) => {
            const maxChars = Math.max(...c.lines.map((l) => l.text.length));
            c.width = maxChars * charWidth + padX * 2;
            c.height = c.lines.length * lineHeight + padY * 2;
        });

        // --- Place each card out past the joint. Final separation from
        // every other label on the diagram (other cards, node IDs, member
        // length labels, ...) is handled once, uniformly, by the shared
        // label-collision engine (labelLayer.resolve, called once at the
        // end of this function) instead of a separate bespoke pass. -------
        const baseGap = 20;
        cards.forEach((c) => {
            const dist = baseGap + Math.hypot(c.width, c.height) / 2;
            c.cx = c.nodeX + c.ox * dist;
            c.cy = c.nodeY + c.oy * dist;
        });

        cards.forEach((c) => {
            labelLayer.addBlock({
                x: c.cx, y: c.cy, w: c.width + 12, h: c.height + 10,
                anchorX: c.nodeX, anchorY: c.nodeY, leader: false, ownerNode: c.nodeId,
                render: (cx, cy) => {
                    const left = cx - c.width / 2;
                    const top = cy - c.height / 2;
                    const dx = c.nodeX - cx, dy = c.nodeY - cy;
                    let edgeX = cx, edgeY = cy;
                    if (dx !== 0 || dy !== 0) {
                        const scaleX = dx !== 0 ? (c.width / 2) / Math.abs(dx) : Infinity;
                        const scaleY = dy !== 0 ? (c.height / 2) / Math.abs(dy) : Infinity;
                        const s = Math.min(scaleX, scaleY);
                        edgeX = cx + dx * s;
                        edgeY = cy + dy * s;
                    }
                    let out = "";
                    out += `<rect x="${left}" y="${top}" width="${c.width}" height="${c.height}" rx="5" fill="white" fill-opacity="0.97" stroke="#cbd5e1" stroke-width="1.1"/>`;
                    c.lines.forEach((line, idx) => {
                        const ly = top + padY + idx * lineHeight + lineHeight * 0.74;
                        out += `<text x="${cx}" y="${ly}" fill="${line.color}" font-family="Arial" font-size="10" font-weight="700" text-anchor="middle">${line.text}</text>`;
                    });
                    return out;
                },
            });
        });
    }

    if (mode === "afd" || mode === "sfd" || mode === "bmd") {
        drawInternalActionDiagram();
    }

    // Draws the AFD/SFD/BMD internal-action diagram curve for every solved
    // element: samples calculateInternalActionsAtPosition() at each of the
    // candidate x-positions, offsets each point perpendicular to the member
    // by the appropriate pre-computed scale (scaleA/scaleV/scaleM from
    // computeInternalActionExtremes(), see above), fills contiguous
    // positive/negative sign regions, hatches them, and — for BMD only —
    // labels every local peak/valley.
    function drawInternalActionDiagram() {
        // Labels already queued for BMD, shared across members so the same
        // value at a shared joint is printed once instead of once per member.
        const placedBmdLabels = [];
        // Per-member diagram outlines / axes and the value labels waiting to be
        // placed. Labels are placed AFTER every member is drawn so each one can
        // avoid the other members' diagrams (see placeActionLabels below).
        const actionRegions = [];
        const pendingActionLabels = [];
        model.elements.forEach((el, ei) => {
            if (!el.plotData) return;
            let n1 = model.nodes.find((n) => n.id === el.startNode);
            let pd = el.plotData;

            let xs = [];
            for (let i = 0; i <= 50; i++) xs.push((i / 50) * pd.L);
            pd.pointLoads.forEach((pl) => {
                xs.push(pl.a - 1e-6);
                xs.push(pl.a + 1e-6);
            });
            pd.localPointMoments.forEach((pm) => {
                xs.push(pm.a - 1e-6);
                xs.push(pm.a + 1e-6);
            });
            pd.localUDLs.forEach((udl) => {
                xs.push(udl.a);
                xs.push(udl.b);
            });
            xs.sort((a, b) => a - b);

            // Builds one plotted point of this member's diagram at position x.
            const makePt = (x) => {
                const { A: A_ax, V, M } = calculateInternalActionsAtPosition(pd, x);

                let offset = 0;
                if (mode === "afd") offset = A_ax * scaleA;
                if (mode === "sfd") offset = V * scaleV;
                if (mode === "bmd") offset = M * scaleM;

                let gx = n1.x + x * pd.cx;
                let gy = n1.y + x * pd.cy;

                let ox = gx - offset * pd.cy;
                let oy = gy + offset * pd.cx;

                return {
                    tx: tx(ox),
                    ty: ty(oy),
                    baseTx: tx(gx),
                    baseTy: ty(gy),
                    A: A_ax,
                    V: V,
                    M: M,
                    x: x,
                };
            };
            let pts = xs.map(makePt);

            if (pts.length === 0) return;

            // Everything drawn for this member's diagram (fills + hatching) is
            // grouped so it can be focused / brought to front as one unit.
            svg += `<g class="sf-diagram" data-member="${ei}">`;

            // Preserve the original diagram geometry, opacity, hatching, line widths,
            // and hatch spacing. Only the COLOR changes according to the sign of the
            // plotted quantity. Positive/negative regions are split only for coloring.
            const diagramColors = {
                afd: { positive: "#16a34a", negative: "#db2777" },
                sfd: { positive: "#2563eb", negative: "#f59e0b" },
                bmd: { positive: "#dc2626", negative: "#7c3aed" },
            };
            const valueForMode = (p) =>
                mode === "afd" ? p.A : mode === "sfd" ? p.V : p.M;
            const colorForValue = (v) =>
                v < -1e-12 ? diagramColors[mode].negative : diagramColors[mode].positive;

            // Draw the filled diagram in contiguous sign regions. All original SVG
            // styling values are kept exactly: fill opacity 0.2, stroke-width 1.5,
            // hatch stroke-width 0.5 and hatch opacity 0.5.
            function addSignRegion(start, end, color) {
                if (end - start < 1) return;
                let rd = `M ${pts[start].baseTx} ${pts[start].baseTy} `;
                for (let j = start; j <= end; j++) rd += `L ${pts[j].tx} ${pts[j].ty} `;
                for (let j = end; j >= start; j--) rd += `L ${pts[j].baseTx} ${pts[j].baseTy} `;
                svg += `<path d="${rd}" fill="${mode === "afd" ? (color === diagramColors[mode].positive ? "rgba(34, 197, 94, 0.2)" : "rgba(219, 39, 119, 0.2)") : mode === "sfd" ? (color === diagramColors[mode].positive ? "rgba(59, 130, 246, 0.2)" : "rgba(245, 158, 11, 0.2)") : (color === diagramColors[mode].positive ? "rgba(239, 68, 68, 0.2)" : "rgba(124, 58, 237, 0.2)")}" stroke="${color}" stroke-width="1.5"/>`;
            }

            // The original base fill colors remain the fill colors; only the visible
            // stroke is sign-coded. This avoids changing opacity/shading/patterns.
            let regionStart = 0;
            let regionColor = colorForValue(valueForMode(pts[0]));
            for (let i = 1; i < pts.length; i++) {
                const nextColor = colorForValue(valueForMode(pts[i]));
                if (nextColor !== regionColor) {
                    addSignRegion(regionStart, i - 1, regionColor);
                    regionStart = i - 1;
                    regionColor = nextColor;
                    if (regionStart > 0) {
                        // Re-draw the boundary point as part of the new region so the
                        // original continuous diagram edge remains visually identical.
                        continue;
                    }
                }
            }
            addSignRegion(regionStart, pts.length - 1, regionColor);

            // Keep the original hatch pattern exactly: same every-2-point spacing,
            // direction, width and opacity. Only hatch color follows the local sign.
            for (let i = 0; i < pts.length; i += 2) {
                const hatchColor = colorForValue(valueForMode(pts[i]));
                svg += `<line x1="${pts[i].baseTx}" y1="${pts[i].baseTy}" x2="${pts[i].tx}" y2="${pts[i].ty}" stroke="${hatchColor}" stroke-width="0.5" opacity="0.5"/>`;
            }

            svg += `</g>`;

            {
                const poly = pts.map((q) => [q.tx, q.ty]).concat(pts.slice().reverse().map((q) => [q.baseTx, q.baseTy]));
                actionRegions.push({
                    key: ei, poly,
                    axis: [pts[0].baseTx, pts[0].baseTy, pts[pts.length - 1].baseTx, pts[pts.length - 1].baseTy],
                });
            }

            {
                // Value labels for AFD / SFD / BMD. Every important value of the
                // member is labelled:
                //   1. both end values,
                //   2. the largest value of every positive / negative part
                //      (for the BMD also the exact peak where the shear is zero),
                //   3. both sides of every jump of the diagram (a point load / moment
                //      makes the diagram jump, e.g. from + to - or - to +).
                const tol = 1e-9;
                const unit = mode === "bmd" || (isGridAnalysisMode() && mode === "afd") ? "kN·m" : "kN";
                const valueOf = (q) => valueForMode(q);
                const shown = (q) => Math.abs(Number(valueOf(q)) || 0).toFixed(2);

                // Candidate points: the plotted samples (+ the exact BMD peaks).
                const cand = pts.slice();
                if (mode === "bmd") {
                    for (let i = 0; i < pts.length - 1; i++) {
                        const v0 = pts[i].V, v1 = pts[i + 1].V;
                        if (pts[i + 1].x - pts[i].x < 1e-4) continue; // a jump, not a smooth span
                        if (v0 * v1 < 0) {
                            const xr = pts[i].x + ((pts[i + 1].x - pts[i].x) * v0) / (v0 - v1);
                            cand.push(makePt(xr));
                        }
                    }
                    cand.sort((p, q) => p.x - q.x);
                }

                const chosen = [];
                const choose = (q) => { if (q && !chosen.includes(q)) chosen.push(q); };

                // 1. both ends
                choose(pts[0]);
                choose(pts[pts.length - 1]);

                // 2. maximum of every sign region
                const signOf = (q) => {
                    const v = Number(valueOf(q)) || 0;
                    return Math.abs(v) <= tol ? 0 : v > 0 ? 1 : -1;
                };
                let regBest = null, regSign = 0;
                cand.forEach((q) => {
                    const sg = signOf(q);
                    if (sg === 0) return;
                    if (regBest === null || sg !== regSign) {
                        if (regBest) choose(regBest);
                        regBest = q; regSign = sg;
                    } else if (Math.abs(valueOf(q)) > Math.abs(valueOf(regBest))) {
                        regBest = q;
                    }
                });
                if (regBest) choose(regBest);

                // 3. both sides of every jump (samples taken either side of a load)
                for (let i = 0; i < pts.length; ) {
                    let j = i;
                    while (j + 1 < pts.length && pts[j + 1].x - pts[j].x < 1e-4) j++;
                    if (j > i) {
                        const first = pts[i], last = pts[j];
                        if (Math.abs(valueOf(first) - valueOf(last)) > 1e-6) {
                            choose(first);
                            choose(last);
                        }
                    }
                    i = j + 1;
                }

                chosen.forEach((p) => {
                    const txt = shown(p);
                    if (Math.abs(Number(valueOf(p)) || 0) <= tol || txt === "0.00") return;
                    // Same value already labelled at (almost) the same spot, e.g. at a
                    // joint shared by two members: print it once.
                    const signKey = (Number(valueOf(p)) < 0 ? '-' : '+') + txt;
                    if (placedBmdLabels.some((q) => q.key === signKey && Math.hypot(q.x - p.tx, q.y - p.ty) < 6)) return;
                    // Same value right beside a label of this member: skip the repeat.
                    if (pendingActionLabels.some((q) => q.key === ei && q.text === `${txt} ${unit}` && q.color === colorForValue(valueOf(p)) && Math.hypot(q.p.tx - p.tx, q.p.ty - p.ty) < 40)) return;
                    placedBmdLabels.push({ key: signKey, x: p.tx, y: p.ty });
                    pendingActionLabels.push({
                        p, text: `${txt} ${unit}`, color: colorForValue(valueOf(p)), key: ei,
                    });
                });
            }
        });
        placeActionLabels(actionRegions, pendingActionLabels);
    }

    // Places every AFD/SFD/BMD value label so it is unambiguous which diagram
    // it belongs to. For each label many candidate spots around its own point
    // are scored; a spot is rejected if it would sit on another member's
    // diagram, a member line, a node, or another label. The nearest clean spot
    // wins, and whenever a label could not stay right at its point a thin
    // leader line (same colour) with a dot marks the exact value it describes.
    function placeActionLabels(regions, labels) {
        const fontSize = 12, pad = 3;
        const nodeBoxes = model.nodes.map((n) => ({ x: tx(n.x), y: ty(n.y), r: actionNodeRadius }));
        const placed = [];

        // Bounding box per region so far-away members are skipped immediately
        // (keeps placement fast on models with many members).
        regions.forEach((rg) => {
            let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            rg.poly.forEach((q) => {
                if (q[0] < x0) x0 = q[0];
                if (q[0] > x1) x1 = q[0];
                if (q[1] < y0) y0 = q[1];
                if (q[1] > y1) y1 = q[1];
            });
            rg.bb = [x0, y0, x1, y1];
        });

        const inPoly = (poly, x, y) => {
            let inside = false;
            for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
                if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi) inside = !inside;
            }
            return inside;
        };
        const distSeg = (x, y, x1, y1, x2, y2) => {
            const dx = x2 - x1, dy = y2 - y1;
            const l2 = dx * dx + dy * dy;
            let t = l2 ? ((x - x1) * dx + (y - y1) * dy) / l2 : 0;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
        };

        // Candidate spots, tried nearest-first. Because every penalty only adds
        // to the base cost, the search can stop as soon as the next candidate's
        // base cost is no better than the best clean spot already found.
        const cands = [];
        [4, 10, 18, 28, 40, 54, 70, 90].forEach((d) => {
            [0, 25, -25, 50, -50, 80, -80, 110, -110, 150, -150, 180].forEach((t) => {
                cands.push({ d, t, base: d + Math.abs(t) * 0.15, rad: (t * Math.PI) / 180 });
            });
        });
        cands.sort((u, v) => u.base - v.base);

        labels.forEach((lb) => {
            const w = String(lb.text).length * fontSize * 0.62 + pad * 2;
            const h = fontSize * 1.3 + pad * 2;
            const hw = w / 2, hh = h / 2;
            const ax = lb.p.tx, ay = lb.p.ty;

            // Outward direction (axis -> plotted point); fall back to "up".
            let ox = lb.p.tx - lb.p.baseTx, oy = lb.p.ty - lb.p.baseTy;
            const ol = Math.hypot(ox, oy);
            if (ol < 1e-6) { ox = 0; oy = -1; } else { ox /= ol; oy /= ol; }
            const baseAng = Math.atan2(oy, ox);

            // Only things within reach of this label's search area matter.
            const R = 100 + 2 * Math.max(hw, hh);
            const nearRegions = regions.filter((rg) => rg.bb[0] < ax + R && rg.bb[2] > ax - R && rg.bb[1] < ay + R && rg.bb[3] > ay - R);
            const nearNodes = nodeBoxes.filter((nb) => Math.abs(nb.x - ax) < R && Math.abs(nb.y - ay) < R);
            const nearPlaced = placed.filter((q) => Math.abs(q.cx - ax) < R + q.hw && Math.abs(q.cy - ay) < R + q.hh);
            const nearLabels = labels.filter((o) => o !== lb && Math.abs(o.p.tx - ax) < R && Math.abs(o.p.ty - ay) < R);

            // Sample grid inside the label box used for overlap tests.
            const samples = [];
            for (let ix = -2; ix <= 2; ix++) for (let iy = -1; iy <= 1; iy++) samples.push([ix * hw * 0.5, iy * hh * 0.8]);

            let best = null;
            for (let ci = 0; ci < cands.length; ci++) {
                const c = cands[ci];
                if (best && c.base >= best.score) break;
                const ang = baseAng + c.rad;
                const dx = Math.cos(ang), dy = Math.sin(ang);
                const cx = ax + dx * c.d + dx * hw * Math.abs(dx);
                const cy = ay + dy * c.d + dy * hh * Math.abs(dy);
                let score = c.base;

                // Canvas bounds.
                if (cx - hw < 2 || cx + hw > width - 2 || cy - hh < 2 || cy + hh > height - 2) score += 20000;

                // Other labels.
                for (let k = 0; k < nearPlaced.length; k++) {
                    const q = nearPlaced[k];
                    if (Math.abs(cx - q.cx) < hw + q.hw + 3 && Math.abs(cy - q.cy) < hh + q.hh + 2) score += 9000;
                }
                // The leader (anchor -> nearest box point) must not run through
                // another label's anchor dot, a node circle, or a placed label.
                const lx = Math.max(cx - hw, Math.min(ax, cx + hw));
                const ly = Math.max(cy - hh, Math.min(ay, cy + hh));
                if (Math.hypot(lx - ax, ly - ay) > 6) {
                    for (let k = 0; k < nearLabels.length; k++) {
                        if (distSeg(nearLabels[k].p.tx, nearLabels[k].p.ty, ax, ay, lx, ly) < 6) score += 7000;
                    }
                    for (let k = 0; k < nearNodes.length; k++) {
                        const nb = nearNodes[k];
                        if (distSeg(nb.x, nb.y, ax, ay, lx, ly) < nb.r + 3 && Math.hypot(nb.x - ax, nb.y - ay) > nb.r + 1) score += 7000;
                    }
                    for (let k = 0; k < nearPlaced.length; k++) {
                        const q = nearPlaced[k];
                        for (let m = 1; m < 8; m++) {
                            const px = ax + ((lx - ax) * m) / 8, py = ay + ((ly - ay) * m) / 8;
                            if (Math.abs(px - q.cx) < q.hw && Math.abs(py - q.cy) < q.hh) { score += 7000; break; }
                        }
                    }
                }
                // Node markers.
                for (let k = 0; k < nearNodes.length; k++) {
                    const nb = nearNodes[k];
                    if (Math.abs(cx - nb.x) < hw + nb.r + 2 && Math.abs(cy - nb.y) < hh + nb.r + 2) score += 6000;
                }
                // Member lines and diagrams.
                for (let k = 0; k < nearRegions.length; k++) {
                    const rg = nearRegions[k];
                    if (rg.bb[0] > cx + hw + 4 || rg.bb[2] < cx - hw - 4 || rg.bb[1] > cy + hh + 4 || rg.bb[3] < cy - hh - 4) continue;
                    const own = rg.key === lb.key;
                    for (let m = 0; m < samples.length; m++) {
                        const x = cx + samples[m][0], y = cy + samples[m][1];
                        if (distSeg(x, y, rg.axis[0], rg.axis[1], rg.axis[2], rg.axis[3]) < 4) score += own ? 150 : 700;
                        if (x >= rg.bb[0] && x <= rg.bb[2] && y >= rg.bb[1] && y <= rg.bb[3] && inPoly(rg.poly, x, y)) score += own ? 40 : 1200;
                    }
                }

                if (!best || score < best.score) best = { score, cx, cy, d: c.d };
            }

            placed.push({ cx: best.cx, cy: best.cy, hw, hh });

            // Every value gets a dot on the exact point it describes; a leader
            // line joins dot and label whenever the label is not right beside it.
            const nx = Math.max(best.cx - hw, Math.min(ax, best.cx + hw));
            const ny = Math.max(best.cy - hh, Math.min(ay, best.cy + hh));
            const gap = Math.hypot(nx - ax, ny - ay);
            const leaderLine = gap > 3
                ? `<line x1="${ax.toFixed(2)}" y1="${ay.toFixed(2)}" x2="${nx.toFixed(2)}" y2="${ny.toFixed(2)}" stroke="${lb.color}" stroke-width="1.4" stroke-linecap="round"/>`
                : "";
            actionOverlaySvg += `<g class="sf-label" data-member="${escapeHtml(String(lb.key))}">${leaderLine}<circle cx="${ax.toFixed(2)}" cy="${ay.toFixed(2)}" r="3" fill="${lb.color}" stroke="white" stroke-width="1.2"/></g>`;

            labelLayer.addText({
                x: best.cx, y: best.cy + fontSize * 0.32, text: lb.text,
                fontSize, fontWeight: "bold", color: lb.color, textAnchor: "middle",
                anchorX: ax, anchorY: ay, leaderColor: lb.color,
                lockPosition: true, memberKey: lb.key,
            });
        });
    }

    // Resolve all ordinary labels first. The node markers are intentionally
    // rendered afterwards so the node circle and node number stay at the top
    // SVG drawing level and can never be hidden by loads, moments, diagrams,
    // support symbols, deformation graphics, or other result annotations.
    const resolvedLabelsSvg = labelLayer.resolve({ minX: 0, minY: 0, maxX: width, maxY: height });
    if (!isInternalActionMode) svg += resolvedLabelsSvg;

    // Top-level node markers for all normal diagrams. The dedicated DoF
    // renderer is separate and never reaches this function.
    if (isInternalActionMode) svg += `<g class="sf-nodes">`;
    model.nodes.forEach((n) => {
        const x = tx(n.x);
        const y = ty(n.y);
        const nFill = mode === "model" || mode === "reactions" ? "#f59e0b" : "#e2e8f0";
        const nodeRadius = isInternalActionMode ? actionNodeRadius : 9.3333333333;
        const nodeStrokeWidth = mode === "model" ? 1 : 1;
        svg += `<g class="sf-node" data-node="${escapeHtml(String(n.id))}">`;
        svg += `<circle cx="${x}" cy="${y}" r="${nodeRadius}" fill="${nFill}" stroke="#1e293b" stroke-width="${nodeStrokeWidth}"/>`;
        if (mode === "model") {
            const nodeIdSize = Math.max(5.0666666667, Math.min(5.8666666667, 18 / String(n.id).length));
            const coordXText = `x=${Number(n.x).toFixed(2)}`;
            const coordYText = `y=${Number(n.y).toFixed(2)}`;
            svg += `<text x="${x}" y="${y - 1.2}" text-anchor="middle"
                font-family="Arial" font-size="${nodeIdSize}" font-weight="700" fill="#000000">${escapeHtml(String(n.id))}</text>`;
            svg += `<text x="${x}" y="${y + 2.1}" text-anchor="middle"
                font-family="Arial" font-size="3.6666666667" font-weight="700" fill="#000000">${coordXText}</text>`;
            svg += `<text x="${x}" y="${y + 5.6}" text-anchor="middle"
                font-family="Arial" font-size="3.6666666667" font-weight="700" fill="#000000">${coordYText}</text>`;
        } else if (isInternalActionMode) {
            // Compact marker: node ID only (N1, N2, ...), no coordinates.
            const rawId = String(n.id);
            const idText = /^n/i.test(rawId) ? rawId : `N${rawId}`;
            const idSize = Math.max(3.8, Math.min(6.4, (2 * actionNodeRadius * 0.82) / (idText.length * 0.62)));
            svg += `<text x="${x}" y="${y + idSize * 0.35}" text-anchor="middle"
                font-family="Arial" font-size="${idSize.toFixed(2)}" font-weight="700" fill="#000000">${escapeHtml(idText)}</text>`;
        } else {
            const nodeLabelSize = Math.max(5.8, Math.min(6.5, 21 / String(n.id).length));
            const coordXText = `x=${Number(n.x).toFixed(2)}`;
            const coordYText = `y=${Number(n.y).toFixed(2)}`;
            svg += `<text x="${x}" y="${y - 1.2}" text-anchor="middle"
                font-family="Arial" font-size="${nodeLabelSize}" font-weight="700" fill="#000000">${escapeHtml(String(n.id))}</text>`;
            svg += `<text x="${x}" y="${y + 2.1}" text-anchor="middle"
                font-family="Arial" font-size="3.6666666667" font-weight="700" fill="#000000">${coordXText}</text>`;
            svg += `<text x="${x}" y="${y + 5.6}" text-anchor="middle"
                font-family="Arial" font-size="3.6666666667" font-weight="700" fill="#000000">${coordYText}</text>`;
        }
        svg += `</g>`;
    });
    if (isInternalActionMode) {
        svg += `</g>`;
        // Value dots, leader lines and value text sit on top of the node
        // markers, so a node circle can never come between a value and the
        // diagram point it describes.
        svg += actionOverlaySvg + resolvedLabelsSvg;
    }

    svg += `</svg>`;
    return svg;
}

// --------------------------------------------------------------------------
// Named, independent entry points — one per diagram — for everything outside
// this file's diagram engine (drawDiagramSVG, the fullscreen controller,
// the 8-step analysis report, etc.) to use. Each one simply fixes the
// `mode` argument of the shared renderer above; callers should never pass a
// raw mode string to getStructureSVG directly.
// --------------------------------------------------------------------------
function renderStructureModelDiagram(width, height, camera) {
    return getStructureSVG(width, height, camera, "model");
}
function renderReactionDiagram(width, height, camera) {
    return getStructureSVG(width, height, camera, "reactions");
}
function renderAFDDiagram(width, height, camera) {
    return getStructureSVG(width, height, camera, "afd");
}
function renderSFDDiagram(width, height, camera) {
    return getStructureSVG(width, height, camera, "sfd");
}
function renderBMDDiagram(width, height, camera) {
    return getStructureSVG(width, height, camera, "bmd");
}
function renderDisplacementDiagram(width, height, camera) {
    return getStructureSVG(width, height, camera, "displacement");
}

function getReactionLocalComponents(sa) {
    const node = model.nodes.find((n) => n.id === sa.nodeId);
    let cx = 1;
    let cy = 0;

    // A support reaction is a global nodal quantity. For the optional local
    // display, resolve it into the lowest-ID connected member's local x-y axes.
    // If no element is connected, fall back to the global axes.
    // Select a deterministic reference member. Array order can change when a
    // user reorders elements; sorting by ID keeps these display-only local
    // components stable and makes the reference axis explicit in the heading.
    const connectedElement = model.elements
        .filter((el) => String(el.startNode) === String(sa.nodeId) || String(el.endNode) === String(sa.nodeId))
        .sort((a, b) => String(a.id).localeCompare(String(b.id)))[0];

    if (connectedElement) {
        const n1 = model.nodes.find((n) => n.id === connectedElement.startNode);
        const n2 = model.nodes.find((n) => n.id === connectedElement.endNode);
        if (n1 && n2) {
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const L = Math.hypot(dx, dy);
            if (L > 1e-12) {
                cx = dx / L;
                cy = dy / L;
            }
        }
    }

    const gx = sa.rx || 0;
    const gy = sa.ry || 0;

    return {
        x: gx * cx + gy * cy,
        y: -gx * cy + gy * cx,
        axisX: { x: cx, y: cy },
        axisY: { x: -cy, y: cx },
    };
}

function getCurrentDeformationScale() {
    const disp = model.nodeDisplacements || {};
    let maxDisp = 0;
    Object.values(disp).forEach((d) => {
        if (!d) return;
        const magnitude = isGridAnalysisMode()
            ? Math.abs(Number(d.deltaZ) || 0)
            : Math.hypot(Number(d.ux) || 0, Number(d.uy) || 0);
        maxDisp = Math.max(maxDisp, magnitude);
    });
    if (maxDisp <= 1e-12) return 1;
    const bb = getBoundingBox();
    const maxDim = Math.max(bb.maxX - bb.minX, bb.maxY - bb.minY, 1);
    return (0.28 * maxDim) / maxDisp;
}

// Legend of the structure (model) diagram: one row per element with its ID and
// section / material properties (same values and units as the Step 2 member table).
const FS_ELEMENT_LABEL_DEFAULTS = ["id", "inertia"];
let fsElementLabelKeys = [...FS_ELEMENT_LABEL_DEFAULTS];
// Load / moment value labels (all shown by default) and support labels (hidden by default).
const FS_LOAD_LABEL_DEFAULTS = ["point", "nodal", "udl", "elementMoment", "nodalMoment"];
let fsLoadLabelKeys = [...FS_LOAD_LABEL_DEFAULTS];
let fsSupportLabelKeys = [];

function syncElementLabelPickerMode() {
    const grid = isGridAnalysisMode();
    document.querySelectorAll("#fsLabelOptions .fs-label-area-option").forEach((item) => {
        item.hidden = grid;
    });
    document.querySelectorAll("#fsLabelOptions .fs-label-grid-option").forEach((item) => {
        item.hidden = !grid;
    });
    // Remove unsupported properties from the active selection as well as hiding
    // them, so switching structure types never leaves stale labels selected.
    fsElementLabelKeys = fsElementLabelKeys.filter((key) =>
        grid ? key !== "area" : key !== "torsion" && key !== "shear"
    );
    const options = document.getElementById("fsLabelOptions");
    if (options) options.querySelectorAll('input[type="checkbox"]').forEach((input) => {
        if (input.value === "area" && grid) input.checked = false;
        if ((input.value === "torsion" || input.value === "shear") && !grid) input.checked = false;
    });
}

function initElementLabelPicker() {
    const root = document.getElementById("fsLabelPicker");
    if (!root) return;
    syncElementLabelPickerMode();
    if (root.dataset.initialized === "true") return;
    root.dataset.initialized = "true";
    const toggle = document.getElementById("fsLabelToggle");
    const options = document.getElementById("fsLabelOptions");
    toggle.addEventListener("click", () => {
        syncElementLabelPickerMode();
        const open = options.hidden;
        options.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));
    });
    options.querySelectorAll('input[type="checkbox"]:not([data-label-group])').forEach((input) => {
        input.checked = fsElementLabelKeys.includes(input.value);
        input.addEventListener("change", () => {
            syncElementLabelPickerMode();
            fsElementLabelKeys = Array.from(options.querySelectorAll('input[type="checkbox"]:not([data-label-group]):checked'))
                .map((item) => item.value);
            syncElementLabelPickerMode();
            if (typeof drawDiagramSVG === "function") drawDiagramSVG("fsSVG", typeof currentFSMode === "string" && currentFSMode === "model3d" ? "model3d" : "model");
        });
    });
    // Load / moment and support label groups: redraw the diagram currently shown.
    options.querySelectorAll('input[type="checkbox"][data-label-group]').forEach((input) => {
        const group = input.dataset.labelGroup;
        input.checked = (group === "load" ? fsLoadLabelKeys : fsSupportLabelKeys).includes(input.value);
        input.addEventListener("change", () => {
            const keys = Array.from(options.querySelectorAll(`input[data-label-group="${group}"]:checked`))
                .map((item) => item.value);
            if (group === "load") fsLoadLabelKeys = keys; else fsSupportLabelKeys = keys;
            if (typeof drawDiagramSVG === "function") {
                drawDiagramSVG("fsSVG", typeof currentFSMode === "string" && currentFSMode ? currentFSMode : "model");
            }
        });
    });
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initElementLabelPicker, { once: true });
} else {
    initElementLabelPicker();
}

// Label text for a support assignment, from the "Show on supports" options.
function getSelectedSupportLabelText(sa) {
    const tmpl = (model.supportTemplates || []).find((t) => t.id === sa.supportId);
    const grid = isGridAnalysisMode();
    const parts = [];
    if (fsSupportLabelKeys.includes("id")) parts.push(String(sa.supportId ?? ""));
    if (fsSupportLabelKeys.includes("description") && tmpl && tmpl.description) parts.push(String(tmpl.description));
    if (fsSupportLabelKeys.includes("restraints") && tmpl && tmpl.restraints) {
        const names = grid ? ["RFz", "RMx", "RMy"] : ["RFx", "RFy", "RMz"];
        const fixed = names.filter((k) => tmpl.restraints[k]);
        parts.push(fixed.length ? fixed.join(", ") : "Free");
    }
    return parts.filter(Boolean).join(" · ");
}

function getSelectedElementLabelText(el, n1, n2) {
    syncElementLabelPickerMode();
    const grid = isGridAnalysisMode();
    const tmpl = (model.elementTemplates || []).find((t) => String(t.id) === String(el.templateId));
    const length = n1 && n2 ? Math.hypot(Number(n2.x) - Number(n1.x), Number(n2.y) - Number(n1.y)) : NaN;
    const fmt = (v) => Number.isFinite(Number(v)) ? formatNum(Number(v)) : "—";
    const values = {
        length: `L=${fmt(length)} m`,
        area: `A=${tmpl ? fmt(tmpl.A) : "—"} m²`,
        inertia: `I=${tmpl ? fmt(tmpl.I) : "—"} m⁴`,
        torsion: `J=${tmpl ? fmt(tmpl.J) : "—"} m⁴`,
        elasticity: `E=${tmpl ? fmt(getElementEInternal(tmpl)) : "—"}`,
        shear: `G=${tmpl ? fmt(tmpl.G_GPa !== undefined && tmpl.G_GPa !== "" ? tmpl.G_GPa : Number(tmpl.G) / 1e9) : "—"} GPa`
    };
    const allowed = grid
        ? ["id", "length", "inertia", "torsion", "elasticity", "shear"]
        : ["id", "length", "area", "inertia", "elasticity"];
    const labelValues = { id: String(el.id), ...values };
    return fsElementLabelKeys
        .filter((key) => allowed.includes(key) && labelValues[key])
        .map((key) => labelValues[key])
        .join(" · ");
}

function buildElementPropertiesLegendRows() {
    const grid = isGridAnalysisMode();
    return (model.elements || []).map((el) => {
        const n1 = model.nodes.find((n) => n.id === el.startNode);
        const n2 = model.nodes.find((n) => n.id === el.endNode);
        const tmpl = model.elementTemplates.find((t) => t.id === el.templateId);
        const L = n1 && n2 ? Math.hypot(Number(n2.x) - Number(n1.x), Number(n2.y) - Number(n1.y)) : NaN;
        const num = (v) => (Number.isFinite(v) ? formatNum(v) : '—');
        const base = {
            id: String(el.id),
            L: num(L),
            E: tmpl ? num(getElementEInternal(tmpl)) : '—',
            I: tmpl ? num(Number(tmpl.I)) : '—',
        };
        if (grid) {
            const G = !tmpl ? NaN
                : tmpl.G_GPa !== undefined && tmpl.G_GPa !== '' && Number.isFinite(Number(tmpl.G_GPa))
                    ? Number(tmpl.G_GPa)
                    : tmpl.G !== undefined && tmpl.G !== '' && Number.isFinite(Number(tmpl.G))
                        ? Number(tmpl.G) / 1e9
                        : NaN;
            return { ...base, J: tmpl ? num(Number(tmpl.J)) : '—', G: num(G) };
        }
        return { ...base, A: tmpl ? num(Number(tmpl.A)) : '—' };
    });
}

function buildResultDiagramLegend(mode, deformationScale = 1) {
    if (!['model', 'reactions', 'sfd', 'bmd', 'afd', 'displacement'].includes(mode)) return '';

    const legendStyle = [
        'position:absolute',
        'left:12px',
        'bottom:12px',
        'z-index:20',
        'background:rgba(255,255,255,0.97)',
        'border:1px solid #cbd5e1',
        'border-radius:8px',
        'box-shadow:0 3px 10px rgba(15,23,42,0.12)',
        'padding:9px 11px',
        'font-family:Arial,sans-serif',
        'font-size:10px',
        'line-height:1.65',
        'color:#334155',
        'pointer-events:none',
        'white-space:nowrap'
    ].join(';');

    const legendSwatch = (color, label) =>
        `<span style="display:inline-block;width:24px;height:4px;background:${color};border-radius:2px;vertical-align:middle;margin-right:6px"></span>${label}`;

    if (mode === 'model') {
        // Element properties are now selected from the fullscreen toolbar and
        // rendered alongside each member, not in a fixed bottom table.
        return '';
        const rows = buildElementPropertiesLegendRows();
        if (!rows.length) return '';
        const grid = isGridAnalysisMode();
        // Inline resets: the page's global table styles (uppercase headers, row lines,
        // header background) must not leak into this legend.
        const cell = 'border:none;background:transparent;text-transform:none;letter-spacing:0;font-size:10px;line-height:1.55;color:#334155;white-space:nowrap';
        const th = cell + ';font-weight:800;text-align:right;padding:0 0 2px 14px';
        const td = cell + ';font-weight:400;text-align:right;padding:0 0 0 14px';
        const idTd = cell + ';font-weight:700;text-align:left;padding:0';
        const columns = grid
            ? [{ key: 'L', label: 'L (m)' }, { key: 'I', label: 'I (m⁴)' }, { key: 'J', label: 'J (m⁴)' }, { key: 'E', label: 'E (kN/m²)' }, { key: 'G', label: 'G (GPa)' }]
            : [{ key: 'L', label: 'L (m)' }, { key: 'A', label: 'A (m²)' }, { key: 'E', label: 'E (kN/m²)' }, { key: 'I', label: 'I (m⁴)' }];
        // The list may be long: it scrolls inside the legend instead of covering the diagram.
        const scrollStyle = legendStyle.replace('pointer-events:none', 'pointer-events:auto') + ';max-height:45%;overflow:auto';
        return `<div class="result-diagram-fixed-legend" style="${scrollStyle}">
            <div style="font-weight:800;margin-bottom:2px;text-align:left">Element properties</div>
            <table style="border-collapse:collapse;border:none;font-size:10px;line-height:1.55;background:transparent;min-width:0;width:auto;margin:0;box-shadow:none">
                <thead style="background:transparent"><tr style="background:transparent">
                    <th style="${cell};font-weight:800;text-align:left;padding:0 0 2px 0">Element</th>
                    ${columns.map((column) => `<th style="${th}">${column.label}</th>`).join('')}
                </tr></thead>
                <tbody>${rows.map((r) => `<tr style="background:transparent">
                    <td style="${idTd}">${escapeHtml(r.id)}</td>
                    ${columns.map((column) => `<td style="${td}">${r[column.key]}</td>`).join('')}
                </tr>`).join('')}</tbody>
            </table>
        </div>`;
    }
    if (mode === 'reactions') {
        return `<div class="result-diagram-fixed-legend" style="${legendStyle}">
            <div style="font-weight:800;margin-bottom:2px">${isGridAnalysisMode() ? 'Grid support reactions' : 'Reaction directions'}</div>
            ${isGridAnalysisMode()
                ? '<div>Mx / My — reaction torsions (kN·m)</div><div>Fz — vertical reaction (kN)</div>'
                : '<div>↑ Positive Fy — global +Y</div><div>→ Positive Fx — global +X</div><div>↺ Positive Mz — anticlockwise</div>'}
        </div>`;
    }
    if (mode === 'sfd') {
        return `<div class="result-diagram-fixed-legend" style="${legendStyle}">
            <div style="font-weight:800;margin-bottom:2px">${isGridAnalysisMode() ? 'Grid Fz diagram' : 'SFD convention'}</div>
            <div>${legendSwatch('#2563eb', isGridAnalysisMode() ? 'Positive Fz shear' : 'Positive shear (+V)')}</div>
            <div>${legendSwatch('#f59e0b', isGridAnalysisMode() ? 'Negative Fz shear' : 'Negative shear (−V)')}</div>
            <div style="margin-top:2px">${isGridAnalysisMode() ? 'Out-of-plane load direction' : 'Local +Y convention'}</div>
        </div>`;
    }
    if (mode === 'bmd') {
        return `<div class="result-diagram-fixed-legend" style="${legendStyle}">
            <div style="font-weight:800;margin-bottom:2px">${isGridAnalysisMode() ? 'Grid My torsion diagram' : 'BMD convention'}</div>
            <div>${legendSwatch('#dc2626', isGridAnalysisMode() ? 'Positive My torsion' : 'Positive moment (+M)')}</div>
            <div>${legendSwatch('#7c3aed', isGridAnalysisMode() ? 'Negative My torsion' : 'Negative moment (−M)')}</div>
            <div style="margin-top:2px">${isGridAnalysisMode() ? 'Grid torsion about Y' : 'Local +Mz / positive BMD'}</div>
        </div>`;
    }
    if (mode === 'afd') {
        return `<div class="result-diagram-fixed-legend" style="${legendStyle}">
            <div style="font-weight:800;margin-bottom:2px">${isGridAnalysisMode() ? 'Grid Mx / torsion diagram' : 'AFD convention'}</div>
            <div>${legendSwatch('#16a34a', isGridAnalysisMode() ? 'Positive Mx torsion' : 'Positive axial force (+A)')}</div>
            <div>${legendSwatch('#db2777', isGridAnalysisMode() ? 'Negative Mx torsion' : 'Negative axial force (−A)')}</div>
            <div style="margin-top:2px">${isGridAnalysisMode() ? 'Member torsion action' : 'Local +X (tension)'}</div>
        </div>`;
    }
    return `<div class="result-diagram-fixed-legend" style="${legendStyle}">
        <div style="font-weight:800;margin-bottom:2px">Displacement diagram</div>
        <div style="border-top:2px dashed #cbd5e1;padding-top:1px">Dashed = undeformed</div>
        <div><span style="display:inline-block;width:22px;border-top:3px solid #2563eb;vertical-align:middle;margin-right:4px"></span>Solid = deformed</div>
        <div>Scale factor = ×${deformationScale.toExponential(2)}</div>
    </div>`;
}

function drawDiagramSVG(containerId, mode) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const isFullscreenDiagram = containerId === "fsSVG";

    container.style.position = 'relative';
    if (!isFullscreenDiagram) {
        container.style.overflow = "hidden";
    }
    if (isFullscreenDiagram) {
        const fsModalEl = document.getElementById("fsModal");
        if (fsModalEl) fsModalEl.classList.toggle("fs-3d", mode === "model3d");
    }
    if (mode === "model3d") {
        // The 3D view exists for Grid models only.
        if (isGridAnalysisMode()) {
            renderGrid3D(container);
            return;
        }
        mode = "model";
    }
    if (mode === 'dof') {
        // The DoF & numbering diagram uses its own dedicated renderer
        // (fixed logical canvas + viewBox scaling) rather than the shared
        // getStructureSVG pipeline used by the other diagram modes.
        container.innerHTML = renderDOFDiagram(rect.width || 800, rect.height || 400);
        if (isFullscreenDiagram) {
            enableSVGZoomPan(container.querySelector("svg"));
        }
        applyMemberFocus(container);
        return;
    }
    let camera;
    let renderWidth = rect.width || 800;
    let renderHeight = rect.height || 400;

    // Inline diagrams are only an overview of the model. Fit the complete
    // diagram inside the fixed viewport instead of using the larger intrinsic
    // drawing canvas reserved for fullscreen, so no part of the structure is
    // clipped on the normal page. Fullscreen keeps the existing readable
    // intrinsic sizing and zoom/pan behavior below.
    if (!isFullscreenDiagram && model.nodes.length > 0 && mode !== "dof") {
        const bb = getBoundingBox();
        const dX = Math.max(bb.maxX - bb.minX, 1e-9);
        const dY = Math.max(bb.maxY - bb.minY, 1e-9);
        const fitPadding = 35;
        const availableW = Math.max((rect.width || 800) - 2 * fitPadding, 1);
        const availableH = Math.max((rect.height || 400) - 2 * fitPadding, 1);
        const fitScale = Math.min(availableW / dX, availableH / dY);
        const safeFitScale = Number.isFinite(fitScale) && fitScale > 0 ? fitScale : 1;
        const midX = (bb.minX + bb.maxX) / 2;
        const midY = (bb.minY + bb.maxY) / 2;

        camera = {
            scale: safeFitScale,
            offsetX: (rect.width || 800) / 2 - midX * safeFitScale,
            offsetY: (rect.height || 400) / 2 + midY * safeFitScale
        };
        renderWidth = rect.width || 800;
        renderHeight = rect.height || 400;
    } else if (model.nodes.length > 0 && mode !== "dof") {
        // With nodes but no structural elements there is no real member
        // length to use as the proportional baseline. Fall back to the
        // stable viewport-fit camera so every node remains visible immediately
        // after node creation. Once elements exist, keep the new proportional
        // scaling used by the full structural model diagram.
        if (mode === "model" && model.elements.length === 0) {
            camera = calculateAutoFit(rect.width || 800, rect.height || 400, mode);
        } else {
            const proportionalModes = new Set([
                "model",
                "reactions",
                "afd",
                "sfd",
                "bmd",
                "displacement"
            ]);

            if (proportionalModes.has(mode)) {
            const bb = getBoundingBox();
            const dX = Math.max(bb.maxX - bb.minX, 1e-9);
            const dY = Math.max(bb.maxY - bb.minY, 1e-9);
            const minL = getMinimumElementLength();
            const baselinePx = mode === "model" ? AppConfig.modelDiagramBaselinePx : AppConfig.sharedDiagramBaselinePx;
            const diagramScale =
                minL && Number.isFinite(minL) && minL > 0
                    ? baselinePx / minL
                    : baselinePx;

            // Keep the same readable intrinsic-canvas approach as the
            // Structure Model diagram. Reactions receive a little extra
            // breathing room because their labelled cards sit outside nodes.
            const padding = mode === "reactions" ? 180 : 140;

            renderWidth = Math.max(rect.width || 800, dX * diagramScale + 2 * padding);
            renderHeight = Math.max(rect.height || 400, dY * diagramScale + 2 * padding);

            camera = {
                scale: diagramScale,
                offsetX: padding - bb.minX * diagramScale,
                offsetY: padding + bb.maxY * diagramScale,
                intrinsicCanvas: true
            };
            } else {
                camera = calculateAutoFit(rect.width, rect.height, mode);
            }
        }
    } else {
        camera = calculateAutoFit(rect.width, rect.height, mode);
    }

    const diagramRenderers = {
        model: renderStructureModelDiagram,
        reactions: renderReactionDiagram,
        afd: renderAFDDiagram,
        sfd: renderSFDDiagram,
        bmd: renderBMDDiagram,
        displacement: renderDisplacementDiagram,
    };
    const renderDiagram = diagramRenderers[mode];
    container.innerHTML = renderDiagram
        ? renderDiagram(renderWidth, renderHeight, camera)
        : getStructureSVG(renderWidth, renderHeight, camera, mode);
    const legendScale = mode === 'displacement' ? getCurrentDeformationScale() : 1;
    container.insertAdjacentHTML('beforeend', buildResultDiagramLegend(mode, legendScale));
    // Center measured SVG glyph bounds on the member midpoint; this avoids font-baseline
    // guesses and remains stable when the diagram is zoomed.
    if (mode === "model") {
        container.querySelectorAll(".fs-element-property-label text, .grid-member-id text").forEach((textNode) => {
            if (typeof textNode.getBBox !== "function") return;
            const bounds = textNode.getBBox();
            if (!Number.isFinite(bounds.y) || !Number.isFinite(bounds.height) || bounds.height <= 0) return;
            const isGridMemberId = Boolean(textNode.closest(".grid-member-id"));
            // For horizontal element labels, position the glyph's top edge 0.5 SVG units
            // below the blue member line's top edge (9-unit stroke: centerY - 4.5).
            const targetCenterY = isGridMemberId
                ? 0
                : Number(textNode.getAttribute("y"));
            if (!Number.isFinite(targetCenterY)) return;
            const currentDy = Number.parseFloat(textNode.getAttribute("dy") || "0") || 0;
            const measuredCenterY = bounds.y + bounds.height / 2;
            const correction = targetCenterY - measuredCenterY;
            if (Number.isFinite(correction) && Math.abs(correction) > 0.001) {
                textNode.setAttribute("dy", String(currentDy + correction));
            }
        });
    }
    if (isFullscreenDiagram) {
        enableSVGZoomPan(container.querySelector("svg"));
    }
    applyMemberFocus(container);
}

// Grid model-diagram symbols are selectable: selecting one highlights every
// glyph belonging to the same load/torsion record. This does not mutate the
// structural model or affect solver behavior.
function toggleGridDiagramSymbolSelection(target) {
    const symbol = target && target.closest
        ? target.closest('.grid-diagram-symbol[data-grid-load-id], .grid-diagram-symbol[data-grid-torsion-id]')
        : null;
    if (!symbol) return false;
    const svgRoot = symbol.ownerSVGElement;
    if (!svgRoot) return false;
    const isLoad = symbol.dataset.gridLoadId !== undefined;
    const id = isLoad ? symbol.dataset.gridLoadId : symbol.dataset.gridTorsionId;
    const wasSelected = symbol.classList.contains('grid-symbol-selected');
    svgRoot.querySelectorAll('.grid-diagram-symbol').forEach((item) => {
        const sameType = isLoad ? item.dataset.gridLoadId !== undefined : item.dataset.gridTorsionId !== undefined;
        const sameId = isLoad ? item.dataset.gridLoadId === id : item.dataset.gridTorsionId === id;
        const selected = !wasSelected && sameType && sameId;
        item.classList.toggle('grid-symbol-selected', selected);
        item.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    return true;
}

document.addEventListener('click', (event) => {
    if (toggleGridDiagramSymbolSelection(event.target)) event.stopPropagation();
});
document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (toggleGridDiagramSymbolSelection(event.target)) {
        event.preventDefault();
        event.stopPropagation();
    }
});

// ==========================================================================
// MEMBER CLICK-TO-FOCUS (AFD / SFD / BMD)
// Click a member (or its diagram / value labels) to bring that member's
// diagram and labels to the front and fade all other members (no color/weight change). Click the same
// member again, or the empty canvas, to reset. The state is applied by
// editing the existing SVG in place, so zoom/pan in fullscreen is preserved.
// ==========================================================================
let activeMemberFocus = null;

// Fullscreen canvas navigation toggles (Zoom / Pan / Member Highlight).
// Every tool is inactive until its toolbar button is switched on.
const fsNavState = { zoom: false, pan: false, highlight: false };
let lastMemberTouchTap = 0;

function applyMemberFocus(root) {
    const svgs = root
        ? [root.querySelector("svg")]
        : Array.from(document.querySelectorAll("#resultsSVGSmall svg, #fsSVG svg"));
    svgs.forEach((svg) => {
        if (!svg || !svg.querySelector(".sf-member")) return;

        // Remember the original drawing order once so it can be restored on reset.
        Array.from(svg.children).forEach((child, i) => {
            if (child.dataset.sfOrder === undefined) child.dataset.sfOrder = i;
        });
        if (svg.dataset.sfReordered === "1") {
            Array.from(svg.children)
                .sort((a, b) => a.dataset.sfOrder - b.dataset.sfOrder)
                .forEach((child) => svg.appendChild(child));
            svg.dataset.sfReordered = "0";
        }

        // In the fullscreen viewer, member highlight only applies while its toolbar toggle is active.
        const fsHighlightOff = !!svg.closest("#fsSVG") && !fsNavState.highlight;
        const key = fsHighlightOff ? null : activeMemberFocus;
        const active = key !== null && !!svg.querySelector(`.sf-member[data-member="${key}"]`);
        svg.classList.toggle("sf-focus-on", active);
        svg.querySelectorAll("[data-member]").forEach((node) => {
            const isActive = active && node.dataset.member === key;
            node.classList.toggle("sf-active", isActive);
            node.classList.toggle("sf-dim", active && !isActive);
        });
        // Nodes: only the two end nodes of the focused member stay visible,
        // so it is clear which joints the focused diagram spans.
        const focusedMember = active ? svg.querySelector(`.sf-member[data-member="${key}"]`) : null;
        svg.querySelectorAll(".sf-node").forEach((nodeEl) => {
            const spans = !!focusedMember &&
                (nodeEl.dataset.node === focusedMember.dataset.start || nodeEl.dataset.node === focusedMember.dataset.end);
            nodeEl.classList.toggle("sf-active", spans);
            nodeEl.classList.toggle("sf-dim", active && !spans);
        });
        // Node-owned graphics (nodal loads / moments, supports, reaction cards,
        // displacement dots, DoF symbols) stay visible only at the two end
        // joints of the focused member.
        svg.querySelectorAll("[data-own-node]").forEach((nodeEl) => {
            const spans = !!focusedMember &&
                (nodeEl.dataset.ownNode === focusedMember.dataset.start || nodeEl.dataset.ownNode === focusedMember.dataset.end);
            nodeEl.classList.toggle("sf-active", spans);
            nodeEl.classList.toggle("sf-dim", active && !spans);
        });
        // Bring-to-front is only for AFD / SFD / BMD (they have the .sf-nodes layer).
        // In the Structural Model, Reactions, Displacement and DoF diagrams the original
        // drawing order is kept, so the member's labels, bubbles and joint numbers are
        // never covered by its (highlighted) line.
        if (active && svg.querySelector(":scope > .sf-nodes")) {
            const own = (cls) => Array.from(svg.children).filter(
                (c) => c.classList.contains(cls) && c.dataset.member === key);
            // Order: node markers sent to the very bottom, then the focused
            // member + diagram, then its value labels on top.
            const nodes = svg.querySelector(":scope > .sf-nodes");
            if (nodes) svg.insertBefore(nodes, svg.firstChild);
            own("sf-member").concat(own("sf-diagram")).forEach((c) => svg.appendChild(c));
            own("sf-label").forEach((c) => svg.appendChild(c));
            svg.dataset.sfReordered = "1";
        }
    });
}

function handleMemberFocusTap(target) {
    if (!target || !target.closest) return;
    const host = target.closest("#resultsSVGSmall, #fsSVG");
    if (!host) return;
    if (host.id === "fsSVG" && !fsNavState.highlight) return; // highlight toggle is off
    const svg = host.querySelector("svg");
    if (!svg || !svg.querySelector(".sf-member")) return;

    const hit = target.closest("[data-member]");
    if (hit && svg.contains(hit)) {
        const key = hit.dataset.member;
        activeMemberFocus = activeMemberFocus === key ? null : key;
    } else if (target === host || target.closest("svg") === svg) {
        activeMemberFocus = null; // empty canvas
    } else {
        return; // e.g. legend
    }
    applyMemberFocus();
}

document.addEventListener("click", (e) => {
    if (Date.now() - lastMemberTouchTap < 700) return;
    handleMemberFocusTap(e.target);
});

// The fullscreen zoom/pan handler calls preventDefault() on touchstart, which
// suppresses the browser's synthetic click, so detect taps there explicitly.
let memberTouchStart = null;
document.addEventListener("touchstart", (e) => {
    memberTouchStart = e.touches.length === 1
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }
        : null;
}, { passive: true });
document.addEventListener("touchend", (e) => {
    const start = memberTouchStart;
    memberTouchStart = null;
    if (!start || e.changedTouches.length !== 1) return;
    const t = e.changedTouches[0];
    if (Math.hypot(t.clientX - start.x, t.clientY - start.y) > 10 || Date.now() - start.t > 500) return;
    if (!(e.target.closest && e.target.closest("#fsSVG"))) return;
    lastMemberTouchTap = Date.now();
    handleMemberFocusTap(e.target);
}, { passive: true });

// ==========================================================================
// 12. PINCH-TO-ZOOM & PAN
// Touch (mobile) and mouse-wheel (desktop) viewBox navigation for the SVGs.
// ==========================================================================
function enableSVGZoomPan(svg) {
    if (!svg) return;

    let viewBox = null;
    let vbAttr = svg.getAttribute("viewBox");
    if (vbAttr) {
        let vb = vbAttr.split(" ").map(Number);
        viewBox = { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
    } else {
        return;
    }

    const baseW = viewBox.w;
    const baseH = viewBox.h;
    const maxW = baseW * 15;
    const minW = baseW / 15;

    let initialDistance = null;
    let initialViewBox = null;
    let initialPinchCenter = null;
    let isPanning = false;
    let lastPanPos = null;

    svg.addEventListener(
        "touchstart",
        function (e) {
            if (e.touches.length === 2) {
                if (!fsNavState.zoom) { initialDistance = null; isPanning = false; return; }
                e.preventDefault();
                isPanning = false;
                let dx = e.touches[0].clientX - e.touches[1].clientX;
                let dy = e.touches[0].clientY - e.touches[1].clientY;
                initialDistance = Math.hypot(dx, dy);
                initialViewBox = Object.assign({}, viewBox);

                let rect = svg.getBoundingClientRect();
                let rW = rect.width || 1;
                let rH = rect.height || 1;

                let cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
                let cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

                initialPinchCenter = {
                    x: initialViewBox.x + (cx / rW) * initialViewBox.w,
                    y: initialViewBox.y + (cy / rH) * initialViewBox.h,
                };
            } else if (e.touches.length === 1) {
                if (!fsNavState.pan) { isPanning = false; lastPanPos = null; return; }
                e.preventDefault();
                isPanning = true;
                lastPanPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        },
        { passive: false },
    );

    svg.addEventListener(
        "touchmove",
        function (e) {
            if (e.touches.length === 2 && initialDistance && fsNavState.zoom) {
                e.preventDefault();
                let dx = e.touches[0].clientX - e.touches[1].clientX;
                let dy = e.touches[0].clientY - e.touches[1].clientY;
                let currentDistance = Math.hypot(dx, dy);

                let scale = initialDistance / currentDistance;
                let newW = initialViewBox.w * scale;
                let newH = initialViewBox.h * scale;

                if (newW > maxW) {
                    scale = maxW / initialViewBox.w;
                    newW = maxW;
                    newH = initialViewBox.h * scale;
                } else if (newW < minW) {
                    scale = minW / initialViewBox.w;
                    newW = minW;
                    newH = initialViewBox.h * scale;
                }

                let rect = svg.getBoundingClientRect();
                let rW = rect.width || 1;
                let rH = rect.height || 1;

                let currentCx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
                let currentCy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

                viewBox.x = initialPinchCenter.x - (currentCx / rW) * newW;
                viewBox.y = initialPinchCenter.y - (currentCy / rH) * newH;
                viewBox.w = newW;
                viewBox.h = newH;

                svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
            } else if (e.touches.length === 1 && isPanning && lastPanPos && fsNavState.pan) {
                e.preventDefault();
                let dx = e.touches[0].clientX - lastPanPos.x;
                let dy = e.touches[0].clientY - lastPanPos.y;

                let rect = svg.getBoundingClientRect();
                let rW = rect.width || 1;
                let rH = rect.height || 1;

                viewBox.x -= (dx / rW) * viewBox.w;
                viewBox.y -= (dy / rH) * viewBox.h;

                svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
                lastPanPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        },
        { passive: false },
    );

    svg.addEventListener(
        "touchend",
        function (e) {
            if (e.touches.length < 2) {
                initialDistance = null;
            }
            if (e.touches.length === 0) {
                isPanning = false;
                lastPanPos = null;
            } else if (e.touches.length === 1) {
                isPanning = fsNavState.pan;
                lastPanPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        },
        { passive: false },
    );

    svg.addEventListener(
        "wheel",
        function (e) {
            // PC zoom: only while the Zoom toggle is ON and Ctrl is held.
            // Plain scrolling (no Ctrl) is ignored.
            if (!fsNavState.zoom || !e.ctrlKey) return;
            e.preventDefault();
            let zoomOut = e.deltaY > 0;
            let scale = zoomOut ? 1.1 : 0.9;

            let newW = viewBox.w * scale;
            let newH = viewBox.h * scale;

            if (newW > maxW) {
                scale = maxW / viewBox.w;
                newW = maxW;
                newH = viewBox.h * scale;
            } else if (newW < minW) {
                scale = minW / viewBox.w;
                newW = minW;
                newH = viewBox.h * scale;
            }

            let rect = svg.getBoundingClientRect();
            let rW = rect.width || 1;
            let rH = rect.height || 1;

            let cx = e.clientX - rect.left;
            let cy = e.clientY - rect.top;

            let pinchX = viewBox.x + (cx / rW) * viewBox.w;
            let pinchY = viewBox.y + (cy / rH) * viewBox.h;

            viewBox.x = pinchX - (cx / rW) * newW;
            viewBox.y = pinchY - (cy / rH) * newH;
            viewBox.w = newW;
            viewBox.h = newH;

            svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
        },
        { passive: false },
    );

    // PC: right-button drag OR middle-button (wheel click) drag pans the canvas,
    // only while Pan Mode is active. Left-click is left untouched.
    let mouseDrag = null;
    svg.addEventListener("contextmenu", function (e) {
        if (fsNavState.pan) e.preventDefault(); // no context menu while Pan Mode is ON
    });
    svg.addEventListener("mousedown", function (e) {
        if ((e.button !== 1 && e.button !== 2) || !fsNavState.pan) return;
        e.preventDefault(); // also stops middle-click autoscroll
        mouseDrag = { x: e.clientX, y: e.clientY, button: e.button };
        const modal = document.getElementById("fsModal");
        if (modal) modal.classList.add("fs-panning");

        const onMove = function (ev) {
            if (!mouseDrag) return;
            if (!fsNavState.pan) { onUp(); return; }
            const dx = ev.clientX - mouseDrag.x;
            const dy = ev.clientY - mouseDrag.y;
            const rect = svg.getBoundingClientRect();
            viewBox.x -= (dx / (rect.width || 1)) * viewBox.w;
            viewBox.y -= (dy / (rect.height || 1)) * viewBox.h;
            svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
            mouseDrag.x = ev.clientX;
            mouseDrag.y = ev.clientY;
        };
        const onUp = function () {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            if (modal) modal.classList.remove("fs-panning");
            mouseDrag = null;
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    });
}

// Toolbar wiring for the fullscreen viewer (Zoom / Pan / Member Highlight toggles).
function setFsNavTool(tool, on) {
    fsNavState[tool] = !!on;
    const ids = { zoom: "fsNavZoomBtn", pan: "fsNavPanBtn", highlight: "fsNavHighlightBtn" };
    const btn = document.getElementById(ids[tool]);
    if (btn) {
        btn.classList.toggle("active", fsNavState[tool]);
        btn.setAttribute("aria-pressed", fsNavState[tool] ? "true" : "false");
    }
    const modal = document.getElementById("fsModal");
    if (modal) {
        modal.classList.toggle("fs-nav-zoom", fsNavState.zoom);
        modal.classList.toggle("fs-nav-pan", fsNavState.pan);
        if (!fsNavState.pan) modal.classList.remove("fs-panning");
    }
    if (tool === "highlight") {
        if (!fsNavState.highlight) activeMemberFocus = null;
        applyMemberFocus();
    }
}

function resetFsNavTools() {
    ["zoom", "pan", "highlight"].forEach((t) => setFsNavTool(t, false));
}

document.querySelectorAll("#fsNavTools .fs-nav-btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const tool = btn.dataset.tool;
        setFsNavTool(tool, !fsNavState[tool]);
    });
});

// ==========================================================================
// 13. FULLSCREEN DIAGRAM MODAL & ANALYSIS DIAGRAM RESIZE HANDLING
// ==========================================================================
function updateResultsDiagram() {
    let mode = document.getElementById("resultsDiagramMode").value;
    if (model.nodes.length > 10) {
        showHeavyDiagramPlaceholder("resultsSVGSmall");
        return;
    }
    if (model.nodes.length > 10) {
            showHeavyDiagramPlaceholder("resultsSVGSmall");
        } else {
            drawDiagramSVG("resultsSVGSmall", mode);
        }
}

function openFullScreen(source) {
    if (source === "results") {
        currentFSMode = document.getElementById("resultsDiagramMode").value;
    } else if (source === "reactions") {
        currentFSMode = "reactions";
    } else if (source === "dof") {
        currentFSMode = "dof";
    } else {
        currentFSMode = "model";
    }
    syncModel3DOption();
    // The full-screen diagram always opens in the 2D Structure Model;
    // the rotatable 3D view is one tap away in the dropdown.
    if (currentFSMode === "model3d") currentFSMode = "model";
    // Reapply solver-specific text immediately before the picker becomes visible.
    // The shared internal values (afd/sfd/bmd) remain unchanged.
    if (typeof syncDiagramModeLabels === "function") syncDiagramModeLabels();
    document.getElementById("fsModeSelect").value = currentFSMode;
    const modal = document.getElementById("fsModal");
    modal.classList.add("active");
    // Lock the background page so it can't be scrolled/peeked at while the
    // fullscreen diagram is open (prevents underlying content from showing
    // through on mobile browsers).
    document.body.style.overflow = "hidden";
    setTimeout(() => {
        renderFullScreen();
    }, 10);
}

// The 3D structure view only exists for Grid models.
function syncModel3DOption() {
    const opt = document.getElementById("fsModel3DOption");
    if (!opt) return;
    const grid = isGridAnalysisMode();
    opt.hidden = !grid;
    opt.disabled = !grid;
}

function changeFSMode(mode) {
    currentFSMode = mode;
    renderFullScreen();
}

function closeFullScreen() {
    document.getElementById("fsModal").classList.remove("active");
    document.body.style.overflow = "";
    resetFsNavTools();
}

function renderFullScreen() {
    const fsContainer = document.getElementById("fsSVG");
    if (fsContainer) {
        fsContainer.style.overflow = currentFSMode === "model" ? "auto" : "hidden";
        syncModel3DOption();
    }
    drawDiagramSVG("fsSVG", currentFSMode);
}

// Redraw statically scaled diagrams universally on window resize
window.addEventListener("resize", () => {
    if (document.getElementById("fsModal").classList.contains("active")) renderFullScreen();
    renderInlineModelDiagram();
    if (document.getElementById("resultsContent").style.display !== "none") {
        if (model.nodes.length > 10) {
            showHeavyDiagramPlaceholder("reactionSVGSmall");
        } else {
            drawDiagramSVG("reactionSVGSmall", "reactions");
        }
        let mode = document.getElementById("resultsDiagramMode").value;
        if (model.nodes.length > 10) {
            showHeavyDiagramPlaceholder("resultsSVGSmall");
        } else {
            drawDiagramSVG("resultsSVGSmall", mode);
        }
    }
});

// ==========================================================================
// 14. DEGREES-OF-FREEDOM (DoF) DIAGRAM
// Step 1 visual used inside the analysis report.
// ==========================================================================
// Named entry point for the DoF/numbering diagram, matching the naming of
// the render*Diagram() family above. It uses its own dedicated renderer
// (fixed logical canvas + viewBox scaling) rather than the shared
// getStructureSVG pipeline used by the other six diagram modes.
function renderDOFDiagram(width, height) {
    return getDoFDiagramSVG(width, height);
}

function getNodeGlobalDofsForDiagram(nodeId) {
    const numbering = buildStructuralDofNumbering();
    return numbering.dofMap[nodeId] || { x: null, y: null, z: null };
}

function getDoFDiagramSVG(width, height) {
    if (model.nodes.length === 0) return `<svg width="${width}" height="${height}"></svg>`;

    /*
     * Dedicated schematic renderer for the Step-1 DoF/numbering diagram.
     *
     * IMPORTANT: this function is intentionally isolated from the solver and
     * from the normal model/reaction/result renderers.  It changes only the
     * presentation of the DoF diagram so that members, joints and DoF labels
     * have fixed, readable spacing instead of fighting a generic collision
     * engine.
     *
     * The schematic keeps the model's topology and numbering exactly as the
     * solver uses them:
     *   - node number = index in model.nodes + 1
     *   - member number = index in model.elements + 1
     *   - DoFs are shown using the global compressed numbering configuration
     */

    const W = Math.max(Number(width) || 800, ((new Set(model.nodes.map(n => Number(n.x) || 0)).size - 1) * 160 + 170), 640);
    const H = Math.max(Number(height) || 400, 300);

    // ------------------------------------------------------------------
    // 1) Build a clean, orthogonalised schematic coordinate system.
    //    Unique X/Y coordinates are kept in their original order, but
    //    equally-ranked positions are given deliberate breathing room.
    // ------------------------------------------------------------------
    const EPS = 1e-9;
    const xs = [...new Set(model.nodes.map(n => Number(n.x) || 0).sort((a, b) => a - b))];
    const ys = [...new Set(model.nodes.map(n => Number(n.y) || 0).sort((a, b) => a - b))];

    const leftPad = 85;
    const rightPad = 85;
    const topPad = 72;
    const bottomPad = 72;

    const usableW = Math.max(W - leftPad - rightPad, 1);
    const usableH = Math.max(H - topPad - bottomPad, 1);

    // Horizontal spacing: preserve the number/order of coordinate columns.
    // Fixed visual spacing for the schematic. The model's actual member
    // lengths must not resize the symbols or squeeze their annotation slots.
    const FIXED_X_GAP = 160;
    const FIXED_Y_GAP = 150;

    // Keep the logical node-to-node spacing constant regardless of how many
    // elements/coordinate columns exist. This prevents the element bubble
    // from moving relative to the fixed +X annotation slot on different
    // structures.
    const xGap = xs.length <= 1 ? 0 : FIXED_X_GAP;
    const xSpan = xGap * Math.max(xs.length - 1, 0);
    const xStart = (W - xSpan) / 2;

    // Vertical spacing: put the highest model row at the top and the lowest
    // row at the bottom.  This is deliberately schematic rather than a
    // perspective/scale drawing.
    const yGap = ys.length <= 1 ? 0 : FIXED_Y_GAP;
    const ySpan = yGap * Math.max(ys.length - 1, 0);
    const yStart = (H - ySpan) / 2;

    const xRank = new Map(xs.map((v, i) => [String(v), i]));
    const yRank = new Map(ys.map((v, i) => [String(v), i]));
    const schematic = new Map();

    model.nodes.forEach((n, i) => {
        const nx = Number(n.x) || 0;
        const ny = Number(n.y) || 0;
        const xi = xRank.get(String(nx));
        const yi = yRank.get(String(ny));
        const sx = xStart + (Number.isFinite(xi) ? xi : 0) * xGap;
        // SVG Y grows downward, while structural Y grows upward.
        const sy = yStart + (ys.length - 1 - (Number.isFinite(yi) ? yi : 0)) * yGap;
        schematic.set(n.id, { x: sx, y: sy, index: i });
    });

    // ------------------------------------------------------------------
    // 1A) Universal fixed-member-length schematic layout.
    //      The DoF diagram is a schematic, so actual member length must not
    //      change how long an angled member appears.  Every structural member
    //      is therefore constrained to the same logical visual length as the
    //      existing horizontal member.  The original member direction is kept
    //      so horizontal, vertical and angled members remain symmetric.
    //      A small deterministic relaxation handles shared joints and frames.
    // ------------------------------------------------------------------
    const FIXED_MEMBER_LENGTH = 160;
    const fixedLengthEdges = model.elements.map((el) => {
        const n1 = model.nodes.find(n => n.id === el.startNode);
        const n2 = model.nodes.find(n => n.id === el.endNode);
        const dx = (Number(n2?.x) || 0) - (Number(n1?.x) || 0);
        const dy = (Number(n2?.y) || 0) - (Number(n1?.y) || 0);
        const L = Math.hypot(dx, dy) || 1;
        return {
            start: el.startNode,
            end: el.endNode,
            ux: dx / L,
            uy: -dy / L, // convert structural +Y to SVG +Y-down
        };
    });

    if (fixedLengthEdges.length) {
        const anchorCentroid = () => {
            let sx = 0, sy = 0, count = 0;
            schematic.forEach(pt => { sx += pt.x; sy += pt.y; count++; });
            return count ? { x: sx / count, y: sy / count } : { x: W / 2, y: H / 2 };
        };

        const anchor = anchorCentroid();
        for (let iter = 0; iter < 300; iter++) {
            for (const edge of fixedLengthEdges) {
                const a = schematic.get(edge.start);
                const b = schematic.get(edge.end);
                if (!a || !b) continue;

                const desiredDx = edge.ux * FIXED_MEMBER_LENGTH;
                const desiredDy = edge.uy * FIXED_MEMBER_LENGTH;
                const actualDx = b.x - a.x;
                const actualDy = b.y - a.y;
                const ex = actualDx - desiredDx;
                const ey = actualDy - desiredDy;

                // Equal/opposite correction keeps the joint at the midpoint.
                a.x += ex * 0.5;
                a.y += ey * 0.5;
                b.x -= ex * 0.5;
                b.y -= ey * 0.5;
            }

            // Prevent the relaxation from drifting the complete model.
            const c = anchorCentroid();
            const tx = anchor.x - c.x;
            const ty = anchor.y - c.y;
            schematic.forEach(pt => { pt.x += tx; pt.y += ty; });
        }

        // Recenter the relaxed schematic and translate it into the visible
        // logical canvas without applying a scale (scaling would destroy the
        // fixed member length relationship with the symbols).
        const bounds = [...schematic.values()];
        const minX = Math.min(...bounds.map(p => p.x));
        const maxX = Math.max(...bounds.map(p => p.x));
        const minY = Math.min(...bounds.map(p => p.y));
        const maxY = Math.max(...bounds.map(p => p.y));
        const bbCx = (minX + maxX) / 2;
        const bbCy = (minY + maxY) / 2;
        const moveX = W / 2 - bbCx;
        const moveY = H / 2 - bbCy;
        schematic.forEach(pt => { pt.x += moveX; pt.y += moveY; });
    }

    function pointForNode(nodeId) {
        return schematic.get(nodeId);
    }

    function esc(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    const green = '#10b981';
    const red = '#ef4444';
    const yellow = '#facc15';
    const blue = '#3b82f6';
    const memberGray = '#cbd5e1';
    const labelBlack = '#111827';

    // Fixed symbol dimensions: these remain independent of member length or
    // node spacing so the DoF/numbering graphics cannot resize dynamically.
    const MEMBER_STROKE = 7;
    // Keep element bubbles compact so they cannot collide with the nearby +X
    // annotation slot. The number font scales down for long element IDs so
    // values such as 1000 still stay inside the fixed-size circle.
    const MEMBER_BUBBLE_R = 10;
    const MEMBER_BUBBLE_STROKE = 1.5;
    const MEMBER_NUMBER_SIZE = 10;
    const NODE_HALF_W = 14;
    const NODE_TOP = 14;
    const NODE_BOTTOM = 10;
    const NODE_STROKE = 1.5;
    const NODE_NUMBER_SIZE = 11;
    const AXIS_STROKE = 1.4;
    const AXIS_ARROW_LEN = 30;
    const AXIS_ARROW_GAP = 18;
    const AXIS_NUMBER_SIZE = 10.5;
    const MOMENT_STROKE = 1.4;
    const MOMENT_NUMBER_SIZE = 10;

    let svg = `<svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">`;

    // Member Highlight tool support: tag each member's bubble and each joint's
    // glyphs / DoF symbols so the focus engine can keep or fade them as a unit.
    function wrapOwn(start, cls, attr, key) {
        if (svg.length <= start) return;
        svg = svg.slice(0, start) + `<g class="${cls}" ${attr}="${esc(String(key))}">` + svg.slice(start) + `</g>`;
    }

    svg += `<defs>
        <marker id="dof-arrow-red" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L8,4 L0,8 z" fill="${red}"/>
        </marker>
        <marker id="dof-arrow-moment" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L8,4 L0,8 Z" fill="#000000"/>
        </marker>
    </defs>`;

    // ------------------------------------------------------------------
    // 2) Members first.  Member-number bubbles use a fixed-size,
    //    collision-safe anchor on each member.  The horizontal case stays
    //    centered exactly as before; for angled members the anchor is moved
    //    along the same member only when a fixed annotation corridor around
    //    either end node would intersect it.  This keeps the visual grammar
    //    symmetric without changing member topology or solver data.
    // ------------------------------------------------------------------
    const placedMemberBubbles = [];

    function rectsOverlapCircle(cx, cy, r, rect, pad = 0) {
        const qx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
        const qy = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
        const dx = cx - qx;
        const dy = cy - qy;
        return (dx * dx + dy * dy) <= Math.pow(r + pad, 2);
    }

    function getNodeAnnotationObstacles(point) {
        if (!point) return [];
        // Fixed corridors reserved for the +X arrow/number and +Y arrow/number.
        return [
            // +X corridor (left of the node).
            { x: point.x - 58, y: point.y - 9, w: 50, h: 18 },
            // +Y corridor (above the node).
            { x: point.x - 12, y: point.y - 58, w: 24, h: 50 },
            // Node triangle itself.
            { x: point.x - 16, y: point.y - 15, w: 32, h: 30 },
        ];
    }

    function chooseMemberBubbleAnchor(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;

        // Keep the exact horizontal appearance at t=0.5 unless that would
        // actually intersect a fixed annotation corridor.
        const candidates = [0.50, 0.42, 0.58, 0.35, 0.65, 0.28, 0.72];
        const obstacles = [...getNodeAnnotationObstacles(a), ...getNodeAnnotationObstacles(b)];

        let best = null;
        let bestScore = -Infinity;

        for (const t of candidates) {
            const cx = a.x + dx * t;
            const cy = a.y + dy * t;
            let score = 100 - Math.abs(t - 0.5) * 120;

            let blocked = false;
            obstacles.forEach(rect => {
                if (rectsOverlapCircle(cx, cy, MEMBER_BUBBLE_R, rect, 5)) blocked = true;
            });

            placedMemberBubbles.forEach(prev => {
                const d = Math.hypot(cx - prev.x, cy - prev.y);
                if (d < MEMBER_BUBBLE_R * 2 + 8) blocked = true;
                else score += Math.min(d, 40) * 0.05;
            });

            // Prefer a point that is visually central on angled members while
            // keeping a generous fixed safety corridor from node annotations.
            const endpointClearance = Math.min(t, 1 - t) * len;
            score += Math.min(endpointClearance, 80) * 0.08;

            if (!blocked && score > bestScore) {
                bestScore = score;
                best = { x: cx, y: cy };
            }
        }

        // Long fixed schematic members should always provide at least one safe
        // candidate.  Fall back to the exact midpoint only in the unlikely
        // case that every candidate is occupied by another annotation.
        return best || { x: a.x + dx * 0.5, y: a.y + dy * 0.5 };
    }

    model.elements.forEach((el, index) => {
        const a = pointForNode(el.startNode);
        const b = pointForNode(el.endNode);
        if (!a || !b) return;

        svg += `<g class="sf-member" data-member="${index}" data-start="${esc(String(el.startNode))}" data-end="${esc(String(el.endNode))}"><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="rgba(0,0,0,0)" stroke-width="18" pointer-events="stroke"/><line class="sf-member-line" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${memberGray}" stroke-width="${MEMBER_STROKE}" stroke-linecap="butt"/></g>`;

        const bubbleStart = svg.length;
        const bubble = chooseMemberBubbleAnchor(a, b);
        const mx = bubble.x;
        const my = bubble.y;
        placedMemberBubbles.push({ x: mx, y: my });

        svg += `<circle cx="${mx}" cy="${my}" r="${MEMBER_BUBBLE_R}"
            fill="white" stroke="${blue}" stroke-width="${MEMBER_BUBBLE_STROKE}"/>`;
        const memberLabel = String(index + 1);
        const memberFontSize = memberLabel.length >= 4 ? 7 : memberLabel.length === 3 ? 8.5 : MEMBER_NUMBER_SIZE;
        svg += `<text x="${mx}" y="${my + memberFontSize * 0.36}" text-anchor="middle"
            font-family="Inter, Arial, Helvetica, sans-serif" font-size="${memberFontSize}"
            font-weight="700" fill="${blue}">${memberLabel}</text>`;
        wrapOwn(bubbleStart, "sf-own-member", "data-member", index);
    });

    // ------------------------------------------------------------------
    // 3) Joint glyphs.
    //    Normal joints use an upward triangle.  A leaf node that sits below
    //    another row is turned sideways so the vertical member and +Y DoF do
    //    not stack on top of the joint number — matching the Canva design.
    // ------------------------------------------------------------------
    const neighbours = new Map(model.nodes.map(n => [n.id, []]));
    model.elements.forEach(el => {
        if (neighbours.has(el.startNode) && neighbours.has(el.endNode)) {
            neighbours.get(el.startNode).push(el.endNode);
            neighbours.get(el.endNode).push(el.startNode);
        }
    });

    function isLowerLeaf(n) {
        const p = pointForNode(n.id);
        const ns = neighbours.get(n.id) || [];
        if (!p || ns.length !== 1) return false;
        const q = pointForNode(ns[0]);
        return !!q && q.y < p.y - EPS;
    }

    // Grid torsion DoFs are rendered as the bottom visual layer. Their shafts
    // start at the joint center; the joint triangle/green number is rendered
    // above them, and the open Delta-Z symbol is added as the top layer below.
    // This ordering keeps the three Grid DoF indicators centered on each joint
    // without allowing red torsion graphics to obscure the green node number.
    if (isGridAnalysisMode()) {
        const gridDofRed = '#ef4444';
        const drawGridDofArrow = (sx, sy, ux, uy, number, direction) => {
            if (number === null || number === undefined) return;
            const length = 30;
            const stroke = 2.4;
            const headLength = 6.1;
            const halfWidth = 4.0;
            const secondHeadGap = 7.0;
            const ex = sx + ux * length;
            const ey = sy + uy * length;
            const px = -uy;
            const py = ux;
            const head = (hx, hy) => {
                const bx = hx - ux * headLength;
                const by = hy - uy * headLength;
                return `M ${(bx + px * halfWidth).toFixed(2)} ${(by + py * halfWidth).toFixed(2)} L ${hx.toFixed(2)} ${hy.toFixed(2)} L ${(bx - px * halfWidth).toFixed(2)} ${(by - py * halfWidth).toFixed(2)}`;
            };
            const secondX = ex - ux * secondHeadGap;
            const secondY = ey - uy * secondHeadGap;
            svg += `<g aria-label="Grid ${direction} torsion degree of freedom ${number}">`;
            svg += `<path d="M ${sx.toFixed(2)} ${sy.toFixed(2)} L ${ex.toFixed(2)} ${ey.toFixed(2)}" fill="none" stroke="${gridDofRed}" stroke-width="${stroke}" stroke-linecap="round"/>`;
            svg += `<path d="${head(ex, ey)} ${head(secondX, secondY)}" fill="none" stroke="${gridDofRed}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>`;
            if (direction === 'right') {
                svg += `<text x="${(ex + 4).toFixed(2)}" y="${(ey + 3.5).toFixed(2)}" text-anchor="start" font-family="Inter, Arial, Helvetica, sans-serif" font-size="${AXIS_NUMBER_SIZE}" font-weight="700" fill="${gridDofRed}">${number}</text>`;
            } else {
                svg += `<text x="${(ex + 1).toFixed(2)}" y="${(ey - 7).toFixed(2)}" text-anchor="middle" font-family="Inter, Arial, Helvetica, sans-serif" font-size="${AXIS_NUMBER_SIZE}" font-weight="700" fill="${gridDofRed}">${number}</text>`;
            }
            svg += `</g>`;
        };

        model.nodes.forEach((n) => {
            const p = pointForNode(n.id);
            if (!p) return;
            const d = getNodeGlobalDofsForDiagram(n.id);
            const dofX = d.x === null ? null : d.x + 1;
            const dofY = d.y === null ? null : d.y + 1;
            // Both torsion indicators are anchored at the joint center.
            const gridDofStart = svg.length;
            drawGridDofArrow(p.x, p.y, 1, 0, dofX, 'right');
            drawGridDofArrow(p.x, p.y, 0, -1, dofY, 'up');
            wrapOwn(gridDofStart, "sf-own-node", "data-own-node", n.id);
        });
    }

    model.nodes.forEach((n, i) => {
        const p = pointForNode(n.id);
        if (!p) return;

        svg += `<g class="sf-node" data-node="${esc(String(n.id))}">`;
        // All joint triangles use one fixed orientation: point upward.
        // Do not rotate the triangle for vertical/lower-leaf members.
        svg += `<polygon points="${p.x},${p.y - NODE_TOP} ${p.x - NODE_HALF_W},${p.y + NODE_BOTTOM} ${p.x + NODE_HALF_W},${p.y + NODE_BOTTOM}"
            fill="white" stroke="${green}" stroke-width="${NODE_STROKE}"/>`;

        svg += `<text x="${p.x}" y="${p.y + 4}" text-anchor="middle"
            font-family="Inter, Arial, Helvetica, sans-serif" font-size="${NODE_NUMBER_SIZE}"
            font-weight="700" fill="${green}">${i + 1}</text>`;
        svg += `</g>`;
    });

    // ------------------------------------------------------------------
    // 4) Fixed DoF annotation slots.
    //    +X is always a red right-pointing arrow.  At a right boundary node
    //    it is placed outside the joint; otherwise it is placed on the left.
    //    +Y is upward.  +Mz is anticlockwise and yellow, matching the reference.
    // ------------------------------------------------------------------
    model.nodes.forEach((n, i) => {
        const p = pointForNode(n.id);
        if (!p) return;
        const annStart = svg.length;

        const d = getNodeGlobalDofsForDiagram(n.id);
        const dofX = d.x === null ? null : d.x + 1;
        const dofY = d.y === null ? null : d.y + 1;
        const dofM = d.z === null ? null : d.z + 1;

        // Grid DoF annotations use Grid-specific glyphs only: an open black
        // circle for the out-of-page translation (Delta Z), and matching
        // single-shaft/double-chevron torsion arrows for thetaX (right) and
        // thetaY (up). The Plane/BTF annotations below remain unchanged.
        if (isGridAnalysisMode()) {
            const gridDofBlack = '#111111';

            // Delta Z: open black circle is centered exactly on the joint and
            // rendered after the green node number, making it the top Grid DoF
            // symbol. A transparent fill keeps the node number readable inside.
            const outX = p.x;
            const outY = p.y;
            svg += `<g aria-label="Grid out-of-page translation degree of freedom ${dofM}">`;
            svg += `<circle cx="${outX.toFixed(2)}" cy="${outY.toFixed(2)}" r="7.8" fill="none" stroke="${gridDofBlack}" stroke-width="1.8"/>`;
            if (dofM !== null) {
                svg += `<text x="${outX.toFixed(2)}" y="${(outY + 16).toFixed(2)}" text-anchor="middle" font-family="Inter, Arial, Helvetica, sans-serif" font-size="${AXIS_NUMBER_SIZE}" font-weight="700" fill="${gridDofBlack}">${dofM}</text>`;
            }
            svg += `</g>`;
            wrapOwn(annStart, "sf-own-node", "data-own-node", n.id);
            return;
        }

        const ns = neighbours.get(n.id) || [];
        const hasRightNeighbour = ns.some(id => {
            const q = pointForNode(id);
            return q && q.x > p.x + EPS;
        });
        const hasAnyRightColumn = xs.some(v => {
            const nx = Number(n.x) || 0;
            return v > nx + EPS;
        });

        // +X arrow/label is omitted when the global axial switch is active.
        if (dofX !== null) {
            const ax1 = p.x - 40;
            const ax2 = ax1 + AXIS_ARROW_LEN;
            svg += `<line x1="${ax1}" y1="${p.y}" x2="${ax2}" y2="${p.y}"
                stroke="${red}" stroke-width="${AXIS_STROKE}" marker-end="url(#dof-arrow-red)"/>`;
            svg += `<text x="${ax1 - 7}" y="${p.y + 4}" text-anchor="end"
                font-family="Inter, Arial, Helvetica, sans-serif" font-size="${AXIS_NUMBER_SIZE}"
                font-weight="700" fill="${red}">${dofX}</text>`;
        }

        // +Y arrow. Keep the arrow and label vertically aligned with the
        // centerline of the green node triangle for every node.
        const yShift = 0;
        const ay1 = p.y - AXIS_ARROW_GAP;
        const ay2 = ay1 - AXIS_ARROW_LEN;
        svg += `<line x1="${p.x + yShift}" y1="${ay1}" x2="${p.x + yShift}" y2="${ay2}"
            stroke="${red}" stroke-width="${AXIS_STROKE}" marker-end="url(#dof-arrow-red)"/>`;
        svg += `<text x="${p.x + yShift}" y="${ay2 - 7}" text-anchor="middle"
            font-family="Inter, Arial, Helvetica, sans-serif" font-size="${AXIS_NUMBER_SIZE}"
            font-weight="700" fill="${red}">${dofY}</text>`;

        // Moment symbol — preserve the reference yellow symbol's exact
        // logical position/scale while using the new black curved-tail design.
        if (dofM !== null) {
            const cx = p.x - 38;
            const cy = p.y - 34;
            svg += `<path d="M ${cx - 11} ${cy - 15}
                L ${cx - 11} ${cy - 5}
                C ${cx - 11} ${cy + 7}, ${cx - 2} ${cy + 13}, ${cx + 9} ${cy + 13}
                L ${cx + 14} ${cy + 13}"
                fill="none" stroke="#000000"
                stroke-linecap="round" stroke-linejoin="round"
                stroke-width="${MOMENT_STROKE}"
                marker-end="url(#dof-arrow-moment)"/>`;
            svg += `<text x="${cx - 2}" y="${cy - 15}" text-anchor="middle"
                font-family="Inter, Arial, Helvetica, sans-serif" font-size="${MOMENT_NUMBER_SIZE}"
                font-weight="700" fill="#000000">${dofM}</text>`;
        }
        wrapOwn(annStart, "sf-own-node", "data-own-node", n.id);
    });

    svg += `</svg>`;
    return svg;
}

// ==========================================================================
// 15. GRID 3D MODEL VIEW
// A rotatable perspective-free (orthographic) 3D drawing of a Grid model.
// The grid lies in the horizontal XY plane and Fz acts vertically, so loads
// are drawn as real vertical arrows (UDLs as a row of arrows with an
// envelope) and torsions (Mx / My) as double-headed vectors along X / Y.
// Pure SVG, no libraries: drag = rotate, pinch / wheel = zoom,
// two fingers / right-drag = pan. It only reads `model`; nothing is mutated.
// ==========================================================================
const GRID3D_DEFAULT_VIEW = { az: -38, el: 30, zoom: 1, panX: 0, panY: 0 };
let grid3DView = { ...GRID3D_DEFAULT_VIEW };

function grid3DNiceStep(raw) {
    if (!(raw > 0) || !Number.isFinite(raw)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

function buildStructure3DSVG(W, H) {
    const v = grid3DView;
    const f2 = (n) => (Math.round(n * 100) / 100).toString();
    const FONT = 'Inter, Arial, Helvetica, sans-serif';
    const nodes = model.nodes.filter((n) => Number.isFinite(Number(n.x)) && Number.isFinite(Number(n.y)));
    if (!nodes.length) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${W} ${H}"><text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-family="${FONT}" font-size="14" fill="#64748b">Add nodes and elements to see the 3D model</text></svg>`;
    }
    const nodeById = (id) => model.nodes.find((n) => String(n.id) === String(id));
    const elById = (id) => model.elements.find((e) => String(e.id) === String(id));
    const on = (key) => key === null || fsLoadLabelKeys.includes(key);

    const xs = nodes.map((n) => Number(n.x)), ys = nodes.map((n) => Number(n.y));
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const spanX = maxX - minX, spanY = maxY - minY;
    const span = Math.max(spanX, spanY) || 1;
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const zHigh = 0.32 * span, zLow = 0.16 * span, zMid = (zHigh - zLow) / 2;
    const R = Math.sqrt((spanX / 2) ** 2 + (spanY / 2) ** 2 + ((zHigh + zLow) / 2) ** 2) + 0.12 * span;
    const s = (Math.min(W, H * 1.15) * 0.5 * 0.92 / R) * v.zoom;

    const rad = Math.PI / 180;
    const ca = Math.cos(v.az * rad), sa = Math.sin(v.az * rad);
    const ce = Math.cos(v.el * rad), se = Math.sin(v.el * rad);
    const P = (x, y, z = 0) => {
        const px = x - cx, py = y - cy, pz = z - zMid;
        const xr = px * ca - py * sa, yr = px * sa + py * ca;
        return { x: W / 2 + v.panX + s * xr, y: H / 2 + v.panY - s * (pz * ce + yr * se), d: yr * ce - pz * se };
    };

    // ---- load scaling -------------------------------------------------
    const loads = Array.isArray(model.loads) ? model.loads : [];
    const moments = Array.isArray(model.moments) ? model.moments : [];
    let maxPoint = 0, maxUdl = 0, maxMom = 0;
    loads.forEach((ld) => {
        const a = Math.abs(Number(ld.Fz) || 0), b = Math.abs(Number(ld.FzEnd) || 0);
        if (ld.type === 'Element UDL') maxUdl = Math.max(maxUdl, a, b); else maxPoint = Math.max(maxPoint, a);
    });
    moments.forEach((m) => { maxMom = Math.max(maxMom, Math.abs(Number(m.Mx) || 0), Math.abs(Number(m.My) || 0)); });
    const ratio = (val, mx) => (mx > 0 ? Math.min(1, Math.abs(val) / mx) : 0);
    const hPoint = (val) => span * (0.12 + 0.14 * ratio(val, maxPoint));
    const hUdl = (val) => span * (0.07 + 0.09 * ratio(val, maxUdl));
    const lMom = (val) => span * (0.12 + 0.10 * ratio(val, maxMom));

    const layers = { ground: [], members: [], marks: [], supports: [], nodes: [], loads: [] };
    const labels = [];
    const push = (layer, d, svg) => layers[layer].push({ d, svg });
    const addLabel = (x, y, text, color, anchor = 'middle', size = 11, weight = 700) => labels.push({ x, y, text: String(text), color, anchor, size, weight });

    // ---- ground plane + grid ---------------------------------------------
    {
        const m = 0.14 * span, zg = -0.004 * span;
        const c = [[minX - m, minY - m], [maxX + m, minY - m], [maxX + m, maxY + m], [minX - m, maxY + m]].map(([x, y]) => P(x, y, zg));
        let g = `<polygon points="${c.map((p) => `${f2(p.x)},${f2(p.y)}`).join(' ')}" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/>`;
        const step = grid3DNiceStep(span / 6);
        let count = 0;
        for (let x = Math.ceil((minX - m) / step) * step; x <= maxX + m && count < 80; x += step, count++) {
            const a = P(x, minY - m, zg), b = P(x, maxY + m, zg);
            g += `<line x1="${f2(a.x)}" y1="${f2(a.y)}" x2="${f2(b.x)}" y2="${f2(b.y)}" stroke="#e2e8f0" stroke-width="1"/>`;
        }
        for (let y = Math.ceil((minY - m) / step) * step; y <= maxY + m && count < 160; y += step, count++) {
            const a = P(minX - m, y, zg), b = P(maxX + m, y, zg);
            g += `<line x1="${f2(a.x)}" y1="${f2(a.y)}" x2="${f2(b.x)}" y2="${f2(b.y)}" stroke="#e2e8f0" stroke-width="1"/>`;
        }
        push('ground', 0, g);
    }

    // ---- arrow helpers (screen space) -----------------------------------
    const ring = (x, y, color, intoPage) => {
        const r = 6.5;
        let g = `<circle cx="${f2(x)}" cy="${f2(y)}" r="${r}" fill="${intoPage ? color : '#ffffff'}" stroke="${color}" stroke-width="1.8"/>`;
        g += intoPage
            ? `<path d="M ${f2(x - 3)} ${f2(y - 3)} L ${f2(x + 3)} ${f2(y + 3)} M ${f2(x + 3)} ${f2(y - 3)} L ${f2(x - 3)} ${f2(y + 3)}" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>`
            : `<circle cx="${f2(x)}" cy="${f2(y)}" r="2" fill="${color}"/>`;
        return g;
    };
    const arrow = (a, b, color, w, head, double = false) => {
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
        if (len < 1e-6) return '';
        const ux = dx / len, uy = dy / len;
        const hl = Math.min(head, len * 0.6), hw = hl * 0.5;
        if (double) {
            const chev = (k) => {
                const tx = b.x - ux * hl * 0.85 * k, ty = b.y - uy * hl * 0.85 * k;
                return `M ${f2(tx - ux * hl - uy * hw)} ${f2(ty - uy * hl + ux * hw)} L ${f2(tx)} ${f2(ty)} L ${f2(tx - ux * hl + uy * hw)} ${f2(ty - uy * hl - ux * hw)}`;
            };
            return `<path d="M ${f2(a.x)} ${f2(a.y)} L ${f2(b.x)} ${f2(b.y)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`
                + `<path d="${chev(0)} ${chev(1)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
        }
        const bx = b.x - ux * hl, by = b.y - uy * hl;
        return `<path d="M ${f2(a.x)} ${f2(a.y)} L ${f2(bx + ux * 1)} ${f2(by + uy * 1)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`
            + `<path d="M ${f2(b.x)} ${f2(b.y)} L ${f2(bx - uy * hw)} ${f2(by + ux * hw)} L ${f2(bx + uy * hw)} ${f2(by - ux * hw)} Z" fill="${color}" stroke="${color}" stroke-width="1" stroke-linejoin="round"/>`;
    };
    // Vertical force arrow at plan point (x,y). Negative Fz acts downward
    // (tip on the structure), positive Fz acts upward (tail on the structure).
    const vArrow = (x, y, value, h, color, w = 2.4) => {
        const down = value < 0;
        const a = P(x, y, down ? h : 0), b = P(x, y, down ? 0 : h);
        const base = P(x, y, 0);
        if (Math.hypot(b.x - a.x, b.y - a.y) < 11) return { svg: ring(base.x, base.y, color, down), top: P(x, y, h), d: base.d };
        return { svg: arrow(a, b, color, w, 9.5), top: P(x, y, h), d: base.d };
    };
    const pointOn = (el, dist) => {
        const n1 = nodeById(el.startNode), n2 = nodeById(el.endNode);
        if (!n1 || !n2) return null;
        const dx = Number(n2.x) - Number(n1.x), dy = Number(n2.y) - Number(n1.y);
        const L = Math.hypot(dx, dy);
        if (L < 1e-12) return null;
        const t = Math.max(0, Math.min(1, (Number(dist) || 0) / L));
        return { x: Number(n1.x) + dx * t, y: Number(n1.y) + dy * t, L, n1, n2 };
    };

    // ---- members + element labels -------------------------------------
    model.elements.forEach((el) => {
        const n1 = nodeById(el.startNode), n2 = nodeById(el.endNode);
        if (!n1 || !n2) return;
        const a = P(Number(n1.x), Number(n1.y)), b = P(Number(n2.x), Number(n2.y));
        const line = `M ${f2(a.x)} ${f2(a.y)} L ${f2(b.x)} ${f2(b.y)}`;
        push('members', (a.d + b.d) / 2,
            `<path d="${line}" stroke="#1e3a8a" stroke-width="8" stroke-linecap="round" fill="none"/><path d="${line}" stroke="#60a5fa" stroke-width="4.6" stroke-linecap="round" fill="none"/>`);
        const text = typeof getSelectedElementLabelText === 'function' ? getSelectedElementLabelText(el, n1, n2) : String(el.id);
        if (text) {
            const lines = text.split(' · ');
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            lines.forEach((t, i) => addLabel(mx, my + 17 + i * 12 - (lines.length - 1) * 0, t, '#1e293b', 'middle', 10.5, 700));
        }
    });

    // ---- plan angles between elements (optional) -----------------------
    if (fsElementLabelKeys.includes('angle')) {
        const OBVIOUS = [90, 180, 270, 360];
        nodes.forEach((n) => {
            const dirs = [], lens = [];
            model.elements.forEach((el) => {
                let o = null;
                if (String(el.startNode) === String(n.id)) o = nodeById(el.endNode);
                else if (String(el.endNode) === String(n.id)) o = nodeById(el.startNode);
                if (!o) return;
                const dx = Number(o.x) - Number(n.x), dy = Number(o.y) - Number(n.y);
                if (Math.hypot(dx, dy) < 1e-9) return;
                let ang = Math.atan2(dy, dx) / rad;
                if (ang < 0) ang += 360;
                if (dirs.some((d) => Math.min(Math.abs(d - ang), 360 - Math.abs(d - ang)) < 1e-6)) return;
                dirs.push(ang); lens.push(Math.hypot(dx, dy));
            });
            if (dirs.length < 2) return;
            const order = dirs.map((_, i) => i).sort((i, j) => dirs[i] - dirs[j]);
            const pairs = order.map((idx, k) => {
                const a1 = dirs[idx], a2 = dirs[order[(k + 1) % order.length]];
                let gap = a2 - a1; if (gap <= 0) gap += 360;
                return { a1, gap, len: Math.min(lens[idx], lens[order[(k + 1) % order.length]]) };
            });
            const shown = dirs.length === 2 ? [pairs.reduce((b, q) => (q.gap < b.gap ? q : b))] : pairs;
            shown.forEach((q) => {
                if (q.gap < 0.05 || OBVIOUS.some((o) => Math.abs(q.gap - o) < 0.05)) return;
                if (dirs.length > 2 && q.gap > 180) return;
                const rw = Math.min(0.13 * span, q.len * 0.35);
                const inset = Math.min(5, q.gap * 0.2), steps = Math.max(6, Math.ceil(q.gap / 5));
                let path = '';
                for (let i = 0; i <= steps; i++) {
                    const ang = (q.a1 + inset + (q.gap - 2 * inset) * i / steps) * rad;
                    const p = P(Number(n.x) + rw * Math.cos(ang), Number(n.y) + rw * Math.sin(ang), 0.003 * span);
                    path += `${i ? 'L' : 'M'} ${f2(p.x)} ${f2(p.y)} `;
                }
                push('marks', P(Number(n.x), Number(n.y)).d - 0.0005, `<path d="${path}" fill="none" stroke="#7c3aed" stroke-width="1.8" stroke-linecap="round"/>`);
                const mid = (q.a1 + q.gap / 2) * rad;
                const lp = P(Number(n.x) + rw * 1.75 * Math.cos(mid), Number(n.y) + rw * 1.75 * Math.sin(mid), 0.003 * span);
                addLabel(lp.x, lp.y + 3, `${Number(q.gap.toFixed(2))}°`, '#6d28d9', 'middle', 10.5, 800);
            });
        });
    }

    // ---- supports (post + base plate) ---------------------------------
    (model.supportAssignments || []).forEach((sa) => {
        const n = nodeById(sa.nodeId);
        if (!n) return;
        const type = getSupportVisualType(sa);
        const col = type === 'fixed' ? '#111827' : type === 'roller' ? '#0891b2' : type === 'hinged' ? '#475569' : '#8b5a2b';
        const hz = -0.11 * span, hw = 0.05 * span;
        const x = Number(n.x), y = Number(n.y);
        const c = [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]].map(([dx, dy]) => P(x + dx, y + dy, hz));
        const top = P(x, y, 0), bot = P(x, y, hz);
        push('supports', top.d + 0.001,
            `<path d="M ${f2(top.x)} ${f2(top.y)} L ${f2(bot.x)} ${f2(bot.y)}" stroke="${col}" stroke-width="3.2" stroke-linecap="round"/>`
            + `<polygon points="${c.map((p) => `${f2(p.x)},${f2(p.y)}`).join(' ')}" fill="${col}" fill-opacity="0.85" stroke="${col}" stroke-width="1.2" stroke-linejoin="round"/>`);
    });

    // ---- nodes -----------------------------------------------------------
    nodes.forEach((n) => {
        const p = P(Number(n.x), Number(n.y));
        const rawId = String(n.id);
        const idText = /^n/i.test(rawId) ? rawId : `N${rawId}`;
        push('nodes', p.d, `<circle cx="${f2(p.x)}" cy="${f2(p.y)}" r="11" fill="#f59e0b" stroke="#1f2937" stroke-width="1.6"/>`
            + `<text x="${f2(p.x)}" y="${f2(p.y + 3.2)}" text-anchor="middle" font-family="${FONT}" font-size="9" font-weight="800" fill="#111827">${escapeHtml(idText)}</text>`);
    });


    // ---- loads (Fz) ---------------------------------------------------------
    const money = (val) => `${formatNum(Math.abs(Number(val) || 0))} kN`;
    loads.forEach((ld) => {
        const type = String(ld.type || '');
        const fz = Number(ld.Fz) || 0;
        if (type === 'Nodal Load') {
            const n = nodeById(ld.nodeId);
            if (!n || Math.abs(fz) <= 1e-12 || !on('nodal')) return;
            const col = fz < 0 ? '#ef4444' : '#16a34a';
            const r = vArrow(Number(n.x), Number(n.y), fz, hPoint(fz), col, 3);
            push('loads', r.d - 0.002, r.svg);
            addLabel(r.top.x, r.top.y - 8, money(fz), col);
            return;
        }
        if (type === 'Element Point Load' || type === 'Element Load' || type === 'Point Load') {
            const el = elById(ld.elementId);
            if (!el || Math.abs(fz) <= 1e-12 || !on('point')) return;
            const pt = pointOn(el, ld.distance);
            if (!pt) return;
            const col = '#8b5cf6';
            const r = vArrow(pt.x, pt.y, fz, hPoint(fz), col, 3);
            push('loads', r.d - 0.002, r.svg);
            addLabel(r.top.x, r.top.y - 8, money(fz), col);
            return;
        }
        if (type === 'Element UDL') {
            const el = elById(ld.elementId);
            if (!el || !on('udl')) return;
            const base = pointOn(el, 0);
            if (!base) return;
            const L = base.L;
            const a = Math.max(0, Math.min(L, Number(ld.distance) || 0));
            const rawEnd = ld.distanceEnd === '' || ld.distanceEnd == null ? L : Number(ld.distanceEnd);
            const b = Math.max(0, Math.min(L, Number.isFinite(rawEnd) ? rawEnd : L));
            if (!(b > a)) return;
            const q1 = fz;
            const q2 = ld.FzEnd !== '' && ld.FzEnd != null && Number.isFinite(Number(ld.FzEnd)) ? Number(ld.FzEnd) : q1;
            if (Math.abs(q1) <= 1e-12 && Math.abs(q2) <= 1e-12) return;
            const count = Math.max(3, Math.min(12, Math.ceil((b - a) / span * 14) + 1));
            const col = '#0f172a';
            const tops = [], feet = [];
            let svg = '', dSum = 0;
            for (let i = 0; i <= count; i++) {
                const t = i / count, q = q1 + (q2 - q1) * t;
                const pt = pointOn(el, a + (b - a) * t);
                if (!pt) continue;
                const h = hUdl(q);
                feet.push(P(pt.x, pt.y, 0));
                tops.push(P(pt.x, pt.y, h));
                dSum += feet[feet.length - 1].d;
                if (Math.abs(q) <= 1e-12) continue;
                svg += vArrow(pt.x, pt.y, q, h, col, 1.8).svg;
            }
            if (tops.length < 2) return;
            const env = tops.map((p) => `${f2(p.x)},${f2(p.y)}`);
            const bottom = feet.slice().reverse().map((p) => `${f2(p.x)},${f2(p.y)}`);
            const poly = `<polygon points="${env.concat(bottom).join(' ')}" fill="${col}" fill-opacity="0.10" stroke="none"/>`
                + `<polyline points="${env.join(' ')}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round"/>`;
            push('loads', dSum / feet.length - 0.002, poly + svg);
            const mid = tops[Math.floor(tops.length / 2)];
            addLabel(mid.x, mid.y - 8,
                Math.abs(q1 - q2) <= 1e-12 ? `${formatNum(Math.abs(q1))} kN/m` : `${formatNum(Math.abs(q1))} → ${formatNum(Math.abs(q2))} kN/m`, col);
        }
    });

    // ---- torsions / moments (Mx along +X, My along +Y) ----------------------
    moments.forEach((m) => {
        const mx = Number(m.Mx) || 0, my = Number(m.My) || 0;
        const isNodal = m.type === 'Nodal Moment' || m.type === 'Nodal Torsion' || (!!m.nodeId && !m.elementId);
        const isElement = m.type === 'Element Moment' || m.type === 'Element Torsion' || (!!m.elementId && !m.nodeId);
        if ((!isNodal && !isElement) || (Math.abs(mx) <= 1e-12 && Math.abs(my) <= 1e-12)) return;
        if (!on(isNodal ? 'nodalMoment' : 'elementMoment')) return;
        let wx, wy;
        if (isNodal) {
            const n = nodeById(m.nodeId);
            if (!n) return;
            wx = Number(n.x); wy = Number(n.y);
        } else {
            const el = elById(m.elementId);
            const pt = el ? pointOn(el, m.distance) : null;
            if (!pt) return;
            wx = pt.x; wy = pt.y;
        }
        // A moment is drawn as a curved arrow (3/4 circle with an arrow head) that
        // wraps the axis it acts about, following the right-hand rule: Mx wraps
        // the X axis, My wraps the Y axis. Positive = counter-clockwise when
        // looking back along the +axis, negative = clockwise.
        [[mx, 'x', '#7c3aed'], [my, 'y', '#0f766e']].forEach(([val, axis, col]) => {
            if (Math.abs(val) <= 1e-12) return;
            const sign = val > 0 ? 1 : -1;
            const r = span * (0.09 + 0.05 * ratio(val, maxMom));
            const zc = r * 1.15;
            const pt = (th) => {
                const c = Math.cos(th), sn = Math.sin(th);
                // Mx: circle in the YZ plane (Y x Z = X); My: circle in the ZX plane (Z x X = Y).
                return axis === 'x' ? P(wx, wy + r * c, zc + r * sn) : P(wx + r * sn, wy, zc + r * c);
            };
            const t0 = (sign > 0 ? -60 : 210) * rad, t1 = t0 + sign * 270 * rad;
            const steps = 28;
            const pts = [];
            for (let i = 0; i <= steps; i++) pts.push(pt(t0 + (t1 - t0) * i / steps));
            const tip = pts[steps];
            // tangent for the head: use a point a little before the end
            const back = pts[steps - 3];
            const dx = tip.x - back.x, dy = tip.y - back.y, dl = Math.hypot(dx, dy) || 1;
            const ux = dx / dl, uy = dy / dl, hl = 11, hw = 6;
            const bx = tip.x - ux * hl, by = tip.y - uy * hl;
            const base = P(wx, wy, 0), cen = P(wx, wy, zc);
            let g = `<path d="M ${f2(base.x)} ${f2(base.y)} L ${f2(cen.x)} ${f2(cen.y)}" stroke="${col}" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.55" fill="none"/>`;
            g += `<polyline points="${pts.map((q) => `${f2(q.x)},${f2(q.y)}`).join(' ')}" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>`;
            g += `<polyline points="${pts.map((q) => `${f2(q.x)},${f2(q.y)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
            g += `<path d="M ${f2(tip.x + ux * 2)} ${f2(tip.y + uy * 2)} L ${f2(bx - uy * hw)} ${f2(by + ux * hw)} L ${f2(bx + uy * hw)} ${f2(by - ux * hw)} Z" fill="${col}" stroke="${col}" stroke-width="1" stroke-linejoin="round"/>`;
            push('loads', cen.d - 0.003, g);
            const top = axis === 'x' ? P(wx, wy, zc + r) : P(wx, wy, zc + r);
            addLabel(top.x, top.y - 9, `${formatNum(Math.abs(val))} kN·m`, col);
        });
    });


    // ---- compose (painter's algorithm inside each layer) ---------------------
    const flush = (layer) => layers[layer].sort((p, q) => q.d - p.d).map((i) => i.svg).join('');
    let out = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${W} ${H}" style="display:block;touch-action:none;user-select:none;-webkit-user-select:none">`;
    out += flush('ground') + flush('members') + flush('marks') + flush('supports') + flush('nodes') + flush('loads');

    // labels with simple overlap avoidance
    const placed = [];
    labels.forEach((lb) => {
        const w = lb.text.length * lb.size * 0.58, h = lb.size + 2;
        const box = (y) => {
            const x0 = lb.anchor === 'start' ? lb.x : lb.anchor === 'end' ? lb.x - w : lb.x - w / 2;
            return { x0, x1: x0 + w, y0: y - h + 2, y1: y + 2 };
        };
        let y = lb.y;
        for (let i = 0; i < 10; i++) {
            const b = box(y);
            if (!placed.some((p) => b.x0 < p.x1 && b.x1 > p.x0 && b.y0 < p.y1 && b.y1 > p.y0)) break;
            y += (i % 2 === 0 ? 1 : -1) * (Math.floor(i / 2) + 1) * (h + 1);
        }
        placed.push(box(y));
        const common = `x="${f2(lb.x)}" y="${f2(y)}" text-anchor="${lb.anchor}" font-family="${FONT}" font-size="${lb.size}" font-weight="${lb.weight}"`;
        out += `<text ${common} fill="#ffffff" stroke="#ffffff" stroke-width="3.4" stroke-linejoin="round">${escapeHtml(lb.text)}</text>`
            + `<text ${common} fill="${lb.color}">${escapeHtml(lb.text)}</text>`;
    });

    // axis triad (screen fixed, bottom-left)
    {
        const o = P(cx, cy, zMid);
        const ax = [['X', 1, 0, 0, '#dc2626'], ['Y', 0, 1, 0, '#16a34a'], ['Z', 0, 0, 1, '#2563eb']];
        const ox = W - 40, oy = H - 46;
        out += `<g>`;
        ax.forEach(([name, ux, uy, uz, col]) => {
            const p = P(cx + ux, cy + uy, zMid + uz);
            let dx = (p.x - o.x) / s, dy = (p.y - o.y) / s;
            const n = Math.hypot(dx, dy);
            const len = 26;
            const tip = n < 0.08 ? null : { x: ox + dx / n * len * Math.min(1, n), y: oy + dy / n * len * Math.min(1, n) };
            if (!tip) {
                out += `<circle cx="${ox}" cy="${oy}" r="4" fill="none" stroke="${col}" stroke-width="2"/><text x="${ox + 7}" y="${oy - 6}" font-family="${FONT}" font-size="11" font-weight="800" fill="${col}">${name}</text>`;
                return;
            }
            out += arrow({ x: ox, y: oy }, tip, col, 2.2, 7);
            out += `<text x="${f2(tip.x + (tip.x - ox) * 0.22)}" y="${f2(tip.y + (tip.y - oy) * 0.22 + 4)}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="800" fill="${col}">${name}</text>`;
        });
        out += `</g>`;
    }
    return out + '</svg>';
}

function renderGrid3D(container) {
    const rect = container.getBoundingClientRect();
    const W = Math.max(Math.round(rect.width || 800), 280);
    const H = Math.max(Math.round(rect.height || 500), 280);
    container.innerHTML = `
<div class="g3d-wrap">
  <div class="g3d-svg-host"></div>
  <div class="g3d-controls" role="toolbar" aria-label="3D view controls">
    <button type="button" class="g3d-btn" data-view="iso">3D</button>
    <button type="button" class="g3d-btn" data-view="top">Top</button>
    <button type="button" class="g3d-btn" data-view="front">Front</button>
    <button type="button" class="g3d-btn" data-view="reset">Reset</button>
  </div>
  <details class="g3d-legend">
    <summary>Legend</summary>
    <div><span class="g3d-sw" style="background:#ef4444"></span>Load Fz down (−)</div>
    <div><span class="g3d-sw" style="background:#16a34a"></span>Load Fz up (+)</div>
    <div><span class="g3d-sw" style="background:#8b5cf6"></span>Element point load</div>
    <div><span class="g3d-sw" style="background:#0f172a"></span>UDL (arrows + envelope)</div>
    <div><span class="g3d-sw" style="background:#7c3aed"></span>Moment / torsion Mx (curl about X)</div>
    <div><span class="g3d-sw" style="background:#0f766e"></span>Moment / torsion My (curl about Y)</div>
    <div class="g3d-hint">Drag: rotate · Pinch / wheel: zoom · Two fingers / right-drag: pan</div>
  </details>
</div>`;
    const wrap = container.querySelector('.g3d-wrap');
    const host = container.querySelector('.g3d-svg-host');
    let raf = 0;
    const draw = () => { raf = 0; host.innerHTML = buildStructure3DSVG(W, H); };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(draw); };
    draw();

    container.querySelectorAll('.g3d-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const k = btn.dataset.view;
            if (k === 'top') grid3DView = { ...GRID3D_DEFAULT_VIEW, az: 0, el: 90 };
            else if (k === 'front') grid3DView = { ...GRID3D_DEFAULT_VIEW, az: 0, el: 0 };
            else grid3DView = { ...GRID3D_DEFAULT_VIEW };
            draw();
        });
    });

    const pts = new Map();
    wrap.addEventListener('contextmenu', (e) => e.preventDefault());
    wrap.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.g3d-controls, .g3d-legend')) return;
        try { wrap.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    });
    const release = (e) => pts.delete(e.pointerId);
    wrap.addEventListener('pointerup', release);
    wrap.addEventListener('pointercancel', release);
    wrap.addEventListener('pointermove', (e) => {
        const prev = pts.get(e.pointerId);
        if (!prev) return;
        const cur = { x: e.clientX, y: e.clientY };
        if (pts.size === 1) {
            const dx = cur.x - prev.x, dy = cur.y - prev.y;
            if (e.buttons & 6 || e.shiftKey) {
                grid3DView.panX += dx; grid3DView.panY += dy;
            } else {
                grid3DView.az += dx * 0.45;
                grid3DView.el = Math.max(0, Math.min(90, grid3DView.el + dy * 0.35));
            }
        } else if (pts.size === 2) {
            const other = Array.from(pts.entries()).find(([id]) => id !== e.pointerId)[1];
            const oldD = Math.hypot(prev.x - other.x, prev.y - other.y) || 1;
            const newD = Math.hypot(cur.x - other.x, cur.y - other.y) || 1;
            grid3DView.zoom = Math.max(0.3, Math.min(8, grid3DView.zoom * newD / oldD));
            grid3DView.panX += (cur.x - prev.x) / 2;
            grid3DView.panY += (cur.y - prev.y) / 2;
        }
        pts.set(e.pointerId, cur);
        schedule();
    });
    wrap.addEventListener('wheel', (e) => {
        e.preventDefault();
        grid3DView.zoom = Math.max(0.3, Math.min(8, grid3DView.zoom * Math.exp(-e.deltaY * 0.0015)));
        schedule();
    }, { passive: false });
}
