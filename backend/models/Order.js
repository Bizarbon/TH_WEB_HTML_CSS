const mongoose = require('mongoose');
const Counter = require('./Counter');

const orderSchema = new mongoose.Schema({
    _id: { type: Number },
    customer: {
        type: Number,
        ref: 'Customer',
        required: true
    },
    customerName: {
        type: String,
        default: ''
    },
    customerPhone: {
        type: String,
        default: ''
    },
    products: [{
        product: {
            type: Number,
            ref: 'Product'
        },
        productName: {
            type: String,
            default: ''
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: Number
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipping', 'completed', 'cancelled', 'returned', 'boom'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['Thanh toán trước', 'ShipCOD', 'Trả góp'],
        default: 'ShipCOD'
    },
    trackingNumber: {
        type: String,
        default: ''
    },
    shippingUnit: {
        type: String,
        default: ''
    },
    shippingFee: {
        type: Number,
        default: 0
    },
    note: {
        type: String,
        default: ''
    },
    orderDate: {
        type: Date,
        default: Date.now
    }
}, { 
    timestamps: true
});

orderSchema.pre('save', async function() {
    if (this.isNew) {
        const counter = await Counter.findByIdAndUpdate(
            'orderId',
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this._id = counter.seq;
    }
});

module.exports = mongoose.model('Order', orderSchema);