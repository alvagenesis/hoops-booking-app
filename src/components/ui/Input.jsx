const Input = ({ label, icon: Icon, className = '', id, name, ...props }) => {
  const inputId = id || name || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className={`flex flex-col space-y-1.5 ${className}`}>
      {label && <label htmlFor={inputId} className="text-xs font-medium text-gray-400">{label}</label>}
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" aria-hidden="true" />}
        <input
          id={inputId}
          name={name}
          className={`w-full bg-[#14141a] border border-gray-800 rounded-md py-2 px-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors ${Icon ? 'pl-9' : ''}`}
          {...props}
        />
      </div>
    </div>
  );
};

export default Input;
