import { Component, inject, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { RichTextEditor } from './rich-text-editor';

@Component({
  template: `
    <form [formGroup]="form">
      <app-rich-text-editor formControlName="description"></app-rich-text-editor>
    </form>
  `,
  imports: [ReactiveFormsModule, RichTextEditor],
})
class RichTextEditorHost {
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    description: ['', Validators.required],
  });
}

describe('RichTextEditor', () => {
  let fixture: ComponentFixture<RichTextEditorHost>;
  let host: RichTextEditorHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RichTextEditorHost],
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    }).compileComponents();

    fixture = TestBed.createComponent(RichTextEditorHost);
    host = fixture.componentInstance;
  });

  async function initEditor(): Promise<HTMLElement> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const editor = fixture.nativeElement.querySelector('.ql-editor') as HTMLElement | null;
    expect(editor).toBeTruthy();
    return editor!;
  }

  it('should create with formatting toolbar buttons', async () => {
    await initEditor();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.ql-bold')).toBeTruthy();
    expect(compiled.querySelector('.ql-italic')).toBeTruthy();
    expect(compiled.querySelector('.ql-list[value="ordered"]')).toBeTruthy();
    expect(compiled.querySelector('.ql-list[value="bullet"]')).toBeTruthy();
    expect(compiled.querySelector('.ql-link')).toBeTruthy();
  });

  it('should treat empty editor content as invalid for required validation', async () => {
    await initEditor();

    expect(host.form.controls.description.invalid).toBe(true);
    expect(host.form.controls.description.hasError('required')).toBe(true);
  });

  it('should update form value when bold toolbar action is applied', async () => {
    const editor = await initEditor();

    const boldButton = fixture.nativeElement.querySelector('.ql-bold') as HTMLButtonElement;
    boldButton.click();
    fixture.detectChanges();

    editor.focus();
    document.execCommand('insertText', false, 'Bold text');
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const value = host.form.controls.description.value;
    expect(value).toContain('Bold text');
    expect(/<(strong|b)[^>]*>Bold text<\/(strong|b)>/.test(value)).toBe(true);
    expect(host.form.controls.description.valid).toBe(true);
  });

  it('should update form value when italic toolbar action is applied', async () => {
    const editor = await initEditor();

    const italicButton = fixture.nativeElement.querySelector('.ql-italic') as HTMLButtonElement;
    italicButton.click();
    fixture.detectChanges();

    editor.focus();
    document.execCommand('insertText', false, 'Italic text');
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const value = host.form.controls.description.value;
    expect(value).toContain('Italic text');
    expect(/<(em|i)[^>]*>Italic text<\/(em|i)>/.test(value)).toBe(true);
  });

  it('should update form value when bullet list toolbar action is applied', async () => {
    const editor = await initEditor();

    const listButton = fixture.nativeElement.querySelector('.ql-list[value="bullet"]') as HTMLButtonElement;
    listButton.click();
    fixture.detectChanges();

    editor.focus();
    document.execCommand('insertText', false, 'List item');
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const value = host.form.controls.description.value;
    expect(value).toContain('List item');
    expect(value).toMatch(/<ul[\s>]/);
    expect(value).toMatch(/<li[\s>]/);
  });
});
