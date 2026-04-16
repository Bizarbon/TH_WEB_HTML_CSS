const mongoose = require('mongoose');
const Counter = require('./Counter');
const bcrypt = require('bcryptjs');

const customerSchema = new mongoose.Schema({
    _id: { type: Number },
    name: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: false,
        unique: true,
        sparse: true
    },
    phone: {
        type: String,
        required: false
    },
    address: {
        type: String,
        required: false
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
}, { 
    timestamps: true
});

customerSchema.pre('save', async function(next) {
    if (this.isNew || this.isModified('password')) {
        if (this.password) {
            const salt = await bcrypt.genSalt(12);
            this.password = await bcrypt.hash(this.password, salt);
        }
    }
    
    if (this.isNew) {
        const counter = await Counter.findByIdAndUpdate(
            'customerId',
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this._id = counter.seq;
    }
});

module.exports = mongoose.model('Customer', customerSchema);