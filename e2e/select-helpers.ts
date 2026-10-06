import { expect, type Page } from '@playwright/test';

/** Exercise the visible Radix trigger/popup, never its hidden native form input. */
export async function chooseOption(page: Page, label: string, option: string) {
  // Radix hides the background accessibility tree while its modal popup is open.
  // Keep inspecting the same named trigger's DOM state during that interval.
  const trigger = page.getByRole('combobox', { name: label, exact: true, includeHidden: true });
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const choice = page.getByRole('option', { name: option, exact: true });
  await expect(choice).toBeVisible();
  await choice.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toHaveText(option);
}
