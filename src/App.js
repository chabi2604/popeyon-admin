import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

// --- ¡IMPORTANTE! ---
// Pega aquí la MISMA configuración de Firebase que usaste para tu tienda.
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "popeyon-tienda.firebaseapp.com",
    projectId: "popeyon-tienda",
    storageBucket: "popeyon-tienda.appspot.com",
    messagingSenderId: "TUS_DATOS",
    appId: "TUS_DATOS"
};

// --- ¡IMPORTANTE! ---
// Pega aquí el MISMO ID raro de la carpeta 'artifacts' de tu tienda.
const ARTIFACTS_DOCUMENT_ID = 'WkVsarS3pp4gQzoT9ZE1'; // <--- ¡¡¡REEMPLAZA ESTO!!!

function App() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [view, setView] = useState('orders'); // Empezar en la vista de pedidos
  const [db, setDb] = useState(null);

  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      setDb(firestoreDb);
    } catch (e) { console.error("Error al inicializar Firebase. Revisa tu configuración.", e); }
  }, []);

  useEffect(() => {
    if (db) {
      const productsPath = `artifacts/${ARTIFACTS_DOCUMENT_ID}/users/ADMIN_USER_ID/products`;
      const unsubscribe = onSnapshot(collection(db, productsPath), (snapshot) => {
        setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [db]);

  useEffect(() => {
    if (db) {
      const ordersPath = `artifacts/${ARTIFACTS_DOCUMENT_ID}/users/ADMIN_USER_ID/orders`;
      const unsubscribe = onSnapshot(collection(db, ordersPath), (snapshot) => {
        const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        ordersData.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
        setOrders(ordersData);
      });
      return () => unsubscribe();
    }
  }, [db]);

  const pendingOrdersCount = orders.filter(o => o.status === 'pendiente').length;

  return (
    <div className="bg-gray-800 min-h-screen font-sans text-white">
      <Header />
      <div className="container mx-auto p-4 md:p-6">
        <Nav setView={setView} activeView={view} productCount={products.length} orderCount={pendingOrdersCount} />
        <main className="mt-6 bg-gray-900 rounded-lg shadow-xl p-4 md:p-6">
          {view === 'products' && <ProductManager products={products} db={db} />}
          {view === 'orders' && <OrderManager orders={orders} db={db} />}
        </main>
      </div>
    </div>
  );
}

const Header = () => (
    <header className="bg-gray-900 p-4 shadow-md">
        <div className="container mx-auto">
            <h1 className="text-2xl font-bold text-amber-400">Panel de Admin - Popeyón</h1>
        </div>
    </header>
);

const Nav = ({ setView, activeView, productCount, orderCount }) => (
    <nav className="flex space-x-4">
        <button onClick={() => setView('products')} className={`py-2 px-4 rounded-md font-semibold transition ${activeView === 'products' ? 'bg-amber-500 text-gray-900' : 'bg-gray-700 hover:bg-gray-600'}`}>
            Gestionar Productos ({productCount})
        </button>
        <button onClick={() => setView('orders')} className={`relative py-2 px-4 rounded-md font-semibold transition ${activeView === 'orders' ? 'bg-amber-500 text-gray-900' : 'bg-gray-700 hover:bg-gray-600'}`}>
            Ver Pedidos
            {orderCount > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{orderCount}</span>}
        </button>
    </nav>
);

const ProductManager = ({ products, db }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const handleEdit = (product) => {
        setEditingProduct(product);
        setShowModal(true);
    };

    const handleAdd = () => {
        setEditingProduct(null);
        setShowModal(true);
    };

    const handleDelete = async (productId) => {
        if (window.confirm("¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.")) {
            const productPath = `artifacts/${ARTIFACTS_DOCUMENT_ID}/users/ADMIN_USER_ID/products/${productId}`;
            await deleteDoc(doc(db, productPath));
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Inventario de Productos</h2>
                <button onClick={handleAdd} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
                    + Agregar Producto
                </button>
            </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-700">
                            <th className="p-2">Nombre</th>
                            <th className="p-2">Precio</th>
                            <th className="p-2">Stock</th>
                            <th className="p-2">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p.id} className="border-b border-gray-700 hover:bg-gray-800">
                                <td className="p-2 font-semibold">{p.name}</td>
                                <td className="p-2">${p.price}</td>
                                <td className="p-2">{p.stock}</td>
                                <td className="p-2">
                                    <button onClick={() => handleEdit(p)} className="bg-blue-500 text-white text-sm py-1 px-2 rounded mr-2 hover:bg-blue-600">Editar</button>
                                    <button onClick={() => handleDelete(p.id)} className="bg-red-500 text-white text-sm py-1 px-2 rounded hover:bg-red-600">Eliminar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {showModal && <ProductModal product={editingProduct} setShowModal={setShowModal} db={db} />}
        </div>
    );
};
const ProductModal = ({ product, setShowModal, db }) => {
    const [formData, setFormData] = useState({
        name: product?.name || '',
        price: product?.price || '',
        stock: product?.stock || '',
        category: product?.category || '',
    });

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const collectionPath = `artifacts/${ARTIFACTS_DOCUMENT_ID}/users/ADMIN_USER_ID/products`;
        const data = {
            name: formData.name,
            price: Number(formData.price),
            stock: Number(formData.stock),
            category: formData.category,
        };

        if (product) {
            await updateDoc(doc(db, collectionPath, product.id), data);
        } else {
            await addDoc(collection(db, collectionPath), data);
        }
        setShowModal(false);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">{product ? 'Editar Producto' : 'Agregar Nuevo Producto'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Nombre del Producto" className="w-full p-2 bg-gray-700 rounded" required />
                    <input type="text" name="category" value={formData.category} onChange={handleChange} placeholder="Categoría" className="w-full p-2 bg-gray-700 rounded" required />
                    <div className="flex space-x-4">
                        <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="Precio" className="w-1-2 p-2 bg-gray-700 rounded" required />
                        <input type="number" name="stock" value={formData.stock} onChange={handleChange} placeholder="Stock" className="w-1-2 p-2 bg-gray-700 rounded" required />
                    </div>
                    <div className="flex justify-end space-x-4">
                        <button type="button" onClick={() => setShowModal(false)} className="bg-gray-600 hover:bg-gray-500 py-2 px-4 rounded">Cancelar</button>
                        <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold py-2 px-4 rounded">{product ? 'Guardar Cambios' : 'Agregar'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const OrderManager = ({ orders, db }) => {
    const updateOrderStatus = async (orderId, newStatus) => {
        const orderPath = `artifacts/${ARTIFACTS_DOCUMENT_ID}/users/ADMIN_USER_ID/orders/${orderId}`;
        await updateDoc(doc(db, orderPath), { status: newStatus });
    };

    const getFullAddress = (customer) => {
        if (!customer) return 'Dirección no proporcionada';
        return `${customer.address || ''}, ${customer.city || ''}, ${customer.zipCode || ''}`;
    };

    return (
        <div>
            <h2 className="text-xl font-bold mb-4">Pedidos de Clientes</h2>
            <div className="space-y-4">
                {orders.length === 0 && <p className="text-gray-400">Aún no hay pedidos.</p>}
                {orders.map(order => (
                    <div key={order.id} className={`p-4 rounded-lg ${order.status === 'pendiente' ? 'bg-gray-700' : (order.status === 'enviado' ? 'bg-blue-900/50' : 'bg-green-900/50')}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-lg">{order.customer?.name || 'Cliente anónimo'}</p>
                                <p className="text-sm text-gray-300">📞 {order.customer?.phone || 'N/A'}</p>
                                <p className="text-xs text-gray-400">Fecha: {order.createdAt?.toDate().toLocaleString() || 'N/A'}</p>
                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getFullAddress(order.customer))}`} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:underline block mt-1">
                                    📍 {getFullAddress(order.customer)}
                                </a>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                                <p className="font-bold text-xl text-amber-400">${order.total.toFixed(2)}</p>
                                <span className={`text-sm font-semibold px-2 py-0.5 rounded-full capitalize ${order.status === 'pendiente' ? 'bg-yellow-500 text-black' : (order.status === 'enviado' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white')}`}>
                                    {order.status}
                                </span>
                            </div>
                        </div>
                        <div className="mt-2 border-t border-gray-600 pt-2">
                            <p className="font-semibold">Productos:</p>
                            <ul className="list-disc list-inside text-sm text-gray-300">
                                {order.items.map((item, index) => <li key={index}>{item.quantity}x {item.name}</li>)}
                            </ul>
                        </div>
                        <div className="mt-3 flex space-x-2">
                             {order.status === 'pendiente' && (
                                <button onClick={() => updateOrderStatus(order.id, 'enviado')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm">
                                    Marcar como Enviado
                                </button>
                             )}
                              {order.status === 'enviado' && (
                                <button onClick={() => updateOrderStatus(order.id, 'completado')} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm">
                                    Marcar como Completado
                                </button>
                             )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default App;

