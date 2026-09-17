import type { PatternPiece, PieceId } from "../engine/types";
import { boundaryPath, edgePath } from "../engine/patternToPath";
import { PATTERN_STYLE } from "../rendering/style";

interface Props {
  piece: PatternPiece;
  offsetX: number;
  selectedNodeId: string | null;
  onNodePointerDown: (pieceId: PieceId, nodeId: string, e: React.PointerEvent) => void;
  /** Scales node handles and label text so they stay a sensible on-screen
   * size across zoom levels (strokes handle this on their own via
   * vector-effect="non-scaling-stroke"). */
  screenScale: number;
}

// Pixel-space stroke widths for the interactive view. These are independent
// of PATTERN_STYLE's cm-based export widths (which represent real print
// thickness at 1:1 scale) — combined with non-scaling-stroke, these values
// read as a constant, crisp line weight at any zoom level.
const PX = { boundary: 1.6, construction: 1, dart: 1.5, grainline: 1.5, node: 1.2 };

export function PatternPieceView({ piece, offsetX, selectedNodeId, onNodePointerDown, screenScale }: Props) {
  const editableNodes = Object.values(piece.nodes).filter((n) => n.editable);

  return (
    <g transform={`translate(${offsetX}, 0)`} data-piece={piece.id}>
      {piece.construction.map((line) => (
        <path
          key={line.id}
          d={edgePath([line], piece.nodes)}
          fill="none"
          stroke={PATTERN_STYLE.construction.stroke}
          strokeWidth={PX.construction}
          vectorEffect="non-scaling-stroke"
          strokeDasharray="6,4"
        />
      ))}

      <path
        d={boundaryPath(piece.boundary, piece.nodes)}
        fill={PATTERN_STYLE.background}
        stroke={PATTERN_STYLE.boundary.stroke}
        strokeWidth={PX.boundary}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />

      {piece.darts.map((dart) => (
        <path
          key={dart.id}
          d={`M ${dart.legStart.x} ${dart.legStart.y} L ${dart.apex.x} ${dart.apex.y} L ${dart.legEnd.x} ${dart.legEnd.y}`}
          fill="none"
          stroke={PATTERN_STYLE.dart.stroke}
          strokeWidth={PX.dart}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      ))}

      <line
        x1={piece.grainline.from.x}
        y1={piece.grainline.from.y}
        x2={piece.grainline.to.x}
        y2={piece.grainline.to.y}
        stroke={PATTERN_STYLE.grainline.stroke}
        strokeWidth={PX.grainline}
        vectorEffect="non-scaling-stroke"
        markerStart="url(#arrow-start)"
        markerEnd="url(#arrow-end)"
      />

      {piece.labels.map((label) => (
        <text
          key={label.id}
          x={label.position.x}
          y={label.position.y}
          fill={PATTERN_STYLE.labelColor}
          fontSize={PATTERN_STYLE.labelSizes[label.size ?? "sm"] * screenScale}
          fontWeight={label.size === "md" ? 700 : 500}
          fontFamily="'Segoe UI', Helvetica, Arial, sans-serif"
          transform={label.rotation ? `rotate(${label.rotation} ${label.position.x} ${label.position.y})` : undefined}
        >
          {label.text}
        </text>
      ))}

      {editableNodes.map((node) => {
        const isSelected = selectedNodeId === node.id;
        return (
          <circle
            key={node.id}
            cx={node.x}
            cy={node.y}
            r={PATTERN_STYLE.nodeRadius * screenScale}
            fill={isSelected ? PATTERN_STYLE.nodeSelectedFill : PATTERN_STYLE.nodeEditableFill}
            stroke={PATTERN_STYLE.nodeStroke}
            strokeWidth={PX.node}
            vectorEffect="non-scaling-stroke"
            style={{ cursor: "grab" }}
            onPointerDown={(e) => onNodePointerDown(piece.id, node.id, e)}
          >
            <title>{node.label ?? node.id}</title>
          </circle>
        );
      })}
    </g>
  );
}
