import mongoose from 'mongoose';

const { connectDatabase } = await import('../src/config/database.js');
const { default: Article } = await import('../src/models/Article.js');
const { default: ArticleCategory } = await import('../src/models/ArticleCategory.js');
const { default: ArticleReview } = await import('../src/models/ArticleReview.js');
const { default: ArticleTag } = await import('../src/models/ArticleTag.js');

let connected = false;

try {
  await connectDatabase();
  connected = mongoose.connection.readyState === 1;

  if (!connected) throw new Error('MongoDB could not be reached.');

  for (const model of [Article, ArticleCategory, ArticleTag, ArticleReview]) {
    const removed = await model.syncIndexes();
    console.log(
      `${model.modelName} indexes synchronized; removed: ${
        removed.length ? removed.join(', ') : 'none'
      }`,
    );
  }

  const [
    total,
    drafts,
    awaitingModeration,
    approved,
    published,
    scheduled,
    archived,
    categories,
    tags,
    reviews,
  ] = await Promise.all([
    Article.countDocuments({ deletedAt: null }),
    Article.countDocuments({ status: 'draft', deletedAt: null }),
    Article.countDocuments({
      status: { $in: ['submitted', 'under_review'] },
      deletedAt: null,
    }),
    Article.countDocuments({ status: 'approved', deletedAt: null }),
    Article.countDocuments({
      status: 'published',
      publishedAt: { $lte: new Date() },
      deletedAt: null,
    }),
    Article.countDocuments({
      status: 'published',
      publishedAt: { $gt: new Date() },
      deletedAt: null,
    }),
    Article.countDocuments({ status: 'archived', deletedAt: null }),
    ArticleCategory.countDocuments({ status: 'active' }),
    ArticleTag.countDocuments({ status: 'active' }),
    ArticleReview.countDocuments(),
  ]);

  console.log(`Database: ${mongoose.connection.name}`);
  console.log(`Article records: ${total}`);
  console.log(`Drafts: ${drafts}`);
  console.log(`Awaiting moderation: ${awaitingModeration}`);
  console.log(`Approved and awaiting publication: ${approved}`);
  console.log(`Currently published: ${published}`);
  console.log(`Scheduled for publication: ${scheduled}`);
  console.log(`Archived: ${archived}`);
  console.log(`Active categories: ${categories}`);
  console.log(`Active tags: ${tags}`);
  console.log(`Moderation history entries: ${reviews}`);
  console.log('Article diagnostics completed successfully.');
} catch (error) {
  console.error(error?.message || error);
  process.exitCode = 1;
} finally {
  if (connected) {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}
