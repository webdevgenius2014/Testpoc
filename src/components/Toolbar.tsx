import { useRef, useState } from "react";
import { usePatternStore } from "../state/patternStore";
import type { WorkspaceHandle } from "./Workspace";
import { downloadJson, readJsonFile, saveToLocalStorage, loadFromLocalStorage } from "../state/persistence";
import { exportPatternAsSvg } from "../export/exportSvg";

interface Props {
  workspaceRef: React.RefObject<WorkspaceHandle | null>;
}

export function Toolbar({ workspaceRef }: Props) {
  const pattern = usePatternStore((s) => s.pattern);
  const measurements = usePatternStore((s) => s.measurements);
  const regenerateFromMeasurements = usePatternStore((s) => s.regenerateFromMeasurements);
  const resetPattern = usePatternStore((s) => s.resetPattern);
  const buildSaveState = usePatternStore((s) => s.buildSaveState);
  const restoreState = usePatternStore((s) => s.restoreState);

  const [status, setStatus] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function flash(message: string) {
    setStatus(message);
    window.setTimeout(() => setStatus((s) => (s === message ? null : s)), 2500);
  }

  function handleSave() {
    const state = buildSaveState();
    saveToLocalStorage(state);
    downloadJson(state);
    flash("Saved");
  }

  function handleLoadClick() {
    const local = loadFromLocalStorage();
    if (local) {
      restoreState(local);
      flash("Restored last saved state");
      return;
    }
    fileInputRef.current?.click();
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const state = await readJsonFile(file);
      restoreState(state);
      flash(`Loaded ${file.name}`);
    } catch {
      flash("Could not read that file");
    }
  }

  function handleExportSvg() {
    exportPatternAsSvg(pattern, measurements);
    flash("SVG exported");
  }

  async function handleExportPdf() {
    setIsExportingPdf(true);
    try {
      const { exportPatternAsPdf } = await import("../export/exportPdf");
      await exportPatternAsPdf(pattern, measurements);
      flash("PDF exported");
    } finally {
      setIsExportingPdf(false);
    }
  }

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button onClick={regenerateFromMeasurements} title="Recalculate the block from measurements, discarding manual node edits">
          Regenerate
        </button>
        <button onClick={resetPattern} title="Restore the default test measurements">
          Reset
        </button>
      </div>

      <div className="toolbar-group">
        <button onClick={() => workspaceRef.current?.zoomOut()} aria-label="Zoom out">
          &minus;
        </button>
        <button onClick={() => workspaceRef.current?.zoomIn()} aria-label="Zoom in">
          +
        </button>
        <button onClick={() => workspaceRef.current?.fit()}>Fit to Screen</button>
        <button onClick={() => workspaceRef.current?.reset()}>Reset View</button>
      </div>

      <div className="toolbar-group">
        <button onClick={handleSave}>Save</button>
        <button onClick={handleLoadClick}>Load</button>
        <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleFileChosen} />
      </div>

      <div className="toolbar-group">
        <button onClick={handleExportSvg}>Export SVG</button>
        <button onClick={handleExportPdf} disabled={isExportingPdf}>
          {isExportingPdf ? "Exporting…" : "Export PDF"}
        </button>
      </div>

      {status && <span className="toolbar-status">{status}</span>}
    </div>
  );
}
