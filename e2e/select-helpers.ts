import { expect, type Page } from '@playwright/test';

/** Exercise the visible Radix trigger/popup, never its hidden native form input. */
export async function chooseOption(page: Page, label: string, option: string) {
  const trigger = page.getByRole('combobox', { name: label, exact: true });
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const choice = page.getByRole('option', { name: option, exact: true });
  await expect(choice).toBeVisible();
  await choice.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toHaveText(option);
}
