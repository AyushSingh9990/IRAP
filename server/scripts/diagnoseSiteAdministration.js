import mongoose from 'mongoose';

const { connectDatabase } = await import('../src/config/database.js');
const { default: SiteSetting } = await import('../src/models/SiteSetting.js');
const { default: ContentPage } = await import('../src/models/ContentPage.js');
const { default: EmailTemplate } = await import('../src/models/EmailTemplate.js');
const { default: CertificateTemplate } = await import('../src/models/CertificateTemplate.js');
const { default: ContactSubmission } = await import('../src/models/ContactSubmission.js');
const { default: Complaint } = await import('../src/models/Complaint.js');
const { default: RoleDefinition } = await import('../src/models/RoleDefinition.js');
const { default: User } = await import('../src/models/User.js');

let connected = false;

try {
  await connectDatabase();
  connected = mongoose.connection.readyState === 1;
  if (!connected) throw new Error('MongoDB could not be reached.');

  const models = [
    SiteSetting,
    ContentPage,
    EmailTemplate,
    CertificateTemplate,
    ContactSubmission,
    Complaint,
    RoleDefinition,
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
    settings,
    publicSettings,
    contentPages,
    publishedPages,
    emailTemplates,
    certificateTemplates,
    openContacts,
    openComplaints,
    roleDefinitions,
    users,
  ] = await Promise.all([
    SiteSetting.countDocuments(),
    SiteSetting.countDocuments({ public: true }),
    ContentPage.countDocuments(),
    ContentPage.countDocuments({ status: 'published', publishedAt: { $lte: new Date() } }),
    EmailTemplate.countDocuments(),
    CertificateTemplate.countDocuments(),
    ContactSubmission.countDocuments({ status: { $in: ['new', 'open'] } }),
    Complaint.countDocuments({ status: { $in: ['new', 'open'] } }),
    RoleDefinition.countDocuments(),
    User.countDocuments({ deletedAt: null }),
  ]);

  console.log(`Database: ${mongoose.connection.name}`);
  console.log(`Site settings: ${settings}`);
  console.log(`Public site settings: ${publicSettings}`);
  console.log(`Content pages: ${contentPages}`);
  console.log(`Published content pages: ${publishedPages}`);
  console.log(`Email templates: ${emailTemplates}`);
  console.log(`Certificate templates: ${certificateTemplates}`);
  console.log(`Open contact enquiries: ${openContacts}`);
  console.log(`Open complaints: ${openComplaints}`);
  console.log(`Stored role overrides: ${roleDefinitions}`);
  console.log(`User accounts: ${users}`);
  console.log('Site-administration diagnostics completed successfully.');
} catch (error) {
  console.error(error?.message || error);
  process.exitCode = 1;
} finally {
  if (connected) {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}
