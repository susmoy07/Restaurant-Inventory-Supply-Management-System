import React, { useEffect, useState } from 'react';
import { inventoryApi, transactionApi } from '../api';
import { AlertTriangle, TrendingUp, TrendingDown, Clock } from 'lucide-react';

const Dashboard = () => {
  const [lowStock, setLowStock] = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [stockRes, txRes] = await Promise.all([
        inventoryApi.getLowStock(),
        transactionApi.getTransactions()
      ]);
      setLowStock(stockRes.data);
      setTransactions(txRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data', err);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Dashboard Overview</h2>
      </div>

      <div className="dashboard-grid">
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <AlertTriangle color="var(--warning)" />
            <h3 style={{ margin: 0 }}>Low Stock Alerts ({lowStock.length})</h3>
          </div>
          {lowStock.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>All items are sufficiently stocked.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Current</th>
                    <th>Reorder</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map(item => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{item.current_stock} {item.unit}</td>
                      <td>{item.reorder_level} {item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Clock color="var(--primary)" />
            <h3 style={{ margin: 0 }}>Recent Transactions</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 5).map(tx => (
                  <tr key={tx.id}>
                    <td>
                      {tx.type === 'IN' ? (
                        <span className="badge badge-success"><TrendingUp size={12} style={{marginRight:'4px'}}/> IN</span>
                      ) : (
                        <span className="badge badge-warning"><TrendingDown size={12} style={{marginRight:'4px'}}/> OUT</span>
                      )}
                    </td>
                    <td>{tx.item_name}</td>
                    <td>{tx.quantity}</td>
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
    </div>
  );
};

export default Dashboard;
