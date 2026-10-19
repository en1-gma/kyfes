import DOMPurify from 'dompurify'
import { SANITIZE_FORBID_ATTR, SANITIZE_FORBID_TAGS } from '@/shared/config/constants'

/** The only way to render user HTML: `v-html="sanitizeHtml(x)"` on the same line. */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: SANITIZE_FORBID_TAGS,
    FORBID_ATTR: SANITIZE_FORBID_ATTR,
  })
}
