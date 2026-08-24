import React, { useEffect, useState } from 'react';
import { inventoryApi, transactionApi } from '../api';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  DollarSign, 
  Package, 
  AlertCircle, 
  PieChart, 
  Activity,
  Calendar,
  Layers
} from 'lucide-react';

const Dashboard = () => {
  const [analytics, setAnalytics] = useState({
    totalValuation: 0,
    totalItems: 0,
    lowStockCount: 0,
    expiringSoonCount: 0,
    categoryBreakdown: [],
    reasonsMap: { Usage: 0, Spoilage: 0, Waste: 0, Delivery: 0, Other: 0 }
  });
  const [lowStock, setLowStock] = useState([]);
  const [expiringItems, setExpiringItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, stockRes, expRes, txRes] = await Promise.all([
        inventoryApi.getAnalytics(),
        inventoryApi.getLowStock(),
        inventoryApi.getExpiringSoon(),
        transactionApi.getTransactions()
      ]);
      setAnalytics(analyticsRes.data);
      setLowStock(stockRes.data);
      setExpiringItems(expRes.data);
      setTransactions(txRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const getReasonBadge = (reason) => {
    const r = (reason || '').toLowerCase();
    if (r.includes('spoil') || r.includes('expire')) return 'badge-danger';
    if (r.includes('waste') || r.includes('prep')) return 'badge-warning';
    if (r.includes('deliver') || r.includes('po') || r.includes('stocking')) return 'badge-success';
    if (r.includes('usage') || r.includes('kitchen')) return 'badge-purple';
    return 'badge-info';
  };

  const totalConsumed = (analytics.reasonsMap.Usage || 0) + (analytics.reasonsMap.Spoilage || 0) + (analytics.reasonsMap.Waste || 0);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Executive Inventory Analytics</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            Real-time stock valuation, consumption metrics, and risk monitoring
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchDashboardData} style={{ fontSize: '0.85rem' }}>
          <Activity size={16} /> Refresh Metrics
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card purple">
          <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">${analytics.totalValuation?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="stat-label">Total Inventory Valuation</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(79, 70, 229, 0.15)', color: 'var(--primary)' }}>
            <Layers size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{analytics.totalItems}</span>
            <span className="stat-label">Cataloged Products</span>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)' }}>
            <AlertTriangle size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{analytics.lowStockCount}</span>
            <span className="stat-label">Low Stock Alerts</span>
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)' }}>
            <Calendar size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{analytics.expiringSoonCount}</span>
            <span className="stat-label">Expiring in &lt; 7 Days</span>
          </div>
        </div>
      </div>

      {/* Charts & Breakdown Row */}
      <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
        {/* Category Value Distribution Chart */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <PieChart color="var(--primary)" size={20} />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Valuation by Category</h3>
          </div>
          {analytics.categoryBreakdown?.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No category data available.</p>
          ) : (
            <div>
              {analytics.categoryBreakdown?.map((cat, idx) => {
                const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];
                const color = colors[idx % colors.length];
                const pct = analytics.totalValuation > 0 ? ((cat.totalValuation / analytics.totalValuation) * 100).toFixed(1) : 0;
                return (
                  <div key={cat.category} className="chart-bar-row">
                    <div className="chart-bar-header">
                      <span style={{ fontWeight: '500' }}>{cat.category} ({cat.count} items)</span>
                      <span style={{ color: 'var(--text-muted)' }}>${cat.totalValuation.toFixed(2)} ({pct}%)</span>
                    </div>
                    <div className="chart-bar-bg">
                      <div className="chart-bar-fill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Consumption & Waste Breakdown */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Activity color="var(--secondary)" size={20} />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Stock Out Reason Breakdown</h3>
          </div>
          {totalConsumed === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No consumption records recorded yet.</p>
          ) : (
            <div>
              <div className="chart-bar-row">
                <div className="chart-bar-header">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#a855f7' }}></span>
                    Kitchen / Recipe Usage
                  </span>
                  <span>{analytics.reasonsMap.Usage || 0} units</span>
                </div>
                <div className="chart-bar-bg">
                  <div className="chart-bar-fill" style={{ width: `${totalConsumed > 0 ? ((analytics.reasonsMap.Usage / totalConsumed) * 100).toFixed(0) : 0}%`, background: '#a855f7' }} />
                </div>
              </div>

              <div className="chart-bar-row">
                <div className="chart-bar-header">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--danger)' }}></span>
                    Spoilage / Expired Waste
                  </span>
                  <span style={{ color: 'var(--danger)' }}>{analytics.reasonsMap.Spoilage || 0} units</span>
                </div>
                <div className="chart-bar-bg">
                  <div className="chart-bar-fill" style={{ width: `${totalConsumed > 0 ? ((analytics.reasonsMap.Spoilage / totalConsumed) * 100).toFixed(0) : 0}%`, background: 'var(--danger)' }} />
                </div>
              </div>

              <div className="chart-bar-row">
                <div className="chart-bar-header">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--warning)' }}></span>
                    Kitchen Prep Waste
                  </span>
                  <span style={{ color: 'var(--warning)' }}>{analytics.reasonsMap.Waste || 0} units</span>
                </div>
                <div className="chart-bar-bg">
                  <div className="chart-bar-fill" style={{ width: `${totalConsumed > 0 ? ((analytics.reasonsMap.Waste / totalConsumed) * 100).toFixed(0) : 0}%`, background: 'var(--warning)' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Critical Alert Tables Row */}
      <div className="dashboard-grid">
        {/* Expiring Soon Watchlist */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Calendar color="var(--danger)" size={18} />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Expiring Soon Watchlist ({expiringItems.length})</h3>
          </div>
          {expiringItems.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No items expiring in the next 7 days.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Batch</th>
                    <th>Expires</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {expiringItems.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: '500' }}>{item.name}</td>
                      <td><span className="badge badge-purple">{item.batch_no || 'N/A'}</span></td>
                      <td style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{item.expiry_date}</td>
                      <td>{item.current_stock} {item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <AlertTriangle color="var(--warning)" size={18} />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Low Stock Alerts ({lowStock.length})</h3>
          </div>
          {lowStock.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>All items are comfortably stocked.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Current</th>
                    <th>Reorder Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: '500' }}>{item.name}</td>
                      <td style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{item.current_stock} {item.unit}</td>
                      <td>{item.reorder_level} {item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Log with Reason Badges */}
      <div className="glass-card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Clock color="var(--primary)" size={18} />
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Recent Stock Movements</h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Reason / Classification</th>
                <th>Operator</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 7).map(tx => (
                <tr key={tx.id}>
                  <td>
                    {tx.type === 'IN' ? (
                      <span className="badge badge-success"><TrendingUp size={12} style={{marginRight:'4px'}}/> IN</span>
                    ) : (
                      <span className="badge badge-danger"><TrendingDown size={12} style={{marginRight:'4px'}}/> OUT</span>
                    )}
                  </td>
                  <td style={{ fontWeight: '500' }}>{tx.item_name}</td>
                  <td style={{ fontWeight: 'bold' }}>{tx.quantity}</td>
                  <td>
                    <span className={`badge ${getReasonBadge(tx.reason)}`}>
                      {tx.reason || 'General'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{tx.user_email || 'System'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {new Date(tx.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
