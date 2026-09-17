import { usePatternStore } from "../state/patternStore";
import { PATTERN_STYLE } from "../rendering/style";

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export function InfoPanel() {
  const pattern = usePatternStore((s) => s.pattern);
  const selectedNode = usePatternStore((s) => s.selectedNode);
  const moveNode = usePatternStore((s) => s.moveNode);

  const selected =
    selectedNode &&
    (selectedNode.piece === "front" ? pattern.front : pattern.back).nodes[selectedNode.nodeId];

  const allDarts = [
    ...pattern.front.darts.map((d) => ({ ...d, piece: "Front" as const })),
    ...pattern.back.darts.map((d) => ({ ...d, piece: "Back" as const })),
  ];

  return (
    <div className="panel info-panel">
      <div className="panel-header">
        <h2>Pattern Details</h2>
      </div>

      <section className="info-section">
        <h3>Selected Node</h3>
        {selected ? (
          <div className="selected-node">
            <p className="selected-node-label">{selected.label ?? selected.id}</p>
            <div className="coord-row">
              <label>
                X
                <input
                  type="number"
                  step={0.1}
                  value={round(selected.x)}
                  onChange={(e) => moveNode(selectedNode!.piece, selectedNode!.nodeId, { x: parseFloat(e.target.value) || 0, y: selected.y })}
                />
              </label>
              <label>
                Y
                <input
                  type="number"
                  step={0.1}
                  value={round(selected.y)}
                  onChange={(e) => moveNode(selectedNode!.piece, selectedNode!.nodeId, { x: selected.x, y: parseFloat(e.target.value) || 0 })}
                />
              </label>
            </div>
            <p className="hint">Drag on the canvas, or type exact coordinates (cm) here.</p>
          </div>
        ) : (
          <p className="hint">Click a blue node on the pattern to select and edit it.</p>
        )}
      </section>

      <section className="info-section">
        <h3>Darts</h3>
        <table className="darts-table">
          <thead>
            <tr>
              <th>Piece</th>
              <th>Dart</th>
              <th>Intake</th>
            </tr>
          </thead>
          <tbody>
            {allDarts.map((d) => (
              <tr key={`${d.piece}-${d.id}`}>
                <td>{d.piece}</td>
                <td>{d.label}</td>
                <td>{round(d.width)} cm</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="info-section">
        <h3>Legend</h3>
        <ul className="legend">
          <li>
            <span className="swatch" style={{ background: PATTERN_STYLE.boundary.stroke }} /> Cutting boundary
          </li>
          <li>
            <span className="swatch dashed" style={{ borderColor: PATTERN_STYLE.construction.stroke }} /> Construction line
          </li>
          <li>
            <span className="swatch" style={{ background: PATTERN_STYLE.dart.stroke }} /> Dart leg
          </li>
          <li>
            <span className="swatch" style={{ background: PATTERN_STYLE.grainline.stroke }} /> Grainline
          </li>
          <li>
            <span className="swatch dot" style={{ background: PATTERN_STYLE.nodeEditableFill }} /> Editable node
          </li>
        </ul>
      </section>
    </div>
  );
}
