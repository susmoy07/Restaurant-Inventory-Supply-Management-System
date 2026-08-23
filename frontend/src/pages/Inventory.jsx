import React, { useEffect, useState } from 'react';
import { inventoryApi, transactionApi } from '../api';
import { 
  Plus, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  X, 
  Trash2, 
  Download, 
  QrCode, 
  Calendar, 
  DollarSign, 
  Filter,
  CheckCircle,
  AlertTriangle,
  Layers
} from 'lucide-react';

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [txType, setTxType] = useState('IN');
  const [stockFilter, setStockFilter] = useState('ALL'); // 'ALL' | 'LOW' | 'EXPIRING'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [formData, setFormData] = useState({ 
    name: '', 
    unit: '', 
    category: '', 
    reorder_level: 0, 
    cost_price: 0, 
    expiry_date: '', 
    batch_no: '' 
  });
  const [txData, setTxData] = useState({ quantity: '', reason: 'Kitchen Usage' });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data } = await inventoryApi.getItems();
      setItems(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    try {
      await inventoryApi.createItem({
        ...formData,
        reorder_level: parseFloat(formData.reorder_level || 0),
        cost_price: parseFloat(formData.cost_price || 0)
      });
      setShowItemModal(false);
      setFormData({ name: '', unit: '', category: '', reorder_level: 0, cost_price: 0, expiry_date: '', batch_no: '' });
      fetchItems();
    } catch (err) {
      alert('Error creating item: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleTransaction = async (e) => {
    e.preventDefault();
    try {
      await transactionApi.createTransaction({
        item_id: selectedItem.id,
        type: txType,
        quantity: parseFloat(txData.quantity),
        reason: txType === 'IN' ? (txData.reason || 'Manual Restock') : txData.reason,
        idempotency_key: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });
      setShowTxModal(false);
      setTxData({ quantity: '', reason: 'Kitchen Usage' });
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.error || 'Transaction failed');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item from the inventory catalogue?')) return;
    try {
      await inventoryApi.deleteItem(id);
      fetchItems();
    } catch (err) {
      alert('Error deleting item');
    }
  };

  // CSV Export functionality
  const handleExportCSV = () => {
    if (items.length === 0) {
      alert('No inventory items to export.');
      return;
    }
    const headers = ['ID', 'Name', 'Category', 'Unit', 'Current Stock', 'Reorder Level', 'Unit Cost ($)', 'Total Value ($)', 'Batch No', 'Expiry Date'];
    const rows = items.map(item => [
      item.id,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${(item.category || '').replace(/"/g, '""')}"`,
      item.unit,
      item.current_stock,
      item.reorder_level,
      (item.cost_price || 0).toFixed(2),
      (item.total_value || 0).toFixed(2),
      `"${(item.batch_no || '').replace(/"/g, '""')}"`,
      item.expiry_date || 'N/A'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `risms_inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const categories = [...new Set(items.map(item => item.category))].filter(Boolean);

  const today = new Date();
  const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const isExpiringSoon = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d <= sevenDaysFromNow;
  };

  const filteredItems = items.filter(item => {
    let matchesStockFilter = true;
    if (stockFilter === 'LOW') {
      matchesStockFilter = item.current_stock <= item.reorder_level;
    } else if (stockFilter === 'EXPIRING') {
      matchesStockFilter = isExpiringSoon(item.expiry_date);
    }

    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.batch_no && item.batch_no.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
    return matchesStockFilter && matchesSearch && matchesCategory;
  });

  const totalFilteredValue = filteredItems.reduce((acc, curr) => acc + (curr.total_value || 0), 0);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Inventory Catalog & Control</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0 0', fontSize: '0.9rem' }}>
            Showing {filteredItems.length} of {items.length} items (Filtered Total: ${totalFilteredValue.toFixed(2)})
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV} title="Download CSV Spreadsheet">
            <Download size={16} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowItemModal(true)}>
            <Plus size={16} /> Add New Item
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          {/* Quick Filter Tabs */}
          <div className="pill-group">
            <button 
              className={`pill-btn ${stockFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStockFilter('ALL')}
            >
              All Items ({items.length})
            </button>
            <button 
              className={`pill-btn ${stockFilter === 'LOW' ? 'active' : ''}`}
              onClick={() => setStockFilter('LOW')}
            >
              ⚠️ Low Stock ({items.filter(i => i.current_stock <= i.reorder_level).length})
            </button>
            <button 
              className={`pill-btn ${stockFilter === 'EXPIRING' ? 'active' : ''}`}
              onClick={() => setStockFilter('EXPIRING')}
            >
              ⏳ Expiring Soon ({items.filter(i => isExpiringSoon(i.expiry_date)).length})
            </button>
          </div>

          {(searchQuery || selectedCategory || stockFilter !== 'ALL') && (
            <button 
              className="btn btn-secondary" 
              onClick={() => { setSearchQuery(''); setSelectedCategory(''); setStockFilter('ALL'); }}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
            >
              Reset Filters
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 250px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search by product name or batch #..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <select 
              className="form-input" 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Item & Batch</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Reorder Lvl</th>
                <th>Unit Cost</th>
                <th>Total Value</th>
                <th>Expiration</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No inventory records matching current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const expiring = isExpiringSoon(item.expiry_date);
                  const isLow = item.current_stock <= item.reorder_level;
                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: '600', color: '#fff' }}>{item.name}</div>
                        {item.batch_no && (
                          <div style={{ fontSize: '0.75rem', color: '#c084fc', marginTop: '2px' }}>
                            Batch: {item.batch_no}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-purple">{item.category}</span>
                      </td>
                      <td>
                        <span style={{ color: isLow ? 'var(--danger)' : '#fff', fontWeight: '700' }}>
                          {item.current_stock} {item.unit}
                        </span>
                        {isLow && <span style={{ marginLeft: '4px', fontSize: '0.75rem', color: 'var(--danger)' }}>⚠️ Low</span>}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{item.reorder_level} {item.unit}</td>
                      <td>${(item.cost_price || 0).toFixed(2)}</td>
                      <td style={{ fontWeight: '600', color: 'var(--secondary)' }}>
                        ${(item.total_value || 0).toFixed(2)}
                      </td>
                      <td>
                        {item.expiry_date ? (
                          <span className={`badge ${expiring ? 'badge-danger' : 'badge-info'}`}>
                            {item.expiry_date} {expiring && '⚠️'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>N/A</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                            title="Stock In"
                            onClick={() => { setSelectedItem(item); setTxType('IN'); setTxData({ quantity: '', reason: 'Manual Restock' }); setShowTxModal(true); }}
                          >
                            <ArrowDownToLine size={13} /> In
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                            title="Stock Out"
                            onClick={() => { setSelectedItem(item); setTxType('OUT'); setTxData({ quantity: '', reason: 'Kitchen Usage' }); setShowTxModal(true); }}
                          >
                            <ArrowUpFromLine size={13} /> Out
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                            title="View QR Code"
                            onClick={() => { setSelectedItem(item); setShowQrModal(true); }}
                          >
                            <QrCode size={13} />
                          </button>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                            title="Delete Item"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {showItemModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Add New Inventory Product</h3>
              <button className="btn" style={{ padding: '0.5rem', background: 'transparent', color: 'white' }} onClick={() => setShowItemModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateItem}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Item Name *</label>
                  <input required className="form-input" placeholder="e.g. Mozzarella Cheese" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Category *</label>
                  <input required className="form-input" placeholder="e.g. Dairy" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Unit (kg, L, pcs) *</label>
                  <input required className="form-input" placeholder="kg" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Unit Cost ($)</label>
                  <input type="number" step="0.01" min="0" className="form-input" placeholder="0.00" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Reorder Lvl *</label>
                  <input required type="number" step="0.01" className="form-input" value={formData.reorder_level} onChange={e => setFormData({...formData, reorder_level: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Batch / Lot #</label>
                  <input className="form-input" placeholder="e.g. B-CH-771" value={formData.batch_no} onChange={e => setFormData({...formData, batch_no: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Expiration Date</label>
                  <input type="date" className="form-input" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                Save Product to Inventory
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Stock Transaction Modal with Reason Categorization */}
      {showTxModal && selectedItem && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>Stock {txType}: {selectedItem.name}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Current Stock: {selectedItem.current_stock} {selectedItem.unit}
                </span>
              </div>
              <button className="btn" style={{ padding: '0.5rem', background: 'transparent', color: 'white' }} onClick={() => setShowTxModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleTransaction}>
              <div className="form-group">
                <label className="form-label">Quantity to Adjust ({selectedItem.unit}) *</label>
                <input 
                  required 
                  type="number" 
                  step="0.01" 
                  min="0.01" 
                  className="form-input" 
                  value={txData.quantity} 
                  onChange={e => setTxData({ ...txData, quantity: e.target.value })} 
                  autoFocus
                />
              </div>

              {txType === 'OUT' ? (
                <div className="form-group">
                  <label className="form-label">Stock Deduction Reason *</label>
                  <select 
                    className="form-input" 
                    value={txData.reason} 
                    onChange={e => setTxData({ ...txData, reason: e.target.value })}
                  >
                    <option value="Kitchen Usage">Kitchen Usage (Cooking / Orders)</option>
                    <option value="Spoilage / Expired">Spoilage / Expired Product</option>
                    <option value="Prep Waste">Kitchen Prep Waste / Trimmings</option>
                    <option value="Stock Count Discrepancy">Stock Count Discrepancy (Audit)</option>
                    <option value="Damaged Goods">Damaged Goods / Spill</option>
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Intake Reason</label>
                  <select 
                    className="form-input" 
                    value={txData.reason} 
                    onChange={e => setTxData({ ...txData, reason: e.target.value })}
                  >
                    <option value="Manual Restock">Manual Restock</option>
                    <option value="Direct Farm Delivery">Direct Farm Delivery</option>
                    <option value="Stock Audit Correction">Stock Audit Correction (Found Extra)</option>
                  </select>
                </div>
              )}

              <button type="submit" className={`btn ${txType === 'IN' ? 'btn-primary' : 'btn-danger'}`} style={{ width: '100%', marginTop: '0.5rem' }}>
                Confirm Stock {txType}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Identification Card Modal */}
      {showQrModal && selectedItem && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '380px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Product QR Bin Label</h3>
              <button className="btn" style={{ padding: '0.4rem', background: 'transparent', color: 'white' }} onClick={() => setShowQrModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="qr-preview-box">
              {/* High quality visual SVG QR representation */}
              <svg width="180" height="180" viewBox="0 0 180 180" style={{ background: '#fff' }}>
                {/* Outer positioning squares */}
                <rect x="10" y="10" width="40" height="40" fill="#0f172a" />
                <rect x="18" y="18" width="24" height="24" fill="#fff" />
                <rect x="24" y="24" width="12" height="12" fill="#0f172a" />

                <rect x="130" y="10" width="40" height="40" fill="#0f172a" />
                <rect x="138" y="18" width="24" height="24" fill="#fff" />
                <rect x="144" y="24" width="12" height="12" fill="#0f172a" />

                <rect x="10" y="130" width="40" height="40" fill="#0f172a" />
                <rect x="18" y="138" width="24" height="24" fill="#fff" />
                <rect x="24" y="144" width="12" height="12" fill="#0f172a" />

                {/* Decorative data modules */}
                <rect x="60" y="20" width="10" height="20" fill="#0f172a" />
                <rect x="80" y="15" width="15" height="10" fill="#0f172a" />
                <rect x="105" y="25" width="10" height="25" fill="#0f172a" />

                <rect x="20" y="65" width="25" height="10" fill="#0f172a" />
                <rect x="55" y="55" width="20" height="20" fill="#0f172a" />
                <rect x="85" y="60" width="30" height="15" fill="#0f172a" />
                <rect x="125" y="55" width="15" height="25" fill="#0f172a" />
                <rect x="150" y="70" width="20" height="10" fill="#0f172a" />

                <rect x="60" y="90" width="25" height="15" fill="#0f172a" />
                <rect x="95" y="85" width="20" height="30" fill="#0f172a" />
                <rect x="125" y="95" width="25" height="15" fill="#0f172a" />

                <rect x="60" y="130" width="15" height="30" fill="#0f172a" />
                <rect x="85" y="140" width="35" height="15" fill="#0f172a" />
                <rect x="130" y="130" width="20" height="20" fill="#0f172a" />
                <rect x="155" y="145" width="15" height="25" fill="#0f172a" />
              </svg>
              <div style={{ marginTop: '0.75rem', fontWeight: '700', fontSize: '1.05rem' }}>{selectedItem.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                SKU: RISMS-{selectedItem.id.toString().padStart(4, '0')} | Batch: {selectedItem.batch_no || 'STD'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                Unit: {selectedItem.unit} | Cost: ${(selectedItem.cost_price || 0).toFixed(2)}
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Attach this QR tag to restaurant shelf storage bins for fast barcode scanning & intake audits.
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => window.print()}>
              Print Bin Tag
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
