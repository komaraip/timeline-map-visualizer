interface ExportDockProps {
  disabled: boolean;
  onCreateShort: () => void;
  onGeoJSON: () => void;
  onCSV: () => void;
}

export function ExportDock({ disabled, onCreateShort, onGeoJSON, onCSV }: ExportDockProps) {
  return <div className="export-dock"><div><strong>Turn this filtered journey into a short</strong><small>Animate the mapped route with local music, or export the underlying data.</small></div><button type="button" className="short-dock-button" onClick={onCreateShort} disabled={disabled}>Create short</button><button type="button" onClick={onGeoJSON}>GeoJSON</button><button type="button" onClick={onCSV}>CSV</button></div>;
}
