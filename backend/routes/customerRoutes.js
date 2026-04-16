const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const { protect, admin } = require('../middleware/auth');


// GET all customers (Admin only)
router.get('/', protect, admin, async (req, res) => {
    try {
        const customers = await Customer.find();
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET customer by ID (Protect)
router.get('/:id', protect, async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        res.json(customer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST create customer
router.post('/', async (req, res) => {
    try {
        const { username, password, phone, name } = req.body;

        // Kiểm tra username đã tồn tại chưa
        if (username) {
            const existingUser = await Customer.findOne({ username });
            if (existingUser) return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại!' });
        }

        const customerData = { ...req.body };
        
        // Nếu thiếu username (trường hợp thêm nhanh qua POS), tự động tạo từ SĐT hoặc tên
        if (!customerData.username) {
            customerData.username = phone || `cust_${Date.now().toString().slice(-6)}`;
        }

        // Nếu thiếu password, đặt mật khẩu mặc định là 123456
        if (!customerData.password) {
            customerData.password = '123456';
        }

        const customer = new Customer(customerData);
        const newCustomer = await customer.save();
        res.status(201).json(newCustomer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT update customer (Protect or Admin)
router.put('/:id', protect, async (req, res) => {
    try {
    if (req.body.email) {
            const existing = await Customer.findOne({ email: req.body.email, _id: { $ne: req.params.id } });
            if (existing) return res.status(400).json({ message: 'Email đã tồn tại!' });
        }

        const updated = await Customer.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        res.json(updated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE customer + renumber (Admin only)
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const { renumberModel } = require('../utils/renumber');
        const Order = require('../models/Order');
        const Customer = require('../models/Customer');
        
        // Delete specific customer
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        await Customer.findByIdAndDelete(req.params.id);
        
        // Renumber remaining customers + update Order.customer refs
        await renumberModel(Customer, [
            { model: 'Order', field: 'customer' }
        ]);
        
        res.json({ 
            message: 'Customer deleted and IDs renumbered successfully',
            deletedId: req.params.id 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;