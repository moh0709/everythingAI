import { useState } from 'react';
import type { SetupStep } from './types';
import { INITIAL_SETUP_STEPS, updateStep } from './userUtils';

export function useSetupProgress() {
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>(INITIAL_SETUP_STEPS);

  function markStep(id: string, statusValue: SetupStep['status']) {
    setSetupSteps((current) => updateStep(current, id, statusValue));
  }

  return {
    setupSteps,
    markStep,
  };
}
