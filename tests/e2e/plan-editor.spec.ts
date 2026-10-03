import { test, expect } from '@playwright/test';
import { launchApp } from './launch';

test('plan editor: create 3-step plan, error/recovery, save, share code, and import', async () => {
  const { app, close } = await launchApp();
  try {
    const page = await app.firstWindow();

    // 1. Dismiss launcher
    const launcher = page.getByTestId('launch-window');
    await expect(launcher).toBeVisible();
    await page.keyboard.press('Space');
    await expect(launcher).not.toBeVisible();

    // 2. Navigate to Library
    const navLibrary = page.getByTestId('nav-library');
    await expect(navLibrary).toBeVisible();
    await navLibrary.click();

    const libraryView = page.getByTestId('view-library');
    await expect(libraryView).toBeVisible();

    // 3. Open Plan Editor
    const createBtn = page.getByTestId('btn-create-plan');
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    const editorView = page.getByTestId('view-plan-editor');
    await expect(editorView).toBeVisible();

    // 4. Set Plan Title
    const titleInput = page.getByTestId('input-plan-title');
    await expect(titleInput).toBeVisible();
    await titleInput.fill('E2E Rush Plan');

    // 5. Add Step 1: Solar Generator (armsolar)
    const addStepBtn = page.getByTestId('btn-add-step');
    await addStepBtn.click();

    const pickerModal = page.getByTestId('unit-picker-modal');
    await expect(pickerModal).toBeVisible();

    const searchInput = page.getByTestId('input-picker-search');
    await searchInput.fill('armsolar');
    const armsolarOption = page.getByTestId('picker-unit-armsolar');
    await expect(armsolarOption).toBeVisible();
    await armsolarOption.click();
    await expect(pickerModal).not.toBeVisible();

    const step0 = page.getByTestId('editor-step-row-0');
    await expect(step0).toBeVisible();
    await expect(step0).toContainText('Solar Collector');

    // 6. Add Step 2: Bot Lab (armlab)
    await addStepBtn.click();
    await expect(pickerModal).toBeVisible();
    await searchInput.fill('armlab');
    const armlabOption = page.getByTestId('picker-unit-armlab');
    await expect(armlabOption).toBeVisible();
    await armlabOption.click();
    await expect(pickerModal).not.toBeVisible();

    const step1 = page.getByTestId('editor-step-row-1');
    await expect(step1).toBeVisible();
    await expect(step1).toContainText('Bot Lab');

    // 7. Add Step 3: Pawn (armpw)
    await addStepBtn.click();
    await expect(pickerModal).toBeVisible();
    await searchInput.fill('armpw');
    const armpwOption = page.getByTestId('picker-unit-armpw');
    await expect(armpwOption).toBeVisible();
    await armpwOption.click();
    await expect(pickerModal).not.toBeVisible();

    const step2 = page.getByTestId('editor-step-row-2');
    await expect(step2).toBeVisible();
    await expect(step2).toContainText('Pawn');

    // Plan should currently be valid
    await expect(page.getByTestId('editor-validation-valid')).toBeVisible();
    const saveBtn = page.getByTestId('btn-save-plan');
    await expect(saveBtn).not.toBeDisabled();

    // 8. Reorder step 2 up so Pawn is ordered before Bot Lab is built
    // This triggers actor-not-available validation error
    const moveUpStep2 = page.getByTestId('btn-move-up-2');
    await moveUpStep2.click();

    // Now step 1 is Pawn and step 2 is Bot Lab
    await expect(page.getByTestId('editor-validation-errors')).toBeVisible();
    await expect(saveBtn).toBeDisabled();

    // Move Pawn back down after Bot Lab
    const moveDownStep1 = page.getByTestId('btn-move-down-1');
    await moveDownStep1.click();

    // Errors disappear and save becomes active
    await expect(page.getByTestId('editor-validation-valid')).toBeVisible();
    await expect(saveBtn).not.toBeDisabled();

    // 9. Save Plan -> navigates to plan detail
    await saveBtn.click();

    const planDetail = page.getByTestId('view-plan-detail');
    await expect(planDetail).toBeVisible();
    await expect(planDetail).toContainText('E2E Rush Plan');

    // Verify 3 steps in timeline
    await expect(page.getByTestId('timeline-step-0')).toContainText('[CDR]');
    await expect(page.getByTestId('timeline-step-0')).toContainText('Solar');
    await expect(page.getByTestId('timeline-step-1')).toContainText('[CDR]');
    await expect(page.getByTestId('timeline-step-1')).toContainText('Bot Lab');
    await expect(page.getByTestId('timeline-step-2')).toContainText('[FAC]');
    await expect(page.getByTestId('timeline-step-2')).toContainText('Pawn');

    // 10. Open Share Dialog and retrieve share code
    const shareBtn = page.getByTestId('btn-share-plan');
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    const shareDialog = page.getByTestId('dialog-share-plan');
    await expect(shareDialog).toBeVisible();

    const shareCodeArea = page.getByTestId('textarea-share-code');
    const shareCode = await shareCodeArea.inputValue();
    expect(shareCode).toMatch(/^BSC1\./);

    const closeShareBtn = page.getByTestId('btn-close-share-dialog');
    await closeShareBtn.click();
    await expect(shareDialog).not.toBeVisible();

    // 11. Return to Library and Import using share code
    const backToLibraryBtn = page.getByTestId('btn-back-to-library');
    await backToLibraryBtn.click();
    await expect(libraryView).toBeVisible();

    const importBtn = page.getByTestId('btn-import-plan');
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    const importDialog = page.getByTestId('dialog-import-plan');
    await expect(importDialog).toBeVisible();

    const importInput = page.getByTestId('input-import-code');
    await importInput.fill(shareCode);

    const submitImportBtn = page.getByTestId('btn-submit-import');
    await submitImportBtn.click();
    await expect(importDialog).not.toBeVisible();

    // 12. Verify imported plan opens in detail view with identical steps
    await expect(planDetail).toBeVisible();
    await expect(page.getByTestId('timeline-step-0')).toContainText('[CDR]');
    await expect(page.getByTestId('timeline-step-0')).toContainText('Solar');
    await expect(page.getByTestId('timeline-step-1')).toContainText('[CDR]');
    await expect(page.getByTestId('timeline-step-1')).toContainText('Bot Lab');
    await expect(page.getByTestId('timeline-step-2')).toContainText('[FAC]');
    await expect(page.getByTestId('timeline-step-2')).toContainText('Pawn');
  } finally {
    await close();
  }
});
