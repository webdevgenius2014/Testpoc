import { MEASUREMENT_FIELDS, validateMeasurements } from "../engine/measurements";
import { usePatternStore } from "../state/patternStore";

export function MeasurementPanel() {
  const measurements = usePatternStore((s) => s.measurements);
  const setMeasurement = usePatternStore((s) => s.setMeasurement);
  const warnings = validateMeasurements(measurements);

  return (
    <div className="panel measurement-panel">
      <div className="panel-header">
        <h2>Measurements</h2>
        <p className="panel-subtitle">Every change recalculates the block instantly.</p>
      </div>

      <div className="measurement-list">
        {MEASUREMENT_FIELDS.map((field) => (
          <label key={field.key} className="measurement-field">
            <span className="measurement-label">{field.label}</span>
            <div className="measurement-input-row">
              <input
                type="number"
                inputMode="decimal"
                min={field.min}
                max={field.max}
                step={field.step}
                value={measurements[field.key]}
                onChange={(e) => setMeasurement(field.key, parseFloat(e.target.value))}
              />
              <span className="measurement-unit">{field.unit}</span>
            </div>
            <span className="measurement-help">{field.help}</span>
          </label>
        ))}
      </div>

      {warnings.length > 0 && (
        <div className="warning-box">
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}
    </div>
  );
}
