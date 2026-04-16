const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { protect, admin } = require('../middleware/auth');

// GET all orders (Admin only)
router.get('/', protect, admin, async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('customer')
            .populate('products.product');
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET order by ID (Protect)
router.get('/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('customer')
            .populate('products.product');
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST create order - Support POS for Admin
router.post('/', protect, async (req, res) => {
    try {
        // Nếu là Admin thì ưu tiên lấy customer từ body (POS), nếu không thì lấy từ Token
        const customerId = (req.user.isAdmin && req.body.customer) ? req.body.customer : req.user._id;
        
        // Tìm thông tin khách hàng thực tế để lấy tên/số điện thoại
        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const productsWithNames = [];
        for (let item of req.body.products) {
            const product = await Product.findById(item.product);
            if (!product) continue;

            // Kiểm tra tồn kho
            if (product.stock < item.quantity) {
                return res.status(400).json({ message: `Sản phẩm ${product.name} không đủ tồn kho!` });
            }

            // Trừ tồn kho
            product.stock -= item.quantity;
            await product.save();

            productsWithNames.push({
                product: item.product,
                productName: product.name,
                quantity: item.quantity,
                price: item.price || product.price
            });
        }

        const order = new Order({
            customer: customerId,
            customerName: customer.name,
            customerPhone: customer.phone,
            products: productsWithNames,
            totalAmount: req.body.totalAmount,
            paymentMethod: req.body.paymentMethod || 'ShipCOD',
            status: req.body.status || 'pending'
        });

        const newOrder = await order.save();
        res.status(201).json(newOrder);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT update order status (Admin only)
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const updated = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json(updated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE order + renumber (Admin only)
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const { renumberModel } = require('../utils/renumber');
        const Order = require('../models/Order');
        
        // Delete specific order
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        await Order.findByIdAndDelete(req.params.id);
        
        // Renumber remaining orders (no incoming refs)
        await renumberModel(Order, []);
        
        res.json({ 
            message: 'Order deleted and IDs renumbered successfully',
            deletedId: req.params.id 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;