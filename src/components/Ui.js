import React, { useState, useRef, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react';

// ============================
// Data Freshness Utility
// ============================
const DataFreshness = {
  getAge(timestamp) {
    const ms = Date.now() - timestamp;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    return 'More than a day ago';
  },

  getStatus(timestamp) {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);

    if (minutes < 5) return { level: 'fresh', color: 'green', icon: CheckCircle };
    if (minutes < 30) return { level: 'recent', color: 'yellow', icon: Clock };
    if (minutes < 60) return { level: 'stale', color: 'orange', icon: AlertCircle };
    return { level: 'old', color: 'red', icon: XCircle };
  },

  getConfidence(timestamp) {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);

    if (minutes < 5) return 100;
    if (minutes < 30) return 80;
    if (minutes < 60) return 60;
    if (minutes < 120) return 40;
    return 20;
  }
};

// ============================ 
// UI Kit Components
// ============================
const Button = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const baseClasses = 'font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500',
    secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-800 focus:ring-slate-500',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 focus:ring-slate-500'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '', isDarkMode = false }) => (
  <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${
    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  } ${className}`}>
    {children}
  </div>
);

// Week Selector Calendar Component
const WeekSelector = ({ selectedWeek, onWeekChange, isDarkMode = false, className = '' }) => {
  const getCurrentWeekStart = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    return new Date(now.setDate(diff));
  };

  const formatWeekDisplay = (date) => {
    const weekStart = new Date(date);
    const weekEnd = new Date(date);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const formatDate = (d) => {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    
    return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
  };

  const getWeekOptions = () => {
    const options = [];
    const currentWeek = getCurrentWeekStart();
    
    // Generate last 12 weeks
    for (let i = 0; i < 12; i++) {
      const weekStart = new Date(currentWeek);
      weekStart.setDate(currentWeek.getDate() - (i * 7));
      options.push({
        value: weekStart.toISOString().split('T')[0],
        label: formatWeekDisplay(weekStart),
        isCurrentWeek: i === 0
      });
    }
    
    return options;
  };

  const weekOptions = getWeekOptions();

  return (
    <div className={`relative ${className}`}>
      <select
        value={selectedWeek || weekOptions[0].value}
        onChange={(e) => onWeekChange(e.target.value)}
        className={`text-xs px-2 py-1 rounded border transition-colors duration-200 ${
          isDarkMode 
            ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600' 
            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
        } focus:outline-none focus:ring-1 focus:ring-emerald-500`}
      >
        {weekOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.isCurrentWeek ? `Current: ${option.label}` : option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
// ============================
// Loading Overlay Component
// ============================
const LoadingOverlay = ({ isLoading, widget, t }) => {
  if (!isLoading) return null;
  
  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <span className="text-sm text-slate-600">{t?.loadingWidget || 'Loading'} {widget}...</span>
      </div>
    </div>
  );
};
// ============================
// Data Freshness Indicator Component
// ============================
const FreshnessIndicator = ({ timestamp, size = 'sm' }) => {
  const [showTimestamp, setShowTimestamp] = useState(false);
  const tooltipRef = useRef(null);
  
  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setShowTimestamp(false);
      }
    };

    if (showTimestamp) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-close after 3 seconds
      const timer = setTimeout(() => setShowTimestamp(false), 3000);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        clearTimeout(timer);
      };
    }
  }, [showTimestamp]);
  
  if (!timestamp) return null;
  
  const status = DataFreshness.getStatus(timestamp);
  const Icon = status.icon;
  
  const sizeClasses = size === 'sm' ? 'w-3 h-3 text-xs' : 'w-4 h-4 text-sm';
  
  const colorClass = {
    green: 'text-green-500',
    yellow: 'text-yellow-500',
    orange: 'text-orange-500',
    red: 'text-red-500'
  }[status.color] || 'text-slate-400';
  
  return (
    <div className="flex items-center gap-1 relative" ref={tooltipRef}>
      <button
        onClick={() => setShowTimestamp(!showTimestamp)}
        className={`${sizeClasses} ${colorClass} hover:scale-110 transition-all duration-200 cursor-pointer rounded-full p-0.5 hover:bg-slate-100`}
        title={showTimestamp ? "Hide timestamp" : "Show last update time"}
      >
        <Icon className={sizeClasses} />
      </button>
      {showTimestamp && (
        <div className="absolute top-6 right-0 z-50 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap animate-in fade-in duration-200">
          <div className="absolute -top-1 right-2 w-2 h-2 bg-slate-800 rotate-45"></div>
          {DataFreshness.getAge(timestamp)}
        </div>
      )}
    </div>
  );
};



export { Button, Card, WeekSelector , LoadingOverlay, FreshnessIndicator};