import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  forwardRef,
  inject,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import Quill from 'quill';

import { normalizeRichTextValue } from '../../core/utils/rich-text-sanitize';

@Component({
  selector: 'app-rich-text-editor',
  templateUrl: './rich-text-editor.html',
  styleUrl: './rich-text-editor.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditor),
      multi: true,
    },
  ],
})
export class RichTextEditor implements ControlValueAccessor, AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);

  @ViewChild('editorHost', { static: true })
  private readonly editorHost!: ElementRef<HTMLElement>;

  protected disabled = false;

  private quill: Quill | null = null;
  private pendingValue = '';
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.quill = new Quill(this.editorHost.nativeElement, {
      theme: 'snow',
      modules: {
        toolbar: [['bold', 'italic'], [{ list: 'ordered' }, { list: 'bullet' }], ['link']],
      },
    });

    this.quill.on('text-change', () => {
      this.emitCurrentValue();
    });

    if (this.pendingValue) {
      this.setEditorHtml(this.pendingValue);
    }
  }

  ngOnDestroy(): void {
    this.quill = null;
  }

  writeValue(value: string | null): void {
    const normalized = normalizeRichTextValue(value ?? '');

    if (this.quill) {
      this.setEditorHtml(normalized);
      return;
    }

    this.pendingValue = normalized;
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.quill?.enable(!isDisabled);
  }

  protected onBlur(): void {
    this.onTouched();
  }

  private emitCurrentValue(): void {
    const rawHtml = this.quill?.root.innerHTML ?? '';
    this.onChange(normalizeRichTextValue(rawHtml));
  }

  private setEditorHtml(html: string): void {
    if (!this.quill) {
      return;
    }

    if (!html) {
      this.quill.setText('');
      return;
    }

    this.quill.clipboard.dangerouslyPasteHTML(html, 'silent');
  }
}
