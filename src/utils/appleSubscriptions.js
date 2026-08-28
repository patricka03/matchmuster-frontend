import {
  Capacitor,
} from '@capacitor/core'

import {
  NativePurchases,
  PURCHASE_TYPE,
} from '@capgo/native-purchases'

export function isAppleSubscriptionPlatform() {
  return (
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === 'ios'
  )
}

function requireApplePlatform() {
  if (!isAppleSubscriptionPlatform()) {
    throw new Error(
      'Apple subscriptions are only available in the iPhone app.',
    )
  }
}

async function requireBillingSupport() {
  requireApplePlatform()

  const {
    isBillingSupported,
  } =
    await NativePurchases
      .isBillingSupported()

  if (!isBillingSupported) {
    throw new Error(
      'App Store billing is unavailable on this device.',
    )
  }
}

export async function loadAppleSubscriptionProducts(
  productIdentifiers,
) {
  await requireBillingSupport()

  const {
    products,
  } =
    await NativePurchases
      .getProducts({
        productIdentifiers,
        productType:
          PURCHASE_TYPE.SUBS,
      })

  return Array.isArray(products)
    ? products
    : []
}

function requireSignedTransaction(
  transaction,
) {
  const signedTransaction =
    transaction?.jwsRepresentation

  if (!signedTransaction) {
    throw new Error(
      'Apple completed the purchase but did not return signed StoreKit data. Use Restore Purchases and try again.',
    )
  }

  return {
    transaction,
    signedTransaction,
  }
}

export async function purchaseAppleSubscription({
  productIdentifier,
  appAccountToken,
}) {
  await requireBillingSupport()

  const transaction =
    await NativePurchases
      .purchaseProduct({
        productIdentifier,
        productType:
          PURCHASE_TYPE.SUBS,
        appAccountToken,
      })

  return requireSignedTransaction(
    transaction,
  )
}

export async function restoreAppleSubscription(
  acceptedProductIdentifiers,
  appAccountToken,
) {
  await requireBillingSupport()

  await NativePurchases
    .restorePurchases()

  const {
    purchases,
  } =
    await NativePurchases
      .getPurchases({
        productType:
          PURCHASE_TYPE.SUBS,
        appAccountToken,
        onlyCurrentEntitlements:
          true,
      })

  const accepted =
    new Set(
      acceptedProductIdentifiers,
    )

  const candidates =
    (Array.isArray(purchases)
      ? purchases
      : []
    )
      .filter(
        (purchase) =>
          accepted.has(
            purchase
              ?.productIdentifier,
          ) &&
          purchase
            ?.jwsRepresentation &&
          purchase?.isActive !==
            false,
      )
      .sort(
        (
          firstPurchase,
          secondPurchase,
        ) => {
          const firstDate =
            new Date(
              firstPurchase
                ?.expirationDate ||
                firstPurchase
                  ?.purchaseDate ||
                0,
            ).getTime()

          const secondDate =
            new Date(
              secondPurchase
                ?.expirationDate ||
                secondPurchase
                  ?.purchaseDate ||
                0,
            ).getTime()

          return (
            secondDate -
            firstDate
          )
        },
      )

  if (candidates.length === 0) {
    throw new Error(
      'No active MatchMuster Plus purchase was found for this Apple ID.',
    )
  }

  return requireSignedTransaction(
    candidates[0],
  )
}

export async function manageAppleSubscriptions() {
  await requireBillingSupport()

  await NativePurchases
    .manageSubscriptions()
}

export function isApplePurchaseCancelled(
  error,
) {
  const message =
    [
      error?.message,
      error?.errorMessage,
      error?.code,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

  return (
    message.includes('cancel') ||
    message.includes('usercancel')
  )
}
