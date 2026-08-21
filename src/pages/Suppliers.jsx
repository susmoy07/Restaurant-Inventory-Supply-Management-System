import React, { useEffect, useState } from 'react';
import { supplierApi, inventoryApi } from '../api';
import { Plus, X, Link as LinkIcon } from 'lucide-react';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  
  const [formData, setFormData] = useState({ name: '', contact_info: '' });
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [suppRes, itemRes] = await Promise.all([
        supplierApi.getSuppliers(),
        inventoryApi.getItems()
      ]);
      setSuppliers(suppRes.data);
      setItems(itemRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      await supplierApi.createSupplier(formData);
      setShowSupplierModal(false);
      setFormData({ name: '', contact_info: '' });
      fetchData();
    } catch (err) {
      alert('Error creating supplier');
    }
  };

  const handleLinkItem = async (e) => {
    e.preventDefault();
    if (!selectedItemId) return;
    try {
      await supplierApi.linkItem(selectedSupplier.id, selectedItemId);
      setShowLinkModal(false);
      setSelectedItemId('');
      fetchData();
    } catch (err) {
      alert('Error linking item');
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Suppliers Management</h2>
        <button className="btn btn-primary" onClick={() => setShowSupplierModal(true)}>
          <Plus size={18} /> New Supplier
        </button>
      </div>

      <div className="dashboard-grid">
        {suppliers.map(supplier => (
          <div key={supplier.id} className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0' }}>{supplier.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>{supplier.contact_info}</p>
              </div>
            </div>
            
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Supplied Items</h4>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  onClick={() => { setSelectedSupplier(supplier); setShowLinkModal(true); }}
                >
                  <LinkIcon size={12} style={{ marginRight: '4px' }}/> Link Item
                </button>
              </div>
              
              {supplier.items && supplier.items.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {supplier.items.map(item => (
                    <span key={item.id} className="badge" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border)' }}>
                      {item.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No items linked.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Add New Supplier</h3>
              <button className="btn" style={{ padding: '0.5rem', background: 'transparent', color: 'white' }} onClick={() => setShowSupplierModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateSupplier}>
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input required className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Info (Email/Phone)</label>
                <textarea required className="form-input" rows="3" value={formData.contact_info} onChange={e => setFormData({...formData, contact_info: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Save Supplier</button>
            </form>
          </div>
        </div>
      )}

      {/* Link Item Modal */}
      {showLinkModal && selectedSupplier && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Link Item to {selectedSupplier.name}</h3>
              <button className="btn" style={{ padding: '0.5rem', background: 'transparent', color: 'white' }} onClick={() => setShowLinkModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleLinkItem}>
              <div className="form-group">
                <label className="form-label">Select Item</label>
                <select 
                  className="form-select" 
                  value={selectedItemId} 
                  onChange={e => setSelectedItemId(e.target.value)}
                  required
                >
                  <option value="">-- Choose an item --</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Link Item</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
