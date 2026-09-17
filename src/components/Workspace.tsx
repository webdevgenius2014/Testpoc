import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { usePatternStore } from "../state/patternStore";
import { computeLayout } from "../rendering/layout";
import { useViewport } from "../interaction/useViewport";
import { PatternPieceView } from "./PatternPieceView";
import type { PieceId } from "../engine/types";
import { PATTERN_STYLE } from "../rendering/style";

export interface WorkspaceHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  fit: () => void;
}

function clientToSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const transformed = pt.matrixTransform(ctm.inverse());
  return { x: transformed.x, y: transformed.y };
}

export const Workspace = forwardRef<WorkspaceHandle>(function Workspace(_props, ref) {
  const pattern = usePatternStore((s) => s.pattern);
  const moveNode = usePatternStore((s) => s.moveNode);
  const selectedNode = usePatternStore((s) => s.selectedNode);
  const selectNode = usePatternStore((s) => s.selectNode);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ piece: PieceId; nodeId: string } | null>(null);
  const [isPanningCursor, setIsPanningCursor] = useState(false);

  const layout = useMemo(() => computeLayout(pattern), [pattern]);
  const bounds = useMemo(
    () => ({ minX: 0, minY: layout.minY, maxX: layout.totalWidth, maxY: layout.minY + layout.totalHeight }),
    [layout],
  );

  const viewport = useViewport(bounds);

  useImperativeHandle(ref, () => ({
    zoomIn: viewport.zoomIn,
    zoomOut: viewport.zoomOut,
    reset: viewport.reset,
    fit: () => viewport.fit(bounds),
  }));

  // Node handles/labels are drawn in cm-space, so shrink them as the
  // viewBox narrows (zooming in) to keep their on-screen size sensible.
  const homeWidth = Math.max(1, bounds.maxX - bounds.minX);
  const screenScale = Math.min(2.5, Math.max(0.5, viewport.viewBox.w / homeWidth));

  function handleNodePointerDown(pieceId: PieceId, nodeId: string, e: React.PointerEvent) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { piece: pieceId, nodeId };
    selectNode({ piece: pieceId, nodeId });
  }

  function handleBackgroundPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (dragRef.current) return;
    setIsPanningCursor(true);
    viewport.beginPan(e.clientX, e.clientY);
    selectNode(null);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    if (dragRef.current) {
      const p = clientToSvgPoint(svg, e.clientX, e.clientY);
      moveNode(dragRef.current.piece, dragRef.current.nodeId, p);
    } else if (viewport.isPanning()) {
      const pixelToUnit = viewport.viewBox.w / svg.clientWidth;
      viewport.updatePan(e.clientX, e.clientY, pixelToUnit);
    }
  }

  function handlePointerUp() {
    dragRef.current = null;
    viewport.endPan();
    setIsPanningCursor(false);
  }

  function handleWheel(e: React.WheelEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    viewport.onWheel(e, (cx, cy) => clientToSvgPoint(svg, cx, cy));
  }

  const vb = viewport.viewBox;

  return (
    <div className="workspace">
      <svg
        ref={svgRef}
        className="workspace-svg"
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        onPointerDown={handleBackgroundPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        style={{ cursor: isPanningCursor ? "grabbing" : "default" }}
      >
        <defs>
          <marker id="arrow-start" markerWidth="4" markerHeight="4" refX="0.5" refY="2" orient="auto-start-reverse">
            <path d="M0,0 L4,2 L0,4 Z" fill={PATTERN_STYLE.grainline.stroke} />
          </marker>
          <marker id="arrow-end" markerWidth="4" markerHeight="4" refX="0.5" refY="2" orient="auto-start-reverse">
            <path d="M0,0 L4,2 L0,4 Z" fill={PATTERN_STYLE.grainline.stroke} />
          </marker>
          <pattern id="cm-grid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#000000" strokeOpacity="0.045" strokeWidth="0.05" />
          </pattern>
        </defs>

        <rect x={vb.x - vb.w} y={vb.y - vb.h} width={vb.w * 3} height={vb.h * 3} fill="url(#cm-grid)" />

        <PatternPieceView
          piece={pattern.front}
          offsetX={layout.frontOffsetX}
          selectedNodeId={selectedNode?.piece === "front" ? selectedNode.nodeId : null}
          onNodePointerDown={handleNodePointerDown}
          screenScale={screenScale}
        />
        <PatternPieceView
          piece={pattern.back}
          offsetX={layout.backOffsetX}
          selectedNodeId={selectedNode?.piece === "back" ? selectedNode.nodeId : null}
          onNodePointerDown={handleNodePointerDown}
          screenScale={screenScale}
        />
      </svg>
    </div>
  );
});
