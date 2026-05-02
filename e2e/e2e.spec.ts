import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a dummy image file for upload testing
const createDummyImage = () => {
  const dummyImageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  const imagePath = path.join(__dirname, 'test_avatar.png');
  fs.writeFileSync(imagePath, dummyImageBuffer);
  return imagePath;
};

test.describe('Event Announcement Generator E2E', () => {
  let imagePath: string;

  test.beforeAll(() => {
    imagePath = createDummyImage();
  });

  test.afterAll(() => {
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  });

  test('should complete the full flow of generating an event announcement', async ({ page }) => {
    // 1. Navigate to the app
    await page.goto('/');
    
    // Check page title to ensure app is loaded
    await expect(page.getByRole('heading', { name: 'Генератор Анонсов Митапов' })).toBeVisible();

    // 2. Fill basic event info
    await page.getByPlaceholder('Например: 15 сентября').fill('15 Сентября');
    await page.getByPlaceholder('VK, Яндекс').fill('VK Cloud и Яндекс');
    await page.getByPlaceholder('Moscow QA Meetup').fill('Quality Assurance Autumn Meetup');
    await page.getByPlaceholder('Москва, ул. Льва Толстого, 16').fill('Москва, Лесная 15');

    // 3. Setup Timing
    // The first timing row is there by default
    const timingRow1 = page.locator('.flex.gap-2.items-start').nth(0);
    await timingRow1.getByPlaceholder('19:00').fill('18:30');
    await timingRow1.getByPlaceholder('19:30').fill('19:00');
    await timingRow1.getByPlaceholder('Сбор гостей').fill('Регистрация и кофе');

    // Add a second timing row
    await page.getByRole('button', { name: 'Добавить пункт' }).click();
    const timingRow2 = page.locator('.flex.gap-2.items-start').nth(1);
    await timingRow2.getByPlaceholder('19:00').fill('19:00');
    await timingRow2.getByPlaceholder('19:30').fill('19:40');
    await timingRow2.getByPlaceholder('Сбор гостей').fill('Открытие митапа');

    // 4. Add a Speaker
    await page.getByRole('button', { name: 'Добавить спикера' }).click();
    
    // Upload photo for speaker
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('label').filter({ hasText: 'Загрузить фото' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(imagePath);

    // Wait for the crop modal to appear and click Save
    const cropModal = page.locator('.fixed.inset-0.z-50');
    await expect(cropModal).toBeVisible();
    await cropModal.getByRole('button', { name: 'Сохранить' }).click();
    
    // Wait for the crop modal to disappear
    await expect(cropModal).toBeHidden();

    // Fill speaker details
    const speakerDraft = page.locator('.border-2.border-blue-200');
    await expect(speakerDraft).toBeVisible();
    
    await speakerDraft.getByLabel('Имя спикера').fill('Иван Иванов');
    await speakerDraft.getByLabel('Должность и компания').fill('Senior QA, Яндекс');
    await speakerDraft.getByLabel('Тема доклада').fill('Автоматизация с Playwright');
    await speakerDraft.getByLabel('Описание доклада').fill('Расскажу про лучшие практики написания E2E тестов с использованием Playwright и TypeScript.');

    // Save the speaker
    await page.getByRole('button', { name: '✓ Сохранить спикера' }).click();
    
    // Verify speaker is saved and displayed in collapsed view
    // Best practice: chain text filtering on a stable semantic locator (like the speaker container)
    // rather than guessing ARIA roles for generic elements like <p>.
    await expect(page.locator('p').filter({ hasText: /^Иван Иванов$/ })).toBeVisible();
    await expect(page.locator('p').filter({ hasText: /^Автоматизация с Playwright$/ })).toBeVisible();

    // 5. Update Timing to include the newly added speaker
    // Now that "Иван Иванов" is added, we can select him in the timing
    await timingRow2.locator('select').selectOption('Иван Иванов');

    // 6. Generate HTML
    // We expect a download to happen because of the photo processing logic
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Сгенерировать HTML и скачать фото' }).click();
    
    // Wait for the file download (e.g. ivanIvanov.png)
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('ivanIvanov.png');

    // 7. Verify the Result HTML
    const htmlCodeTextarea = page.locator('textarea[readonly]');
    await expect(htmlCodeTextarea).toBeVisible();
    
    const htmlCode = await htmlCodeTextarea.inputValue();

    // Assertions on the generated HTML string
    expect(htmlCode).toContain('15 Сентября');
    expect(htmlCode).toContain('VK Cloud и Яндекс');
    expect(htmlCode).toContain('Quality Assurance Autumn Meetup');
    expect(htmlCode).toContain('Москва, Лесная 15');
    
    // Timing assertions
    expect(htmlCode).toContain('18:30 &mdash; 19:00 &mdash; Регистрация и кофе');
    expect(htmlCode).toContain('19:00 &mdash; 19:40 &mdash; Открытие митапа, Иван Иванов');
    
    // Speaker assertions
    expect(htmlCode).toContain('ivanIvanov.png');
    expect(htmlCode).toContain('<strong>Автоматизация с Playwright</strong>');
    expect(htmlCode).toContain('Расскажу про лучшие практики');
    expect(htmlCode).toContain('Иван Иванов, Senior QA, Яндекс');

    // Check that preview is rendered correctly
    const previewContainer = page.locator('.prose');
    await expect(previewContainer).toContainText('15 Сентября');
    await expect(previewContainer).toContainText('Иван Иванов');
  });
});
