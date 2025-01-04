const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();

const GST_RATE = 0.18;

exports.processGSTInvoice = functions.firestore
  .document('bookings/{bookingId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Trigger only when status changes to 'finished'
    if (before.status === 'finished' || after.status !== 'finished') {
      return null;
    }

    const { name, totalBookingAmount, isInterstate } = after;

    // GST Calculation
    const gstAmount = totalBookingAmount * GST_RATE;
    const igst = isInterstate ? gstAmount : 0;
    const sgst = isInterstate ? 0 : gstAmount / 2;
    const cgst = isInterstate ? 0 : gstAmount / 2;

    // GST API Integration
    try {
      const response = await axios.post('https://api.gst-provider.com/file', {
        name,
        totalBookingAmount,
        igst,
        sgst,
        cgst,
      }, {
        headers: {
          'Authorization': `Bearer YOUR_API_KEY`,
        },
      });

      console.log('GST Filing Successful:', response.data);
      return null;
    } catch (error) {
      console.error('GST Filing Failed:', error);
      throw new Error('GST API Integration Failed');
    }
  });
