import type { z } from 'zod'
import type { TypedSchema, TypedSchemaError } from 'vee-validate'

/**
 * Adapts a Zod 4 schema to VeeValidate's TypedSchema (@vee-validate/zod only supports Zod 3).
 * Error messages are i18n keys: the form translates them.
 */
export function toTypedSchema<S extends z.ZodType>(schema: S): TypedSchema<z.input<S>, z.output<S>> {
  return {
    __type: 'VVTypedSchema',
    async parse(values) {
      const result = await schema.safeParseAsync(values)
      if (result.success) return { value: result.data, errors: [] }
      const byPath = new Map<string, string[]>()
      for (const issue of result.error.issues) {
        const path = issue.path.map(String).join('.')
        byPath.set(path, [...(byPath.get(path) ?? []), issue.message])
      }
      const errors: TypedSchemaError[] = [...byPath].map(([path, messages]) => ({ path, errors: messages }))
      return { errors }
    },
  }
}
