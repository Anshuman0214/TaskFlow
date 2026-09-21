import { NavLink } from "react-router-dom";

export const TabNav = ({ tabs }: { tabs: { to: string; label: string; end?: boolean }[] }) => (
  <nav className="flex gap-1 border-b border-gray-200">
    {tabs.map((tab) => (
      <NavLink
        key={tab.to}
        to={tab.to}
        end={tab.end}
        className={({ isActive }) =>
          `border-b-2 px-3 py-2 text-sm font-medium ${
            isActive
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`
        }
      >
        {tab.label}
      </NavLink>
    ))}
  </nav>
);
