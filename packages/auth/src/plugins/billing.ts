import 'server-only';

import type { BillingNotificationSender } from '@repo/billing/server';
import { createBetterAuthBillingPlugin } from '@repo/billing/server';
import { sendPaymentFailedEmail, sendPurchaseReceiptEmail } from '@repo/email/server';

const sendBillingNotification: BillingNotificationSender = async (notification) => {
  if (notification.kind === 'purchase-receipt') {
    await sendPurchaseReceiptEmail(notification);
    return;
  }

  await sendPaymentFailedEmail(notification);
};

/** The sole Better Auth billing integration owned by the auth package. */
export const billingPlugin = createBetterAuthBillingPlugin({
  notificationSender: sendBillingNotification,
});
