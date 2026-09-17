import { useCallback, useRef, useState } from "react";

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const MIN_SCALE = 0.15;
const MAX_SCALE = 12;

function boundsToViewBox(bounds: ViewportBounds, paddingRatio = 0.12): ViewBox {
  const w = Math.max(1, bounds.maxX - bounds.minX);
  const h = Math.max(1, bounds.maxY - bounds.minY);
  const padX = w * paddingRatio;
  const padY = h * paddingRatio;
  return { x: bounds.minX - padX, y: bounds.minY - padY, w: w + padX * 2, h: h + padY * 2 };
}

/**
 * Owns the SVG viewBox for the pattern workspace: zoom (in/out/wheel, always
 * anchored at the cursor), pan (pointer drag), reset, and fit-to-bounds.
 * Coordinates stay in pattern-space (cm) the whole time — only the viewBox
 * window into that space changes, so geometry itself is never rescaled.
 */
export function useViewport(initialBounds: ViewportBounds) {
  const [viewBox, setViewBox] = useState<ViewBox>(() => boundsToViewBox(initialBounds));
  const homeBounds = useRef<ViewportBounds>(initialBounds);
  const panState = useRef<{ startClientX: number; startClientY: number; start: ViewBox } | null>(null);

  const fit = useCallback((bounds: ViewportBounds) => {
    homeBounds.current = bounds;
    setViewBox(boundsToViewBox(bounds));
  }, []);

  const reset = useCallback(() => {
    setViewBox(boundsToViewBox(homeBounds.current));
  }, []);

  const zoomAt = useCallback((factor: number, anchor?: { x: number; y: number }) => {
    setViewBox((vb) => {
      const nextW = clampScale(vb.w, factor, homeBounds.current);
      const nextH = (nextW / vb.w) * vb.h;
      const ax = anchor ? anchor.x : vb.x + vb.w / 2;
      const ay = anchor ? anchor.y : vb.y + vb.h / 2;
      const ratioX = (ax - vb.x) / vb.w;
      const ratioY = (ay - vb.y) / vb.h;
      return {
        x: ax - ratioX * nextW,
        y: ay - ratioY * nextH,
        w: nextW,
        h: nextH,
      };
    });
  }, []);

  const zoomIn = useCallback(() => zoomAt(1 / 1.25), [zoomAt]);
  const zoomOut = useCallback(() => zoomAt(1.25), [zoomAt]);

  const onWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>, toSvgPoint: (clientX: number, clientY: number) => { x: number; y: number }) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
      const anchor = toSvgPoint(e.clientX, e.clientY);
      zoomAt(factor, anchor);
    },
    [zoomAt],
  );

  const beginPan = useCallback((clientX: number, clientY: number) => {
    panState.current = { startClientX: clientX, startClientY: clientY, start: viewBox };
  }, [viewBox]);

  const updatePan = useCallback((clientX: number, clientY: number, pixelToUnit: number) => {
    if (!panState.current) return;
    const dx = (clientX - panState.current.startClientX) * pixelToUnit;
    const dy = (clientY - panState.current.startClientY) * pixelToUnit;
    const start = panState.current.start;
    setViewBox({ ...start, x: start.x - dx, y: start.y - dy });
  }, []);

  const endPan = useCallback(() => {
    panState.current = null;
  }, []);

  return { viewBox, zoomIn, zoomOut, reset, fit, onWheel, beginPan, updatePan, endPan, isPanning: () => panState.current !== null };
}

function clampScale(currentW: number, factor: number, home: ViewportBounds): number {
  const homeW = Math.max(1, home.maxX - home.minX) * 1.24;
  const next = currentW * factor;
  const minW = homeW / MAX_SCALE;
  const maxW = homeW * (1 / MIN_SCALE);
  return Math.min(maxW, Math.max(minW, next));
}
