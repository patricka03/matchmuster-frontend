import { Capacitor } from '@capacitor/core'
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases'

export const GOOGLE_PLAY_PRODUCT_ID = 'matchmuster_plus'
export const GOOGLE_PLAY_BASE_PLANS = { monthly: 'monthly', annual: 'annual' }

export function isGooglePlaySubscriptionPlatform() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

function requireAndroid() {
  if (!isGooglePlaySubscriptionPlatform()) throw new Error('Google Play subscriptions are only available in the Android app.')
}

async function requireBilling() {
  requireAndroid()
  const { isBillingSupported } = await NativePurchases.isBillingSupported()
  if (!isBillingSupported) throw new Error('Google Play billing is unavailable on this device.')
}

export async function loadGooglePlaySubscriptionProducts() {
  await requireBilling()
  const { products } = await NativePurchases.getProducts({
    productIdentifiers: [GOOGLE_PLAY_PRODUCT_ID],
    productType: PURCHASE_TYPE.SUBS,
  })
  return Array.isArray(products) ? products : []
}

function tokenFrom(purchase) {
  const token = purchase?.purchaseToken || purchase?.purchase_token || purchase?.transactionToken || purchase?.token
  if (!token) throw new Error('Google Play completed the purchase but did not return a purchase token.')
  return token
}

export async function purchaseGooglePlaySubscription({ basePlanId, appAccountToken }) {
  await requireBilling()
  const purchase = await NativePurchases.purchaseProduct({
    productIdentifier: GOOGLE_PLAY_PRODUCT_ID,
    productType: PURCHASE_TYPE.SUBS,
    appAccountToken,
    basePlanId,
  })
  return { purchase, purchaseToken: tokenFrom(purchase) }
}

export async function restoreGooglePlaySubscription(appAccountToken) {
  await requireBilling()
  await NativePurchases.restorePurchases()
  const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.SUBS, appAccountToken, onlyCurrentEntitlements: true })
  const purchase = (Array.isArray(purchases) ? purchases : []).find((item) => item?.productIdentifier === GOOGLE_PLAY_PRODUCT_ID || item?.identifier === GOOGLE_PLAY_PRODUCT_ID)
  if (!purchase) throw new Error('No active MatchMuster Plus purchase was found for this Google account.')
  return { purchase, purchaseToken: tokenFrom(purchase) }
}
