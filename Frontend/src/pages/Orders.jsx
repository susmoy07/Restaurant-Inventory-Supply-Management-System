import React, { useEffect, useState, useContext } from 'react';
import { orderApi, supplierApi } from '../api';
import { AuthContext } from '../context/AuthContext';
import { Plus, X, Edit2 } from 'lucide-react';

const Orders = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [orderItems, setOrderItems] = useState([{ item_id: '', quantity: 1 }]);

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await orderApi.getOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data } = await supplierApi.getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      await orderApi.createOrder({
        supplier_id: selectedSupplier,
        items: orderItems
      });
      setShowOrderModal(false);
      setSelectedSupplier('');
      setOrderItems([{ item_id: '', quantity: 1 }]);
      fetchOrders();
    } catch (err) {
      alert('Error creating order');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await orderApi.updateStatus(id, status);
      fetchOrders();
    } catch (err) {
      alert('Error updating status');
    }
  };

  const activeSupplier = suppliers.find(s => s.id === parseInt(selectedSupplier));

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Purchase Orders</h2>
        <button className="btn btn-primary" onClick={() => setShowOrderModal(true)}>
          <Plus size={18} /> New Order
        </button>
      </div>

      <div className="glass-card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Supplier</th>
                <th>Status</th>
                <th>Items</th>
                <th>Date</th>
                {user?.role === 'Manager' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{order.supplier_name}</td>
                  <td>
                    <span className={`badge ${
                      order.status === 'Received' ? 'badge-success' : 
                      order.status === 'Ordered' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td>
                    {order.items?.map(i => `${i.item_name} (x${i.quantity})`).join(', ')}
                  </td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  {user?.role === 'Manager' && (
                    <td>
                      <select 
                        className="form-select" 
                        style={{ padding: '0.25rem', width: '120px' }}
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Ordered">Ordered</option>
                        <option value="Received">Received</option>
                      </select>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Order Modal */}
      {showOrderModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Create Purchase Order</h3>
              <button className="btn" style={{ padding: '0.5rem', background: 'transparent', color: 'white' }} onClick={() => setShowOrderModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateOrder}>
              <div className="form-group">
                <label className="form-label">Supplier</label>
                <select 
                  className="form-select" 
                  value={selectedSupplier} 
                  onChange={e => { setSelectedSupplier(e.target.value); setOrderItems([{ item_id: '', quantity: 1 }]); }}
                  required
                >
                  <option value="">-- Choose a supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {activeSupplier && activeSupplier.items?.length > 0 ? (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Order Items</label>
                    {orderItems.map((oi, index) => (
                      <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                        <select 
                          className="form-select" 
                          style={{ flex: 2 }}
                          value={oi.item_id}
                          onChange={e => {
                            const newItems = [...orderItems];
                            newItems[index].item_id = e.target.value;
                            setOrderItems(newItems);
                          }}
                          required
                        >
                          <option value="">-- Item --</option>
                          {activeSupplier.items.map(i => (
                            <option key={i.id} value={i.id}>{i.name}</option>
                          ))}
                        </select>
                        <input 
                          type="number"
                          className="form-input"
                          style={{ flex: 1 }}
                          value={oi.quantity}
                          min="1"
                          onChange={e => {
                            const newItems = [...orderItems];
                            newItems[index].quantity = e.target.value;
                            setOrderItems(newItems);
                          }}
                          required
                        />
                        {index > 0 && (
                          <button type="button" className="btn btn-danger" onClick={() => setOrderItems(orderItems.filter((_, i) => i !== index))}>
                            X
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }} onClick={() => setOrderItems([...orderItems, { item_id: '', quantity: 1 }])}>
                      + Add Item
                    </button>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Order</button>
                </>
              ) : selectedSupplier && (
                <p style={{ color: 'var(--warning)' }}>This supplier has no linked items yet. Please link items in the Suppliers tab first.</p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
