import mongoose from 'mongoose';

const { connectDatabase } = await import('../src/config/database.js');
const { default: Course } = await import('../src/models/Course.js');
const { default: CourseAccreditationPolicy } = await import(
  '../src/models/CourseAccreditationPolicy.js'
);
const { default: CourseCertificate } = await import(
  '../src/models/CourseCertificate.js'
);
const { default: CourseDocument } = await import(
  '../src/models/CourseDocument.js'
);
const { default: CourseReview } = await import(
  '../src/models/CourseReview.js'
);
const { default: PublicProfile } = await import(
  '../src/models/PublicProfile.js'
);

let connected = false;

try {
  await connectDatabase();
  connected = mongoose.connection.readyState === 1;

  if (!connected) {
    throw new Error('MongoDB could not be reached.');
  }

  const models = [
    Course,
    CourseReview,
    CourseDocument,
    CourseCertificate,
    CourseAccreditationPolicy,
  ];

  for (const model of models) {
    const removed = await model.syncIndexes();
    console.log(
      `${model.modelName} indexes synchronized; removed: ${
        removed.length ? removed.join(', ') : 'none'
      }`,
    );
  }

  const [
    courses,
    submitted,
    approved,
    reviews,
    documents,
    certificates,
    publicCourses,
    policy,
  ] = await Promise.all([
    Course.countDocuments(),
    Course.countDocuments({
      status: { $in: ['submitted', 'resubmitted', 'under_review'] },
    }),
    Course.countDocuments({ status: 'approved' }),
    CourseReview.countDocuments(),
    CourseDocument.countDocuments({
      deletedAt: null,
      isCurrent: true,
    }),
    CourseCertificate.countDocuments(),
    PublicProfile.countDocuments({
      profileType: 'course',
      published: true,
    }),
    CourseAccreditationPolicy.exists({ key: 'default' }),
  ]);

  console.log(`Database: ${mongoose.connection.name}`);
  console.log(`Provider courses: ${courses}`);
  console.log(`Courses awaiting review: ${submitted}`);
  console.log(`Approved courses: ${approved}`);
  console.log(`Course review cases: ${reviews}`);
  console.log(`Current course documents: ${documents}`);
  console.log(`Course certificates: ${certificates}`);
  console.log(`Published course-directory records: ${publicCourses}`);
  console.log(`Course accreditation policy configured: ${Boolean(policy)}`);
  console.log('Provider-course diagnostics completed successfully.');
} catch (error) {
  console.error(error?.message || error);
  process.exitCode = 1;
} finally {
  if (connected) {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}
