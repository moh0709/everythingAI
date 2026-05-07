import {
  completeJob,
  createJob,
  failJob,
  getJob,
  startJob,
} from './jobService.js';

export async function runJob({
  type,
  priority,
  input,
  initialProgress,
} = {}, callback) {
  const created = createJob({
    type,
    priority,
    input,
  });

  startJob(created.id, initialProgress);

  try {
    const output = await callback({
      jobId: created.id,
      getJob: () => getJob(created.id),
    });

    const completed = completeJob(created.id, output);

    return {
      job: completed,
      output,
    };
  } catch (error) {
    const failed = failJob(created.id, error);

    error.job = failed;

    throw error;
  }
}
