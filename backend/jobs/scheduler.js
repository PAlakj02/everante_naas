const cron = require('node-cron');
const { runRenewalReminderCheck } = require('./renewalReminders');

function startScheduler() {
  // Once daily at 09:00 server time.
  cron.schedule('0 9 * * *', () => {
    console.log('[renewal-cron] running daily renewal reminder check...');
    runRenewalReminderCheck().catch((err) => {
      console.error('[renewal-cron] unexpected error:', err.message);
    });
  });
  console.log('[renewal-cron] scheduled for 09:00 daily');
}

module.exports = { startScheduler };
