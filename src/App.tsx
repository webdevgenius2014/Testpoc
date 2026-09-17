import { useRef } from "react";
import { MeasurementPanel } from "./components/MeasurementPanel";
import { InfoPanel } from "./components/InfoPanel";
import { Toolbar } from "./components/Toolbar";
import { Workspace, type WorkspaceHandle } from "./components/Workspace";
import "./App.css";

function App() {
  const workspaceRef = useRef<WorkspaceHandle>(null);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Bodice Block Studio</h1>
        <span className="app-header-subtitle">Parametric bodice pattern drafting</span>
      </header>

      <Toolbar workspaceRef={workspaceRef} />

      <main className="app-body">
        <MeasurementPanel />
        <Workspace ref={workspaceRef} />
        <InfoPanel />
      </main>
    </div>
  );
}

export default App;
