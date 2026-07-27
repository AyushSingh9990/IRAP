import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import Certificate from '../src/models/Certificate.js';
import Course from '../src/models/Course.js';
import CourseCertificate from '../src/models/CourseCertificate.js';
import Membership from '../src/models/Membership.js';
import { getPublicCertificateVerification } from '../src/services/certificate.service.js';
import { getPublicCourseVerification } from '../src/services/courseCertificate.service.js';

async function checkRecords({ label, model, verifier, identifiers }) {
  const records = await model.find({}).sort({ createdAt: -1 }).limit(10).lean();

  console.log(`\n${label}: ${records.length} recent record(s) checked`);

  for (const record of records) {
    const tests = identifiers(record).filter(Boolean);
    const outcomes = [];

    for (const identifier of tests) {
      const verification = await verifier(identifier);
      outcomes.push(`${identifier}: ${verification ? 'FOUND' : 'NOT FOUND'}`);
    }

    console.log(outcomes.join(' | '));
  }
}

async function run() {
  const connected = await connectDatabase();

  if (!connected || mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB could not be reached. Check MONGODB_URI and Atlas network access.');
  }

  const [
    memberships,
    membershipCertificates,
    courses,
    approvedCourses,
    courseCertificates,
    membershipsWithoutCertificate,
    approvedCoursesWithoutCertificate,
  ] = await Promise.all([
    Membership.countDocuments(),
    Certificate.countDocuments(),
    Course.countDocuments(),
    Course.countDocuments({ status: 'approved' }),
    CourseCertificate.countDocuments(),
    Membership.countDocuments({ currentCertificate: null }),
    Course.countDocuments({ status: 'approved', currentCertificate: null }),
  ]);

  console.log('iRAP public verification diagnostics');
  console.log(`Database: ${mongoose.connection.name}`);
  console.log(`Membership records: ${memberships}`);
  console.log(`Membership certificate records: ${membershipCertificates}`);
  console.log(`Membership records without current certificate: ${membershipsWithoutCertificate}`);
  console.log(`Course records: ${courses}`);
  console.log(`Approved courses: ${approvedCourses}`);
  console.log(`Course certificate records: ${courseCertificates}`);
  console.log(`Approved courses without current certificate: ${approvedCoursesWithoutCertificate}`);

  await checkRecords({
    label: 'Membership certificate verification',
    model: Certificate,
    verifier: getPublicCertificateVerification,
    identifiers: (record) => [
      record.certificateNumber,
      record.registrationNumber,
      record.verificationCode,
    ],
  });

  await checkRecords({
    label: 'Course certificate verification',
    model: CourseCertificate,
    verifier: getPublicCourseVerification,
    identifiers: (record) => [
      record.certificateNumber,
      record.accreditationNumber,
      record.verificationCode,
    ],
  });

  console.log('\nDiagnostics completed. This script does not modify any database records.');
}

run()
  .catch((error) => {
    console.error(`DIAGNOSTIC ERROR: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
