const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const { protect, admin } = require('../middleware/auth');

router.use(protect);
router.use(admin);


// GET all suppliers
router.get('/', async (req, res) => {
    try {
        const suppliers = await Supplier.find().sort({ createdAt: -1 });
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET supplier by ID
router.get('/:id', async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
        res.json(supplier);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST create supplier
router.post('/', async (req, res) => {
    try {
        const existing = await Supplier.findOne({ name: req.body.name });
        if (existing) return res.status(400).json({ message: 'Đã có nhà cung cấp này!' });

        const supplier = new Supplier({
            name: req.body.name,
        phone: req.body.phone,
        email: req.body.email,
        address: req.body.address,
        deliveryTime: req.body.deliveryTime,
        returnPolicy: req.body.returnPolicy,
        notes: req.body.notes
    });

        const newSupplier = await supplier.save();
        res.status(201).json(newSupplier);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT update supplier
router.put('/:id', async (req, res) => {
    try {
        if (req.body.name) {
            const existing = await Supplier.findOne({ name: req.body.name, _id: { $ne: req.params.id } });
            if (existing) return res.status(400).json({ message: 'Đã có nhà cung cấp này!' });
        }
        const updated = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ message: 'Supplier not found' });
        res.json(updated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE supplier + renumber
router.delete('/:id', async (req, res) => {
    try {
        const { renumberModel } = require('../utils/renumber');
        const Supplier = require('../models/Supplier');
        
        // Delete specific supplier
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }
        await Supplier.findByIdAndDelete(req.params.id);
        
        // Renumber remaining suppliers + update Product.supplier refs
        await renumberModel(Supplier, [
            { model: 'Product', field: 'supplier' }
        ]);
        
        res.json({ 
            message: 'Supplier deleted and IDs renumbered successfully',
            deletedId: req.params.id 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
