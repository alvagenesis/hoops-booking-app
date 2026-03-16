const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "inline-flex items-center justify-center px-4 py-2 text-sm font-medium transition-colors rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0a]";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-[#2a2a35] text-gray-200 hover:bg-[#3f3f4e] focus:ring-gray-500",
    outline: "border border-gray-700 text-gray-300 hover:bg-gray-800 focus:ring-gray-600",
    ghost: "text-gray-400 hover:text-white hover:bg-gray-800 focus:ring-gray-600",
    social: "bg-white text-gray-900 hover:bg-gray-100 border border-gray-200 w-full"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
