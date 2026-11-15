import { test, expect } from '@playwright/test';
test('customer can browse the product catalog',async({page})=>{await page.goto('/');await page.getByRole('link',{name:/explore the collection/i}).click();await expect(page.getByRole('heading',{name:/shop everyday essentials/i})).toBeVisible();await expect(page.locator('article').first()).toBeVisible()});
