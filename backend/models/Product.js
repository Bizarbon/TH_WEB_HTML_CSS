const mongoose = require('mongoose');
const Supplier = require('./Supplier');
const Counter = require('./Counter');

const productSchema = new mongoose.Schema({
    _id: { type: Number },
    name: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        required: true
    },
    stock: {
        type: Number,
        default: 0,
        min: 0
    },
    image: {
        type: String,
        default: 'https://via.placeholder.com/200'
    },
    supplier: {
        type: Number,
        ref: 'Supplier',
        default: null
    },
    minStock: {
        type: Number,
        default: 5,
        min: 0
    },
    warranty: {
        type: String,
        default: 'Không bảo hành'
    }
}, { 
    timestamps: true
});

productSchema.pre('save', async function() {
    if (this.isNew) {
        const counter = await Counter.findByIdAndUpdate(
            'productId',
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this._id = counter.seq;
    }
});

module.exports = mongoose.model('Product', productSchema);