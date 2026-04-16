const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Customer = require('../models/Customer');

// POST register
router.post('/register', [
    body('name').notEmpty().withMessage('Tên bắt buộc'),
    body('username').notEmpty().withMessage('Tên đăng nhập bắt buộc').trim(),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
    body('phone').optional({ checkFalsy: true }),
    body('address').optional({ checkFalsy: true }),
    body('password').isLength({ min: 6 }).withMessage('Mật khẩu ít nhất 6 ký tự')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }

        const { name, username, email, phone, address, password } = req.body;

        const existingUser = await Customer.findOne({ username });
        if (existingUser) return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại!' });

        if (email) {
            const existingEmail = await Customer.findOne({ email });
            if (existingEmail) return res.status(400).json({ message: 'Email đã tồn tại!' });
        }

        if (phone) {
            const existingPhone = await Customer.findOne({ phone });
            if (existingPhone) return res.status(400).json({ message: 'Số điện thoại đã tồn tại!' });
        }

        const customer = new Customer({ name, username, email, phone, address, password });
        await customer.save();

        const token = jwt.sign(
            { id: customer._id, isAdmin: customer.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            message: 'Đăng ký thành công!',
            token,
            user: { id: customer._id, name: customer.name, username, isAdmin: customer.isAdmin }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST login
router.post('/login', [
    body('identifier').notEmpty().withMessage('Tên đăng nhập, Email hoặc SĐT là bắt buộc'),
    body('password').notEmpty().withMessage('Mật khẩu là bắt buộc')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }

        const { identifier, password } = req.body;
        console.log(`DEBUG Login: identifier=${identifier}, password=${password}`);

        // Tìm khách hàng theo username, email HOẶC số điện thoại
        const customer = await Customer.findOne({
            $or: [
                { username: identifier },
                { email: identifier ? identifier.toLowerCase() : '' },
                { phone: identifier }
            ]
        }).select('+password');

        if (!customer) {
            console.log('DEBUG Login: Không tìm thấy người dùng!');
            const allUsers = await Customer.find({}, 'username');
            console.log('DEBUG Login: Danh sách Username hiện có trong DB:', allUsers.map(u => u.username));
        } else {
            const isMatch = await bcrypt.compare(password, customer.password);
            console.log(`DEBUG Login: Tìm thấy người dùng, so khớp mật khẩu=${isMatch}`);
        }

        if (!customer || !(await bcrypt.compare(password, customer.password))) {
            return res.status(401).json({ message: 'Thông tin đăng nhập không chính xác!' });
        }

        const token = jwt.sign(
            { id: customer._id, isAdmin: customer.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            message: 'Đăng nhập thành công!',
            token,
            user: { id: customer._id, name: customer.name, username: customer.username, isAdmin: customer.isAdmin }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});



module.exports = router;

