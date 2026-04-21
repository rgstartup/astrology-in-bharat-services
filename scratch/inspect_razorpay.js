const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: 'dummy',
  key_secret: 'dummy'
});

console.log('Keys in razorpay instance:', Object.keys(razorpay));
console.log('razorpay.contacts:', razorpay.contacts);
console.log('razorpay.payouts:', razorpay.payouts);
console.log('razorpay.fundAccount:', razorpay.fundAccount);
