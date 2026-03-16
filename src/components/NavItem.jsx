import { NavLink } from 'react-router-dom';

const NavItem = ({ icon, label, to }) => {
  const Icon = icon;
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
          ? 'bg-blue-600/10 text-blue-400'
          : 'text-gray-400 hover:bg-[#1a1a24] hover:text-gray-200'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-gray-500'}`} />
          {label}
        </>
      )}
    </NavLink>
  );
};

export default NavItem;
