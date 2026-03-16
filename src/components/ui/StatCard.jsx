const StatCard = ({ title, value, icon, trend }) => {
  const Icon = icon;
  return (
    <div className="bg-[#111116] border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <p className="text-gray-400 text-sm font-medium">{title}</p>
        <div className="p-2 bg-[#1a1a24] rounded-lg">
          <Icon className="w-4 h-4 text-blue-400" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-100">{value}</p>
      {trend && <p className="text-xs text-gray-500 mt-2">{trend}</p>}
    </div>
  );
};

export default StatCard;
