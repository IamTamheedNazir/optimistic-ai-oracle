import React from 'react';
import './LoadingSpinner.css';

/**
 * Reusable Loading Spinner Component
 * @param {string} size - Size of spinner: 'small', 'medium', 'large'
 * @param {string} message - Optional loading message
 * @param {boolean} fullScreen - Whether to show as full screen overlay
 * @param {string} color - Spinner color (default: primary)
 */
const LoadingSpinner = ({ 
  size = 'medium', 
  message = '', 
  fullScreen = false,
  color = 'primary'
}) => {
  const spinnerClass = `spinner spinner-${size} spinner-${color}`;
  
  if (fullScreen) {
    return (
      <div className="loading-overlay">
        <div className="loading-content">
          <div className={spinnerClass}></div>
          {message && <p className="loading-message">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="loading-container">
      <div className={spinnerClass}></div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
};

/**
 * Inline Loading Spinner (for buttons)
 */
export const InlineSpinner = ({ size = 'small' }) => {
  return <div className={`spinner-inline spinner-${size}`}></div>;
};

/**
 * Loading Dots Animation
 */
export const LoadingDots = ({ message = 'Loading' }) => {
  return (
    <div className="loading-dots-container">
      <span className="loading-dots-message">{message}</span>
      <span className="loading-dots">
        <span className="dot"></span>
        <span className="dot"></span>
        <span className="dot"></span>
      </span>
    </div>
  );
};

/**
 * Progress Bar
 */
export const ProgressBar = ({ progress = 0, message = '' }) => {
  return (
    <div className="progress-container">
      {message && <p className="progress-message">{message}</p>}
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        >
          <span className="progress-text">{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Pulsing Loader
 */
export const PulsingLoader = ({ message = '' }) => {
  return (
    <div className="pulsing-container">
      <div className="pulsing-circle"></div>
      {message && <p className="pulsing-message">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
