import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Factory, FileText, Calculator, ShoppingBag, Box, LogOut, User, Users } from 'lucide-react';

export default function Navbar() {
  const { user, logout, isSales, isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-content">
        <div className="brand">
          <div className="brand-icon">
            <Factory size={22} />
          </div>
          <span>INDUS ERP</span>
        </div>

        <ul className="nav-links">
          <li>
            <NavLink to="/customers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users size={18} />
              <span>Customers</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/enquiries" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <FileText size={18} />
              <span>Enquiries</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/quotations" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Calculator size={18} />
              <span>Quotations</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/sales-orders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <ShoppingBag size={18} />
              <span>Sales Orders</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Box size={18} />
              <span>Inventory Monitor</span>
            </NavLink>
          </li>
        </ul>

        <div className="user-profile">
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <span className={`user-role-badge ${isAdmin ? 'role-admin' : 'role-sales'}`}>
              {user.role}
            </span>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm" title="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}
