const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const { protect, admin } = require('../middleware/auth');


// GET - Lấy tất cả sản phẩm
router.get('/', async (req, res) => {
    try {
        const products = await Product.find().populate('supplier', 'name');
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET - Lấy 1 sản phẩm theo ID
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('supplier', 'name');
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST - Tạo sản phẩm mới (Admin only)
router.post('/', protect, admin, async (req, res) => {
    try {
        const existing = await Product.findOne({ name: req.body.name });
        if (existing) return res.status(400).json({ message: 'Đã có sản phẩm này!' });

        let supplierId = req.body.supplier || null;

        // Nếu supplier là một chuỗi (tên nhà cung cấp) thay vì ID số
        if (typeof supplierId === 'string' && isNaN(supplierId)) {
            let supplier = await Supplier.findOne({ name: { $regex: new RegExp(`^${supplierId}$`, 'i') } });
            
            if (!supplier) {
                // Nếu không tìm thấy, tự động tạo mới nhà cung cấp này
                supplier = new Supplier({ name: supplierId });
                await supplier.save();
            }
            supplierId = supplier._id;
        }

        const product = new Product({
            name: req.body.name,
            price: req.body.price,
            description: req.body.description,
            category: req.body.category,
            stock: req.body.stock,
            image: req.body.image,
            supplier: supplierId,
            minStock: req.body.minStock || 5,
            warranty: req.body.warranty || 'Không bảo hành'
        });
    
        const newProduct = await product.save();
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT - Cập nhật sản phẩm (Admin only)
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const { name, supplier } = req.body;

        if (name) {
            const existing = await Product.findOne({ name, _id: { $ne: Number(req.params.id) } });
            if (existing) return res.status(400).json({ message: 'Đã có sản phẩm này!' });
        }

        let updateData = { ...req.body };

        // Xử lý supplier thông minh
        if (supplier) {
            let supplierId = supplier;
            
            // Nếu là đối tượng (từ populate), lấy _id
            if (typeof supplier === 'object' && supplier !== null && supplier._id) {
                supplierId = supplier._id;
            }
            
            // Nếu là chuỗi (tên nhà cung cấp), tìm hoặc tạo mới
            if (typeof supplierId === 'string' && isNaN(supplierId)) {
                let foundSupplier = await Supplier.findOne({ 
                    name: { $regex: new RegExp(`^${supplierId}$`, 'i') } 
                });
                
                if (!foundSupplier) {
                    foundSupplier = new Supplier({ name: supplierId });
                    await foundSupplier.save();
                }
                supplierId = foundSupplier._id;
            }
            
            updateData.supplier = supplierId;
        }

        // Loại bỏ _id và __v để tránh lỗi khi cập nhật vào MongoDB
        delete updateData._id;
        delete updateData.__v;

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );
        if (!updatedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(updatedProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE - Xóa sản phẩm + renumber (Admin only)
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const { renumberModel } = require('../utils/renumber');
        const Order = require('../models/Order');
        const Product = require('../models/Product');
        
        // Delete specific product
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        await Product.findByIdAndDelete(req.params.id);
        
        // Renumber remaining products + update Order refs
        await renumberModel(Product, [
            { model: 'Order', field: 'products.product' }
        ]);
        
        res.json({ 
            message: 'Product deleted and IDs renumbered successfully',
            deletedId: req.params.id 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;