import React, { useContext } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, Package, Truck, ShoppingCart, LogOut } from 'lucide-react';

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/inventory', label: 'Inventory', icon: <Package size={20} /> },
    { path: '/suppliers', label: 'Suppliers', icon: <Truck size={20} /> },
    { path: '/orders', label: 'Orders', icon: <ShoppingCart size={20} /> },
  ];

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div style={{ padding: '0 1rem', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0, color: 'var(--primary)' }}>RISMS</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Role: {user?.role}</span>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navItems.map(item => (
            <Link 
              key={item.path} 
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                color: location.pathname === item.path ? 'white' : 'var(--text-muted)',
                background: location.pathname === item.path ? 'rgba(79, 70, 229, 0.2)' : 'transparent',
                borderLeft: location.pathname === item.path ? '3px solid var(--primary)' : '3px solid transparent'
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <button onClick={handleLogout} className="btn btn-secondary" style={{ marginTop: 'auto', width: '100%', justifyContent: 'flex-start' }}>
          <LogOut size={20} /> Logout
        </button>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
