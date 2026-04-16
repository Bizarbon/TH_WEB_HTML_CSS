const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token
            req.user = await Customer.findById(decoded.id).select('-password');
            
            if (!req.user) {
                return res.status(401).json({ message: 'Người dùng không tồn tại!' });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Không có quyền truy cập, token lỗi!' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Không có quyền truy cập, không có token!' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        res.status(403).json({ message: 'Quyền hạn bị từ chối, yêu cầu quyền Admin!' });
    }
};

module.exports = { protect, admin };
