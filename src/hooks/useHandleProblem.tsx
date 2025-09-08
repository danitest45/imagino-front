'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import type { Problem } from '../lib/errors';
import { mapProblemToUI } from '../lib/problem-ui';
import OutOfCreditsDialog from '../components/OutOfCreditsDialog';
import UpgradePlanDialog from '../components/UpgradePlanDialog';

export function useHandleProblem() {
  const router = useRouter();
  const [creditsData, setCreditsData] = useState<{ current?: number; needed?: number } | null>(null);
  const [upgradeData, setUpgradeData] = useState<{ feature?: string; requiredPlan?: string } | null>(null);

  const handleProblem = useCallback(
    (problem: Problem) => {
      const ui = mapProblemToUI(problem);
      switch (ui.kind) {
        case 'toast':
          if (typeof window !== 'undefined') {
            window.alert(ui.message);
          }
          break;
        case 'redirect':
          if (typeof window !== 'undefined') {
            window.alert(ui.message);
          }
          router.push(ui.to);
          break;
        case 'modal':
          if (problem.code === 'INSUFFICIENT_CREDITS') {
            setCreditsData({ current: problem.meta?.current, needed: problem.meta?.needed });
          } else if (problem.code === 'FORBIDDEN_FEATURE') {
            setUpgradeData({ feature: problem.meta?.feature, requiredPlan: problem.meta?.requiredPlan });
          } else if (typeof window !== 'undefined') {
            window.alert(ui.message);
          }
          break;
      }
    },
    [router],
  );

  const dialogs = (
    <>
      <OutOfCreditsDialog
        open={creditsData !== null}
        current={creditsData?.current}
        needed={creditsData?.needed}
        onClose={() => setCreditsData(null)}
        onUpgrade={() => {
          setCreditsData(null);
          router.push('/pricing');
        }}
      />
      <UpgradePlanDialog
        open={upgradeData !== null}
        feature={upgradeData?.feature}
        requiredPlan={upgradeData?.requiredPlan}
        onClose={() => setUpgradeData(null)}
        onUpgrade={() => {
          setUpgradeData(null);
          router.push('/pricing');
        }}
      />
    </>
  );

  return { handleProblem, dialogs };
}
