import mongoose from 'mongoose';
import Application from '../models/Application.js';
import Document from '../models/Document.js';
import Notification from '../models/Notification.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { APPLICATION_TYPE_LABELS, APPLICATION_TYPE_VALUES } from '../constants/applicationTypes.js';
import { PAYMENT_STATUSES } from '../constants/paymentConstants.js';
import { ApiError } from '../utils/ApiError.js';

const SUCCESSFUL_PAYMENT_STATUSES = [
  PAYMENT_STATUSES.CAPTURED,
  PAYMENT_STATUSES.PARTIALLY_REFUNDED,
  PAYMENT_STATUSES.REFUNDED,
];

function serializeId(value) {
  return value ? value.toString() : null;
}

function applicationSummary(application) {
  if (!application) return null;
  return {
    id: serializeId(application._id),
    type: application.type,
    typeLabel: APPLICATION_TYPE_LABELS[application.type],
    reference: application.reference,
    status: application.status,
    completionPercentage: application.completionPercentage,
    currentStep: application.currentStep,
    submittedAt: application.submittedAt,
    updatedAt: application.updatedAt,
  };
}

function paymentSummary(payment) {
  if (!payment) return null;
  return {
    id: serializeId(payment._id),
    reference: payment.reference,
    application: serializeId(payment.application),
    provider: payment.provider,
    status: payment.status,
    currency: payment.currency,
    totalMinor: payment.totalMinor,
    refundedMinor: payment.refundedMinor,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    planName: payment.planSnapshot?.name || '',
  };
}

function calculateAccountCompletion(user) {
  const checks = [
    Boolean(user.firstName),
    Boolean(user.lastName),
    Boolean(user.displayName),
    Boolean(user.emailVerifiedAt),
    Boolean(user.telephone),
    Boolean(user.preferredLanguage),
    Boolean(user.timeZone),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export async function getDashboardOverview(userId) {
  const ownerObjectId = new mongoose.Types.ObjectId(userId);
  const [
    user,
    applications,
    payments,
    paymentStats,
    documentCounts,
    unreadNotifications,
    latestNotifications,
  ] = await Promise.all([
      User.findById(userId),
      Application.find({ owner: userId, isCurrent: true }).sort({ updatedAt: -1 }).lean(),
      Payment.find({ owner: userId }).sort({ createdAt: -1 }).limit(10).lean(),
      Payment.aggregate([
        { $match: { owner: ownerObjectId } },
        {
          $group: {
            _id: '$currency',
            totalCount: { $sum: 1 },
            successfulCount: {
              $sum: {
                $cond: [
                  { $in: ['$status', SUCCESSFUL_PAYMENT_STATUSES] },
                  1,
                  0,
                ],
              },
            },
            paidTotalMinor: {
              $sum: {
                $cond: [
                  { $in: ['$status', SUCCESSFUL_PAYMENT_STATUSES] },
                  { $max: [0, { $subtract: ['$totalMinor', '$refundedMinor'] }] },
                  0,
                ],
              },
            },
          },
        },
      ]),
      Document.aggregate([
        { $match: { owner: ownerObjectId, deletedAt: null, isCurrent: true } },
        { $group: { _id: '$reviewStatus', count: { $sum: 1 } } },
      ]),
      Notification.countDocuments({ recipient: userId, archivedAt: null, readAt: null }),
      Notification.find({ recipient: userId, archivedAt: null })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

  if (!user) throw new ApiError(404, 'Account not found.');

  const applicationsByType = Object.fromEntries(
    APPLICATION_TYPE_VALUES.map((type) => [
      type,
      applicationSummary(applications.find((application) => application.type === type)),
    ]),
  );

  const roleJourneys = [
    ...new Set([...(user.requestedJourneys || []), ...(user.roles || [])]),
  ]
    .filter((role) => APPLICATION_TYPE_VALUES.includes(role))
    .map((type) => ({
      type,
      label: APPLICATION_TYPE_LABELS[type],
      approvedRole: (user.roles || []).includes(type),
      application: applicationsByType[type],
      profileCompletionPercentage:
        applicationsByType[type]?.completionPercentage || 0,
    }));

  const documents = documentCounts.reduce(
    (summary, item) => ({ ...summary, [item._id]: item.count }),
    { total: documentCounts.reduce((total, item) => total + item.count, 0) },
  );

  const paymentTotalsByCurrency = paymentStats
    .map((item) => ({
      currency: item._id,
      totalCount: item.totalCount,
      successfulCount: item.successfulCount,
      paidTotalMinor: item.paidTotalMinor,
    }))
    .sort((left, right) => left.currency.localeCompare(right.currency));
  const totalPaymentCount = paymentTotalsByCurrency.reduce(
    (total, item) => total + item.totalCount,
    0,
  );
  const successfulPaymentCount = paymentTotalsByCurrency.reduce(
    (total, item) => total + item.successfulCount,
    0,
  );

  return {
    account: {
      id: user.id,
      displayName: user.displayName || user.fullName,
      email: user.email,
      telephone: user.telephone || '',
      preferredLanguage: user.preferredLanguage || 'en',
      timeZone: user.timeZone || 'UTC',
      accountStatus: user.accountStatus,
      roles: user.roles,
      requestedJourneys: user.requestedJourneys,
      completionPercentage: calculateAccountCompletion(user),
    },
    roleJourneys,
    applications: applications.map(applicationSummary),
    documents,
    payments: {
      latest: payments.map(paymentSummary),
      totalCount: totalPaymentCount,
      successfulCount: successfulPaymentCount,
      totalsByCurrency: paymentTotalsByCurrency,
    },
    notifications: {
      unreadCount: unreadNotifications,
      latest: latestNotifications.map((notification) => ({
        id: serializeId(notification._id),
        type: notification.type,
        category: notification.category,
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
      })),
    },
  };
}

export async function updateAccountSettings({ userId, input }) {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        displayName: input.displayName,
        telephone: input.telephone,
        preferredLanguage: input.preferredLanguage,
        timeZone: input.timeZone,
      },
    },
    { new: true, runValidators: true },
  );
  if (!user) throw new ApiError(404, 'Account not found.');
  return {
    id: user.id,
    displayName: user.displayName || user.fullName,
    email: user.email,
    telephone: user.telephone || '',
    preferredLanguage: user.preferredLanguage || 'en',
    timeZone: user.timeZone || 'UTC',
  };
}
