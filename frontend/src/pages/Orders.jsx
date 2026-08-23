import React, { useEffect, useState, useContext } from 'react';
import { orderApi, supplierApi } from '../api';
import { AuthContext } from '../context/AuthContext';
import { Plus, X, Printer, FileText, CheckCircle2, AlertCircle, ShoppingCart } from 'lucide-react';

const Orders = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [orderItems, setOrderItems] = useState([{ item_id: '', quantity: 1 }]);
  
  const [printOrder, setPrintOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

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
      alert('Error creating order: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await orderApi.updateStatus(id, status);
      if (res.data.stockUpdated) {
        alert(`Order #${id} marked as Received! Warehouse inventory stock has been automatically updated.`);
      }
      fetchOrders();
    } catch (err) {
      alert('Error updating status: ' + (err.response?.data?.error || err.message));
    }
  };

  const activeSupplier = suppliers.find(s => s.id === parseInt(selectedSupplier));

  const filteredOrders = orders.filter(o => {
    if (statusFilter === 'ALL') return true;
    return o.status === statusFilter;
  });

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Procurement & Purchase Orders</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            Automated stock intake upon delivery receipt & vendor purchase orders
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowOrderModal(true)}>
          <Plus size={18} /> Create Purchase Order
        </button>
      </div>

      {/* Info notice for automated stock intake */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', background: 'rgba(79, 70, 229, 0.1)', borderColor: 'rgba(79, 70, 229, 0.3)', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle2 color="var(--primary)" size={20} />
          <span style={{ fontSize: '0.9rem', color: '#e0e7ff' }}>
            <strong>Smart Fulfillment Active:</strong> Marking an order status as <strong>"Received"</strong> automatically increments warehouse item stock and logs delivery intake transactions.
          </span>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {['ALL', 'Pending', 'Ordered', 'Received'].map(st => (
          <button 
            key={st}
            className={`pill-btn ${statusFilter === st ? 'active' : ''}`}
            onClick={() => setStatusFilter(st)}
          >
            {st === 'ALL' ? `All Orders (${orders.length})` : `${st} (${orders.filter(o => o.status === st).length})`}
          </button>
        ))}
      </div>

      <div className="glass-card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier Vendor</th>
                <th>Status</th>
                <th>Order Items & Qty</th>
                <th>Total Value</th>
                <th>Date Issued</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No purchase orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: '700' }}>PO-#{order.id.toString().padStart(4, '0')}</td>
                    <td style={{ fontWeight: '500' }}>{order.supplier_name}</td>
                    <td>
                      <span className={`badge ${
                        order.status === 'Received' ? 'badge-success' : 
                        order.status === 'Ordered' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        {order.items?.map(i => `${i.item_name} (x${i.quantity} ${i.unit || ''})`).join(', ')}
                      </div>
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--secondary)' }}>
                      ${(order.total_amount || 0).toFixed(2)}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {user?.role === 'Manager' ? (
                          <select 
                            className="form-select" 
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', width: '115px' }}
                            value={order.status}
                            onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Ordered">Ordered</option>
                            <option value="Received">Received</option>
                          </select>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Staff View</span>
                        )}

                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                          title="Print PO Invoice Slip"
                          onClick={() => setPrintOrder(order)}
                        >
                          <Printer size={14} /> Slip
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Order Modal */}
      {showOrderModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Create Supplier Purchase Order</h3>
              <button className="btn" style={{ padding: '0.5rem', background: 'transparent', color: 'white' }} onClick={() => setShowOrderModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateOrder}>
              <div className="form-group">
                <label className="form-label">Vendor Supplier *</label>
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
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label">Line Items to Order</label>
                    {orderItems.map((oi, index) => (
                      <div key={index} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.6rem', alignItems: 'center' }}>
                        <select 
                          className="form-select" 
                          style={{ flex: 3 }}
                          value={oi.item_id}
                          onChange={e => {
                            const newItems = [...orderItems];
                            newItems[index].item_id = e.target.value;
                            setOrderItems(newItems);
                          }}
                          required
                        >
                          <option value="">-- Select Item --</option>
                          {activeSupplier.items.map(i => (
                            <option key={i.id} value={i.id}>{i.name}</option>
                          ))}
                        </select>
                        <input 
                          type="number"
                          className="form-input" 
                          style={{ flex: 1.5 }}
                          placeholder="Qty"
                          value={oi.quantity}
                          min="0.1"
                          step="0.1"
                          onChange={e => {
                            const newItems = [...orderItems];
                            newItems[index].quantity = e.target.value;
                            setOrderItems(newItems);
                          }}
                          required
                        />
                        {index > 0 && (
                          <button type="button" className="btn btn-danger" style={{ padding: '0.4rem 0.6rem' }} onClick={() => setOrderItems(orderItems.filter((_, i) => i !== index))}>
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', marginTop: '0.25rem' }} onClick={() => setOrderItems([...orderItems, { item_id: '', quantity: 1 }])}>
                      + Add Item Row
                    </button>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    Submit Purchase Order
                  </button>
                </>
              ) : selectedSupplier && (
                <p style={{ color: 'var(--warning)', fontSize: '0.9rem' }}>
                  This supplier has no cataloged items. Please link items in the Suppliers tab first.
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Printable Purchase Order Slip Modal */}
      {printOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Official Purchase Order Invoice</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => window.print()}>
                  <Printer size={15} /> Print Slip
                </button>
                <button className="btn" style={{ padding: '0.4rem', background: 'transparent', color: 'white' }} onClick={() => setPrintOrder(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="po-print-sheet">
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.4rem' }}>RISMS Restaurant Group</h2>
                  <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>Inventory & Culinary Supply Management</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h3 style={{ margin: 0, color: '#4338ca' }}>PO #{printOrder.id.toString().padStart(4, '0')}</h3>
                  <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>Date: {new Date(printOrder.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div>
                  <strong style={{ color: '#0f172a' }}>Vendor / Supplier:</strong>
                  <div style={{ color: '#334155' }}>{printOrder.supplier_name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Status: {printOrder.status}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ color: '#0f172a' }}>Authorized By:</strong>
                  <div style={{ color: '#334155' }}>{printOrder.created_by_email || 'Kitchen Manager'}</div>
                </div>
              </div>

              <table style={{ width: '100%', marginBottom: '1.5rem', border: '1px solid #cbd5e1' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '8px 12px' }}>Item Description</th>
                    <th style={{ padding: '8px 12px' }}>Unit</th>
                    <th style={{ padding: '8px 12px' }}>Ordered Qty</th>
                    <th style={{ padding: '8px 12px' }}>Unit Price</th>
                    <th style={{ padding: '8px 12px' }}>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {printOrder.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '8px 12px', fontWeight: '500' }}>{item.item_name}</td>
                      <td style={{ padding: '8px 12px' }}>{item.unit || 'units'}</td>
                      <td style={{ padding: '8px 12px' }}>{item.quantity}</td>
                      <td style={{ padding: '8px 12px' }}>${(item.cost_price || 0).toFixed(2)}</td>
                      <td style={{ padding: '8px 12px', fontWeight: '600' }}>${(item.line_total || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
                <div style={{ width: '220px', borderTop: '2px solid #0f172a', paddingTop: '0.5rem', textAlign: 'right' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>
                    Total Amount: ${(printOrder.total_amount || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                <div>Receiving Agent Signature: ______________________</div>
                <div>Delivery Date: ______________________</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
