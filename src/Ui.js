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

export { Button, Card, WeekSelector };