import { pruneLocalRecordingFiles } from '../src/services/s3.js';

const daysArg = process.argv[2];
const olderThanDays = daysArg === undefined ? 0 : Number(daysArg);

async function main(): Promise<void> {
  if (!Number.isFinite(olderThanDays) || olderThanDays < 0) {
    console.error('Usage: npm run prune-recordings -- [olderThanDays]');
    process.exit(1);
  }

  const result = await pruneLocalRecordingFiles({ olderThanDays });
  console.log(
    `[prune-recordings] olderThanDays=${olderThanDays} files=${result.deletedFiles} dirs=${result.deletedDirs}`,
  );
}

main().catch((err) => {
  console.error('[prune-recordings] failed', err);
  process.exit(1);
});
