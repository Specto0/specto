import "./LoadingSpinner.css";

interface LoadingSpinnerProps {
  color?: string;
  size?: "small" | "medium" | "large";
}

export default function LoadingSpinner({
  color = "#3b82f6",
  size = "medium",
}: LoadingSpinnerProps) {
  return (
    <div className="loading-spinner-container">
      <div className="loading-spinner-wrapper">
        <div className={`loading-spinner loading-spinner--${size}`}>
          <div className="spinner-ring spinner-ring-1" style={{ borderTopColor: color }}></div>
          <div className="spinner-ring spinner-ring-2" style={{ borderTopColor: color }}></div>
          <div className="spinner-ring spinner-ring-3" style={{ borderTopColor: color }}></div>
        </div>
        <p className="loading-text">Specto</p>
        <p className="loading-text" style={{ fontSize: '0.6em', marginTop: '-35px' }}>Stream Without Limits</p>
      </div>
    </div>
  );
}

