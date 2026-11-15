export default function LoadingSpinner({ label = "Cargando…", inline = false }) {
  return <span className={`loadingIndicator ${inline ? "loadingIndicatorInline" : ""}`} role={inline ? undefined : "status"} aria-live={inline ? undefined : "polite"}>
    <span className="loadingSpinner" aria-hidden="true" />
    <span>{label}</span>
  </span>;
}
