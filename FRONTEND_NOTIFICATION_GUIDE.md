# 🔔 Real-Time Notifications & Order Updates - Frontend Integration Guide

## Overview
Backend ne Socket.IO use karke real-time notification system implement kar diya hai. Ab:
- Order status change hone par user ko instant notification milegi (bina page refresh)
- Admin ko new order create hone par real-time alert milega

---

## 📦 Socket.IO Client Setup

### 1. Install Socket.IO Client
```bash
npm install socket.io-client
```

### 2. Create Socket Connection Helper

**File: `src/utils/socket.ts`**
```typescript
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6543';

// Notification Socket
export const notificationSocket: Socket = io(`${API_URL}/notifications`, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

export const connectNotificationSocket = (userId: number) => {
  if (!notificationSocket.connected) {
    notificationSocket.connect();
  }
  // Register user to receive notifications
  notificationSocket.emit('register_user', { userId });
};

export const disconnectNotificationSocket = () => {
  notificationSocket.disconnect();
};

// Admin Socket (for admin dashboard)
export const connectAdminSocket = () => {
  if (!notificationSocket.connected) {
    notificationSocket.connect();
  }
  notificationSocket.emit('register_admin');
};
```

---

## 👤 User Side Implementation

### 1. Connect Socket on Login
**File: `src/components/Layout.tsx` (ya main layout file)**
```typescript
import { useEffect } from 'react';
import { connectNotificationSocket, notificationSocket } from '@/utils/socket';

export default function Layout({ children, user }) {
  useEffect(() => {
    if (user?.id) {
      // Connect and register user
      connectNotificationSocket(user.id);

      // Listen for order status updates
      notificationSocket.on('order_status_updated', (data) => {
        console.log('Order Update:', data);
        // Show toast notification
        toast.success(data.message);
        
        // Update notification bell count
        fetchNotifications(); // Call your notification fetch function
      });

      return () => {
        notificationSocket.off('order_status_updated');
      };
    }
  }, [user?.id]);

  return <div>{children}</div>;
}
```

### 2. Notification Bell Component
**File: `src/components/NotificationBell.tsx`**
```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';
import { notificationSocket } from '@/utils/socket';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
    
    // Real-time update on new notification
    notificationSocket.on('order_status_updated', () => {
      fetchUnreadCount();
      if (open) fetchNotifications();
    });

    return () => {
      notificationSocket.off('order_status_updated');
    };
  }, [open]);

  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get('/api/v1/notifications/unread-count');
      setUnreadCount(res.data.count);
    } catch (err) {
      console.error('Failed to fetch unread count', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/v1/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await axios.patch(`/api/v1/notifications/${id}/read`);
      fetchUnreadCount();
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  return (
    <div className="relative">
      <button onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}>
        🔔
        {unreadCount > 0 && (
          <span className="badge">{unreadCount}</span>
        )}
      </button>
      
      {open && (
        <div className="dropdown">
          {notifications.map((notif) => (
            <div key={notif.id} onClick={() => markAsRead(notif.id)}>
              <h4>{notif.title}</h4>
              <p>{notif.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 3. Order Page - Real-Time Status Update (No Refresh Needed)
**File: `src/app/orders/page.tsx`**
```typescript
import { useState, useEffect } from 'react';
import { notificationSocket } from '@/utils/socket';
import axios from 'axios';

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchOrders();

    // Listen for real-time order updates
    notificationSocket.on('order_status_updated', (data) => {
      // Update specific order in the list
      setOrders((prev) =>
        prev.map((order) =>
          order.id === data.orderId
            ? { ...order, status: data.status }
            : order
        )
      );
    });

    return () => {
      notificationSocket.off('order_status_updated');
    };
  }, []);

  const fetchOrders = async () => {
    const res = await axios.get('/api/v1/order/my-orders');
    setOrders(res.data);
  };

  return (
    <div>
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}
```

---

## 🛡️ Admin Side Implementation

### 1. Connect Admin Socket
**File: `src/app/admin/layout.tsx`**
```typescript
import { useEffect } from 'react';
import { connectAdminSocket, notificationSocket } from '@/utils/socket';

export default function AdminLayout({ children }) {
  useEffect(() => {
    connectAdminSocket();

    // Listen for new orders
    notificationSocket.on('new_order', (data) => {
      console.log('New Order Received:', data);
      toast.info(`New order #${data.orderId} received!`);
      
      // Refresh order list or update state
      refreshOrderList();
    });

    return () => {
      notificationSocket.off('new_order');
    };
  }, []);

  return <div>{children}</div>;
}
```

### 2. Admin Order List - Real-Time Updates
**File: `src/app/admin/orders/page.tsx`**
```typescript
import { useState, useEffect } from 'react';
import { notificationSocket } from '@/utils/socket';
import axios from 'axios';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchOrders();

    // Real-time: Add new order to list
    notificationSocket.on('new_order', (data) => {
      // Optionally fetch fresh data or prepend
      fetchOrders();
    });

    return () => {
      notificationSocket.off('new_order');
    };
  }, []);

  const fetchOrders = async () => {
    const res = await axios.get('/api/v1/orders/admin/all');
    setOrders(res.data);
  };

  const updateStatus = async (orderId: number, status: string, reason?: string) => {
    await axios.patch(`/api/v1/orders/${orderId}/status`, {
      status,
      cancellationReason: reason,
    });
    fetchOrders(); // Or update state directly
  };

  return (
    <div>
      <h1>All Orders</h1>
      {orders.map((order) => (
        <div key={order.id}>
          <p>Order #{order.id} - Status: {order.status}</p>
          <button onClick={() => updateStatus(order.id, 'packed')}>
            Mark as Packed
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 🔥 Socket Events Summary

### User Events
| Event Name | When Triggered | Payload |
|------------|----------------|---------|
| `order_status_updated` | Order status changes | `{ orderId, status, title, message, cancellationReason }` |

### Admin Events
| Event Name | When Triggered | Payload |
|------------|----------------|---------|
| `new_order` | User creates order | `{ orderId, userId, totalAmount, createdAt }` |

---

## 📡 REST API Endpoints (Already Implemented)

### Notifications
- `GET /api/v1/notifications` - Get all notifications
- `GET /api/v1/notifications/unread-count` - Get unread count
- `PATCH /api/v1/notifications/:id/read` - Mark as read

### Orders
- `POST /api/v1/order` - Create order
- `GET /api/v1/order/my-orders` - User's orders
- `GET /api/v1/orders/admin/all` - All orders (Admin)
- `PATCH /api/v1/orders/:id/status` - Update status (Admin)

---

## ✅ Testing Checklist

1. **User Login** → Socket connects automatically
2. **User creates order** → Admin dashboard shows alert (real-time)
3. **Admin updates status** → User gets notification + order page updates (no refresh)
4. **Click notification bell** → Shows all notifications
5. **Click notification** → Marks as read + count decreases

---

## 🚀 Key Benefits
- ✅ No page refresh required
- ✅ Instant notifications
- ✅ Real-time order tracking
- ✅ Better UX for users and admins

**Backend Status:** ✅ Fully Ready
**Frontend Task:** Implement socket connections as per this guide
