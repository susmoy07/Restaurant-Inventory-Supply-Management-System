import React, { useEffect, useState } from 'react';
import { inventoryApi, transactionApi } from '../api';
import { Plus, ArrowDownToLine, ArrowUpFromLine, X, Trash2 } from 'lucide-react';

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [txType, setTxType] = useState('IN');

  const [formData, setFormData] = useState({ name: '', unit: '', category: '', reorder_level: 0 });
  const [txData, setTxData] = useState({ quantity: '' });

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
        reorder_level: parseFloat(formData.reorder_level)
      });
      setShowItemModal(false);
      setFormData({ name: '', unit: '', category: '', reorder_level: 0 });
      fetchItems();
    } catch (err) {
      alert('Error creating item');
    }
  };

  const handleTransaction = async (e) => {
    e.preventDefault();
    try {
      await transactionApi.createTransaction({
        item_id: selectedItem.id,
        type: txType,
        quantity: parseFloat(txData.quantity),
        idempotency_key: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });
      setShowTxModal(false);
      setTxData({ quantity: '' });
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.error || 'Transaction failed');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await inventoryApi.deleteItem(id);
      fetchItems();
    } catch (err) {
      alert('Error deleting item');
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Inventory Management</h2>
        <button className="btn btn-primary" onClick={() => setShowItemModal(true)}>
          <Plus size={18} /> New Item
        </button>
      </div>

      <div className="glass-card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Reorder Level</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>
                    <span style={{ color: item.current_stock < item.reorder_level ? 'var(--danger)' : 'inherit', fontWeight: 'bold' }}>
                      {item.current_stock} {item.unit}
                    </span>
                  </td>
                  <td>{item.reorder_level} {item.unit}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => { setSelectedItem(item); setTxType('IN'); setShowTxModal(true); }}
                      >
                        <ArrowDownToLine size={14} /> Stock In
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => { setSelectedItem(item); setTxType('OUT'); setShowTxModal(true); }}
                      >
                        <ArrowUpFromLine size={14} /> Stock Out
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '0.4rem 0.5rem', fontSize: '0.8rem' }}
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item Modal */}
      {showItemModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Add New Item</h3>
              <button className="btn" style={{ padding: '0.5rem', background: 'transparent', color: 'white' }} onClick={() => setShowItemModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateItem}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input required className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input required className="form-input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Unit (e.g. kg, pcs)</label>
                  <input required className="form-input" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Reorder Level</label>
                  <input required type="number" step="0.01" className="form-input" value={formData.reorder_level} onChange={e => setFormData({...formData, reorder_level: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Save Item</button>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTxModal && selectedItem && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Stock {txType} - {selectedItem.name}</h3>
              <button className="btn" style={{ padding: '0.5rem', background: 'transparent', color: 'white' }} onClick={() => setShowTxModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleTransaction}>
              <div className="form-group">
                <label className="form-label">Quantity ({selectedItem.unit})</label>
                <input 
                  required 
                  type="number" 
                  step="0.01" 
                  min="0.01" 
                  className="form-input" 
                  value={txData.quantity} 
                  onChange={e => setTxData({ quantity: e.target.value })} 
                  autoFocus
                />
              </div>
              <button type="submit" className={`btn ${txType === 'IN' ? 'btn-primary' : 'btn-danger'}`} style={{ width: '100%' }}>
                Confirm Stock {txType}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
